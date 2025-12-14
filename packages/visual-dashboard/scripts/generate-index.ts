/**
 * Generate index.json from test manifests
 *
 * Scans the browser-automation output directory for test manifests
 * and generates an index.json file for the dashboard to consume.
 *
 * Usage: pnpm generate-index
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestManifest {
  diagramSource: string;
  timestamp?: string; // Old format
  generatedAt?: string; // New format
  gitCommit?: string;
  gitBranch?: string;
  totalSteps: number;
  screenshotsCaptured: number;
  passed: boolean;
  duration: number;
  summary: {
    totalPassed: number;
    totalFailed: number;
  };
}

interface TestRun {
  id: string;
  timestamp: string;
  commit: string;
  branch: string;
  pr?: number;
  passed: boolean;
  totalSteps: number;
  failedSteps: number;
  diagrams: string[];
  manifestPath: string;
}

interface TestIndex {
  runs: TestRun[];
  lastUpdated: string;
}

async function generateIndex() {
  console.log('📦 Generating dashboard index...\n');

  // Paths
  const rootDir = path.resolve(__dirname, '../../..');
  const sourceDir = path.join(rootDir, 'packages/browser-automation/temp');
  const targetDir = path.join(__dirname, '../public/data');
  const indexPath = path.join(targetDir, 'index.json');

  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Find all manifest.json files
  const runs: TestRun[] = [];
  let manifestCount = 0;

  if (!fs.existsSync(sourceDir)) {
    console.log(`⚠️  Source directory not found: ${sourceDir}`);
    console.log('   Creating empty index...');
  } else {
    console.log(`📁 Scanning: ${sourceDir}\n`);

    const scanDirectory = (dir: string, relativePath = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          scanDirectory(fullPath, relPath);
        } else if (entry.name === 'manifest.json') {
          try {
            const manifest: TestManifest = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
            manifestCount++;

            // Support both old (timestamp) and new (generatedAt) field names
            const timestampStr = manifest.timestamp || manifest.generatedAt;
            if (!timestampStr) {
              console.error(`❌ Skipping ${relPath}: missing timestamp/generatedAt field`);
              return;
            }

            // Extract PR number from branch name (e.g., "pr-123" -> 123)
            const prMatch = manifest.gitBranch?.match(/pr-(\d+)/i);
            const pr = prMatch ? parseInt(prMatch[1], 10) : undefined;

            // Generate unique ID
            const timestamp = new Date(timestampStr).getTime();
            const commitShort = manifest.gitCommit?.substring(0, 7) || 'unknown';
            const id = `${timestamp}-${commitShort}`;

            const run: TestRun = {
              id,
              timestamp: timestampStr,
              commit: manifest.gitCommit || 'unknown',
              branch: manifest.gitBranch || 'unknown',
              pr,
              passed: manifest.passed,
              totalSteps: manifest.totalSteps,
              failedSteps: manifest.summary.totalFailed,
              diagrams: [manifest.diagramSource],
              manifestPath: `manifests/${relPath}`,
            };

            runs.push(run);

            console.log(`✅ ${run.branch} (${run.commit.substring(0, 7)}) - ${run.passed ? 'PASSED' : 'FAILED'}`);
          } catch (error) {
            console.error(`❌ Failed to parse ${relPath}:`, error);
          }
        }
      }
    };

    scanDirectory(sourceDir);
  }

  // Sort runs by timestamp (newest first)
  runs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Generate index
  const index: TestIndex = {
    runs,
    lastUpdated: new Date().toISOString(),
  };

  // Write index.json
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

  console.log(`\n📊 Summary:`);
  console.log(`   Manifests found: ${manifestCount}`);
  console.log(`   Test runs: ${runs.length}`);
  console.log(`   Passed: ${runs.filter((r) => r.passed).length}`);
  console.log(`   Failed: ${runs.filter((r) => !r.passed).length}`);
  console.log(`\n✅ Index generated: ${indexPath}`);
}

generateIndex().catch((error) => {
  console.error('\n❌ Failed to generate index:', error);
  process.exit(1);
});
