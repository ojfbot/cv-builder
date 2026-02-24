#!/usr/bin/env tsx
/**
 * CI Screenshot Pipeline
 *
 * Runs after Playwright visual regression tests in CI.
 * For each cell in the draw.io manifest:
 *   1. Finds the matching screenshot in the baselines directory
 *   2. Uploads it to S3 under a run-scoped prefix
 *   3. Injects the S3 URL into the draw.io template (replacing base64 or stale URL)
 *   4. Uploads the updated draw.io file to S3
 *
 * The updated draw.io is also written back to the template path so CI can
 * commit it to the repository (keeping the repo copy in sync with the latest run).
 *
 * Usage (in CI):
 *   pnpm --filter @cv-builder/browser-automation pipeline:screenshots
 *
 * Required env vars:
 *   S3_BUCKET             — bucket name
 *   AWS_REGION            — defaults to us-east-1
 *   AWS_ACCESS_KEY_ID     — picked up automatically by AWS SDK
 *   AWS_SECRET_ACCESS_KEY — picked up automatically by AWS SDK
 *
 * Optional:
 *   GITHUB_RUN_NUMBER     — used to build the S3 key prefix
 *   GITHUB_REPOSITORY     — used to namespace the S3 prefix
 *   DRAWIO_TEMPLATE       — path to the draw.io template (default: templates/drawio/cvBuilder.drawio.xml)
 *   SCREENSHOT_MANIFEST   — path to the manifest JSON (default: templates/drawio/screenshot-manifest.json)
 *   BASELINES_DIR         — directory containing baseline PNGs (default: test-baselines/cv-builder-visual)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Uploader, s3ConfigFromEnv, type UploadResult } from '../src/storage/s3-uploader.js';
import { DrawioUrlInjector, type CellUrlMapping } from '../src/drawio/url-injector.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');

// ── Paths ──────────────────────────────────────────────────────────────────

const DRAWIO_TEMPLATE = path.resolve(
  packageRoot,
  process.env.DRAWIO_TEMPLATE || 'templates/drawio/cvBuilder.drawio.xml'
);
const SCREENSHOT_MANIFEST = path.resolve(
  packageRoot,
  process.env.SCREENSHOT_MANIFEST || 'templates/drawio/screenshot-manifest.json'
);
const BASELINES_DIR = path.resolve(
  packageRoot,
  process.env.BASELINES_DIR || 'test-baselines/cv-builder-visual'
);

// ── Types ──────────────────────────────────────────────────────────────────

interface ManifestCell {
  objectId: string;
  screenshotBaseline: string;
  description: string;
  testStep: string;
  uiState: Record<string, string>;
}

interface Manifest {
  version: string;
  screenshotDir: string;
  cells: ManifestCell[];
}

interface PipelineResult {
  uploaded: UploadResult[];
  injected: number;
  skipped: string[];
  drawioS3Key: string | null;
  drawioS3Url: string | null;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  CV Builder Screenshot Pipeline');
  console.log('═══════════════════════════════════════════════════════\n');

  // 1. Validate inputs
  if (!fs.existsSync(DRAWIO_TEMPLATE)) {
    throw new Error(`Draw.io template not found: ${DRAWIO_TEMPLATE}`);
  }
  if (!fs.existsSync(SCREENSHOT_MANIFEST)) {
    throw new Error(`Screenshot manifest not found: ${SCREENSHOT_MANIFEST}`);
  }

  const manifest: Manifest = JSON.parse(fs.readFileSync(SCREENSHOT_MANIFEST, 'utf-8'));
  console.log(`Manifest: ${manifest.cells.length} cells\n`);

  // 2. S3 config
  const s3Config = s3ConfigFromEnv();
  const uploader = new S3Uploader(s3Config);
  console.log(`S3 bucket:  ${s3Config.bucket}`);
  console.log(`S3 region:  ${s3Config.region}`);
  console.log(`S3 prefix:  ${s3Config.prefix}\n`);

  // 3. Upload screenshots that have a matching baseline file
  const skipped: string[] = [];
  const cellMappings: CellUrlMapping[] = [];
  const uploaded: UploadResult[] = [];

  console.log('─── Uploading screenshots ──────────────────────────────');
  for (const cell of manifest.cells) {
    const pngName = `${cell.screenshotBaseline}.png`;
    const pngPath = path.join(BASELINES_DIR, pngName);

    if (!fs.existsSync(pngPath)) {
      console.log(`  ⏭  ${cell.screenshotBaseline} — no baseline, skipping`);
      skipped.push(cell.screenshotBaseline);
      continue;
    }

    const s3Key = `${s3Config.prefix}/${pngName}`;
    const url = await uploader.uploadFile(pngPath, s3Key);
    uploaded.push({ filename: pngName, s3Key, url });
    cellMappings.push({ objectId: cell.objectId, url });
    console.log(`  ✓  ${cell.screenshotBaseline}`);
    console.log(`     → ${url}`);
  }

  console.log(`\nUploaded ${uploaded.length}/${manifest.cells.length} screenshots`);
  if (skipped.length > 0) {
    console.log(`Skipped (no baseline):`, skipped);
  }

  if (cellMappings.length === 0) {
    console.log('\n⚠  No screenshots to inject — nothing to commit.');
    writeSummary({ uploaded, injected: 0, skipped, drawioS3Key: null, drawioS3Url: null });
    return;
  }

  // 4. Inject S3 URLs into draw.io template
  console.log('\n─── Injecting URLs into draw.io ────────────────────────');
  const injector = new DrawioUrlInjector();
  const injectionResults = injector.injectFromFile(
    DRAWIO_TEMPLATE,
    cellMappings,
    DRAWIO_TEMPLATE  // overwrite in-place — CI will commit the updated file
  );
  const injected = injectionResults.filter((r) => r.success).length;

  // 5. Upload the updated draw.io file to S3
  console.log('\n─── Uploading draw.io to S3 ────────────────────────────');
  const drawioKey = `${s3Config.prefix}/cvBuilder.drawio.xml`;
  const drawioUrl = await uploader.uploadFile(DRAWIO_TEMPLATE, drawioKey);
  console.log(`  ✓  cvBuilder.drawio.xml → ${drawioUrl}`);

  // 6. Write a JSON summary for downstream CI steps
  const result: PipelineResult = {
    uploaded,
    injected,
    skipped,
    drawioS3Key: drawioKey,
    drawioS3Url: drawioUrl,
  };
  writeSummary(result);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Pipeline complete');
  console.log(`  Screenshots uploaded: ${uploaded.length}`);
  console.log(`  Draw.io cells updated: ${injected}`);
  console.log(`  Draw.io S3 URL: ${drawioUrl}`);
  console.log('═══════════════════════════════════════════════════════\n');
}

function writeSummary(result: PipelineResult): void {
  const summaryPath = path.resolve(packageRoot, 'temp/pipeline-result.json');
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, JSON.stringify(result, null, 2));
  console.log(`\nSummary written to: ${summaryPath}`);
}

// ── Entry point ────────────────────────────────────────────────────────────

run().catch((err) => {
  console.error('\n❌ Pipeline failed:', err.message);
  process.exit(1);
});
