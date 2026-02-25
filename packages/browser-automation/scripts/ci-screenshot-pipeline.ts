#!/usr/bin/env tsx
/**
 * CI Screenshot Pipeline
 *
 * Runs after Playwright visual regression tests in CI.
 * For each cell in the draw.io manifest:
 *   1. Finds the matching baseline in test-baselines/
 *   2. Finds the matching actual screenshot from this run (temp/screenshots/visual-test/)
 *   3. Runs pixelmatch to determine pass/fail and generate a diff image
 *   4. Uploads baseline, actual, and (on failure) diff to S3 under a run-scoped prefix
 *   5. Injects the baseline S3 URL + pass/fail border into the draw.io template
 *   6. Uploads the updated draw.io file to S3
 *   7. Writes an enriched runs-index.json entry so the visual dashboard can show
 *      side-by-side baseline vs actual with RED/GREEN result frames
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
 *   AWS credentials       — injected by aws-actions/configure-aws-credentials@v4 via
 *                           OIDC; no static keys are used or required
 *
 * Optional:
 *   GITHUB_RUN_NUMBER     — used to build the S3 key prefix
 *   GITHUB_REPOSITORY     — used to namespace the S3 prefix
 *   DRAWIO_TEMPLATE       — path to the draw.io template (default: templates/drawio/cvBuilder.drawio.xml)
 *   SCREENSHOT_MANIFEST   — path to the manifest JSON (default: templates/drawio/screenshot-manifest.json)
 *   BASELINES_DIR         — directory containing baseline PNGs (default: test-baselines/cv-builder-visual)
 *   ACTUAL_DIR            — directory containing this run's actual screenshots
 *                           (default: ../../temp/screenshots/visual-test, resolved from package root)
 *                           In CI: Docker volume maps ./temp/screenshots → /app/temp/screenshots, and
 *                           SCREENSHOTS_DIR=/app/temp/screenshots so screenshots land in visual-test subdir.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
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
// Actual screenshots from this test run.
// Docker volume maps ./temp/screenshots (repo root) → /app/temp/screenshots,
// and the test runner writes to /app/temp/screenshots/visual-test/ when
// SCREENSHOTS_DIR=/app/temp/screenshots is set.
const ACTUAL_DIR = path.resolve(
  packageRoot,
  process.env.ACTUAL_DIR || '../../temp/screenshots/visual-test'
);

// Visual comparison threshold — matches VISUAL_THRESHOLDS.STANDARD in the test suite
const DIFF_THRESHOLD = 0.1;

// ── Types ──────────────────────────────────────────────────────────────────

interface ScreenshotEntry {
  name: string;
  /** Baseline S3 URL — backward-compatible primary URL used by the draw.io injector */
  url: string;
  baselineUrl: string;
  actualUrl?: string;
  /** Only present when the comparison failed */
  diffUrl?: string;
  /** Undefined when no actual screenshot was captured this run */
  passed?: boolean;
  /** 0–100; undefined when no actual screenshot was captured */
  diffPercent?: number;
}

interface RunEntry {
  runNumber: number;
  timestamp: string;
  drawioUrl: string | null;
  screenshots: ScreenshotEntry[];
}

interface RunsIndex {
  runs: RunEntry[];
  lastUpdated: string;
}

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

// ── Image comparison helper ────────────────────────────────────────────────

/**
 * Compare two PNG files with pixelmatch.
 * Returns pass/fail, diff percentage, and a diff PNG buffer (only on failure).
 */
async function compareImages(
  baselinePath: string,
  actualPath: string
): Promise<{ passed: boolean; diffPercent: number; diffBuffer: Buffer | null }> {
  const readPng = (p: string): Promise<PNG> =>
    new Promise((resolve, reject) => {
      const stream = fs.createReadStream(p).pipe(new PNG());
      stream.on('parsed', () => resolve(stream));
      stream.on('error', reject);
    });

  const [baseline, actual] = await Promise.all([readPng(baselinePath), readPng(actualPath)]);

  // If dimensions differ, treat as failed without a pixel-level diff
  if (baseline.width !== actual.width || baseline.height !== actual.height) {
    return { passed: false, diffPercent: 100, diffBuffer: null };
  }

  const totalPixels = baseline.width * baseline.height;
  const diffPng = new PNG({ width: baseline.width, height: baseline.height });

  const diffCount = pixelmatch(
    baseline.data,
    actual.data,
    diffPng.data,
    baseline.width,
    baseline.height,
    { threshold: DIFF_THRESHOLD, diffColor: [255, 0, 0], alpha: 0.1 }
  );

  const diffPercent = (diffCount / totalPixels) * 100;
  const passed = diffPercent <= DIFF_THRESHOLD * 100;

  if (!passed) {
    const diffBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      diffPng
        .pack()
        .on('data', (chunk: Buffer) => chunks.push(chunk))
        .on('end', () => resolve(Buffer.concat(chunks)))
        .on('error', reject);
    });
    return { passed, diffPercent, diffBuffer };
  }

  return { passed, diffPercent, diffBuffer: null };
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
  console.log(`Manifest:    ${manifest.cells.length} cells`);
  console.log(`Baselines:   ${BASELINES_DIR}`);
  console.log(`Actuals:     ${ACTUAL_DIR}\n`);

  // 2. S3 config
  const s3Config = s3ConfigFromEnv();
  const uploader = new S3Uploader(s3Config);
  console.log(`S3 bucket:   ${s3Config.bucket}`);
  console.log(`S3 region:   ${s3Config.region}`);
  console.log(`S3 prefix:   ${s3Config.prefix}\n`);

  // 3. Process each cell: find baseline + actual, compare, upload all assets.
  //    Categorise synchronously (fs.existsSync is fast), then upload in parallel.
  console.log('─── Processing screenshots ─────────────────────────────');
  const skipped: string[] = [];

  interface CellWork {
    cell: ManifestCell;
    baselinePath: string;
    actualPath: string | null;
  }
  const work: CellWork[] = [];

  for (const cell of manifest.cells) {
    const baselinePath = path.join(BASELINES_DIR, `${cell.screenshotBaseline}.png`);
    if (!fs.existsSync(baselinePath)) {
      console.log(`  ⏭  ${cell.screenshotBaseline} — no baseline, skipping`);
      skipped.push(cell.screenshotBaseline);
      continue;
    }
    const actualPath = path.join(ACTUAL_DIR, `${cell.screenshotBaseline}.png`);
    work.push({ cell, baselinePath, actualPath: fs.existsSync(actualPath) ? actualPath : null });
  }

  interface ProcessedCell {
    cell: ManifestCell;
    baselineUpload: UploadResult;
    actualUpload: UploadResult | null;
    diffUpload: UploadResult | null;
    passed: boolean | undefined;
    diffPercent: number | undefined;
  }

  const processed: ProcessedCell[] = await Promise.all(
    work.map(async ({ cell, baselinePath, actualPath }) => {
      const name = cell.screenshotBaseline;

      // Upload baseline (same key as before for backward compat)
      const baselineKey = `${s3Config.prefix}/${name}.png`;
      const baselineUrl = await uploader.uploadFile(baselinePath, baselineKey);

      let actualUpload: UploadResult | null = null;
      let diffUpload: UploadResult | null = null;
      let passed: boolean | undefined;
      let diffPercent: number | undefined;

      if (actualPath) {
        // Compare baseline vs actual
        const comparison = await compareImages(baselinePath, actualPath);
        passed = comparison.passed;
        diffPercent = comparison.diffPercent;

        // Upload actual
        const actualKey = `${s3Config.prefix}/${name}-actual.png`;
        const actualUrl = await uploader.uploadFile(actualPath, actualKey);
        actualUpload = { filename: `${name}-actual.png`, s3Key: actualKey, url: actualUrl };

        // Upload diff if the comparison failed
        if (!passed && comparison.diffBuffer) {
          const diffKey = `${s3Config.prefix}/${name}-diff.png`;
          const diffUrl = await uploader.uploadBuffer(comparison.diffBuffer, diffKey, 'image/png');
          diffUpload = { filename: `${name}-diff.png`, s3Key: diffKey, url: diffUrl };
        }

        const statusIcon = passed ? '✅' : '❌';
        console.log(
          `  ${statusIcon}  ${name} (${comparison.diffPercent.toFixed(2)}% diff)\n` +
          `       baseline → ${baselineUrl}\n` +
          `       actual   → ${actualUrl}`
        );
        if (diffUpload) console.log(`       diff     → ${diffUpload.url}`);
      } else {
        console.log(`  ⏭  ${name} — no actual screenshot, uploading baseline only\n     → ${baselineUrl}`);
      }

      return {
        cell,
        baselineUpload: { filename: `${name}.png`, s3Key: baselineKey, url: baselineUrl },
        actualUpload,
        diffUpload,
        passed,
        diffPercent,
      };
    })
  );

  const uploaded = processed.map((r) => r.baselineUpload);
  const cellMappings: CellUrlMapping[] = processed.map((r) => ({
    objectId: r.cell.objectId,
    url: r.baselineUpload.url,
    passed: r.passed,
  }));

  const passCount = processed.filter((r) => r.passed === true).length;
  const failCount = processed.filter((r) => r.passed === false).length;
  const noActual = processed.filter((r) => r.passed === undefined).length;
  console.log(`\nUploaded ${uploaded.length}/${manifest.cells.length} baselines`);
  console.log(`Results: ${passCount} ✅ passed, ${failCount} ❌ failed, ${noActual} ⏭ no actual`);
  if (skipped.length > 0) console.log(`Skipped (no baseline):`, skipped);

  if (cellMappings.length === 0) {
    console.log('\n⚠  No screenshots to inject — nothing to commit.');
    writeSummary({ uploaded, injected: 0, skipped, drawioS3Key: null, drawioS3Url: null });
    return;
  }

  // 4. Inject S3 URLs + pass/fail borders into draw.io template
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

  // 6. Update the runs-index.json in S3 so the visual dashboard can discover this run
  console.log('\n─── Updating runs index ────────────────────────────────');
  const namespace = s3Config.prefix.replace(/\/run-[^/]+$/, '');
  const indexKey = `${namespace}/runs-index.json`;
  const indexUrl = uploader.publicUrl(indexKey);

  let existingRuns: RunEntry[] = [];
  try {
    const res = await fetch(indexUrl);
    if (res.ok) {
      const data: RunsIndex = await res.json();
      existingRuns = data.runs ?? [];
    }
  } catch {
    // First run or network error — start fresh
  }

  const screenshotEntries: ScreenshotEntry[] = processed.map((r) => ({
    name: r.cell.screenshotBaseline,
    url: r.baselineUpload.url,        // backward compat
    baselineUrl: r.baselineUpload.url,
    ...(r.actualUpload ? { actualUrl: r.actualUpload.url } : {}),
    ...(r.diffUpload   ? { diffUrl: r.diffUpload.url }     : {}),
    ...(r.passed !== undefined ? { passed: r.passed }               : {}),
    ...(r.diffPercent !== undefined ? { diffPercent: r.diffPercent } : {}),
  }));

  const newEntry: RunEntry = {
    runNumber: parseInt(process.env.GITHUB_RUN_NUMBER ?? '0', 10),
    timestamp: new Date().toISOString(),
    drawioUrl,
    screenshots: screenshotEntries,
  };

  // Prepend new entry; keep at most 20 historical runs
  const updatedRuns = [newEntry, ...existingRuns].slice(0, 20);
  const indexBuffer = Buffer.from(
    JSON.stringify({ runs: updatedRuns, lastUpdated: new Date().toISOString() }, null, 2)
  );
  const publishedIndexUrl = await uploader.uploadBuffer(indexBuffer, indexKey, 'application/json');
  console.log(`  ✓  runs-index.json → ${publishedIndexUrl}`);

  // 7. Write a JSON summary for downstream CI steps
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
  console.log(`  Baselines uploaded: ${uploaded.length}`);
  console.log(`  Draw.io cells updated: ${injected} (${passCount} green, ${failCount} red)`);
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
