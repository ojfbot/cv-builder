/**
 * Baseline Screenshot Manager
 *
 * Manages baseline screenshots for visual regression testing.
 * Baselines are stored in git-tracked directory for version control.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find project root
function findProjectRoot(): string {
  let currentDir = __dirname;
  while (currentDir !== path.parse(currentDir).root) {
    try {
      const packageJsonPath = path.join(currentDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        if (pkg.name === '@cv-builder/browser-automation') {
          return path.resolve(currentDir, '../..');
        }
      }
    } catch {}
    currentDir = path.dirname(currentDir);
  }
  return path.resolve(__dirname, '../../..');
}

const PROJECT_ROOT = findProjectRoot();
const BASELINES_DIR = path.join(
  PROJECT_ROOT,
  'packages/browser-automation/test-baselines'
);

export interface BaselineMetadata {
  /**
   * Unique identifier for this baseline
   */
  id: string;

  /**
   * Test name or suite
   */
  testName: string;

  /**
   * Screenshot name
   */
  name: string;

  /**
   * Viewport preset (desktop, mobile, tablet, etc.)
   */
  viewport?: string;

  /**
   * When this baseline was created
   */
  createdAt: string;

  /**
   * Last updated timestamp
   */
  updatedAt: string;

  /**
   * Git commit hash when created/updated
   */
  gitCommit?: string;

  /**
   * Image dimensions
   */
  dimensions: {
    width: number;
    height: number;
  };

  /**
   * File size in bytes
   */
  fileSize: number;

  /**
   * Platform (darwin, linux, win32) for platform-specific baselines
   */
  platform?: string;
}

export interface BaselineIndex {
  /**
   * Index version for migrations
   */
  version: string;

  /**
   * Last updated
   */
  updatedAt: string;

  /**
   * Baselines by test suite
   */
  baselines: Record<string, BaselineMetadata>;
}

export class BaselineManager {
  private baselinesDir: string;
  private indexPath: string;
  private initPromise: Promise<void> | null = null;

  constructor(baselinesDir: string = BASELINES_DIR) {
    this.baselinesDir = baselinesDir;
    this.indexPath = path.join(baselinesDir, 'index.json');
  }

  /**
   * Initialize baselines directory and index
   *
   * Uses promise caching to prevent race conditions when multiple
   * tests call initialize() concurrently.
   */
  async initialize(): Promise<void> {
    // Return existing initialization if already in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    // Cache the promise to prevent concurrent initializations
    this.initPromise = this._initialize();
    return this.initPromise;
  }

  /**
   * Internal initialization logic
   */
  private async _initialize(): Promise<void> {
    // Create baselines directory
    if (!fs.existsSync(this.baselinesDir)) {
      fs.mkdirSync(this.baselinesDir, { recursive: true });
      console.log(`Created baselines directory: ${this.baselinesDir}`);
    }

    // Create index if doesn't exist
    if (!fs.existsSync(this.indexPath)) {
      const index: BaselineIndex = {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        baselines: {},
      };
      this.saveIndex(index);
      console.log(`Created baseline index: ${this.indexPath}`);
    }

    // Create .gitignore to prevent accidental gitignore of baselines
    const gitignorePath = path.join(this.baselinesDir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(
        gitignorePath,
        '# Baseline screenshots are tracked in git\n# Only ignore diffs and temp files\n*.diff.png\n*.tmp.png\n.DS_Store\n'
      );
    }

    // Create README
    const readmePath = path.join(this.baselinesDir, 'README.md');
    if (!fs.existsSync(readmePath)) {
      fs.writeFileSync(
        readmePath,
        `# Visual Regression Test Baselines

This directory contains baseline screenshots for visual regression testing.

## Structure

- \`index.json\` - Metadata index for all baselines
- \`{test-suite}/\` - Directories organized by test suite
  - \`{screenshot-name}.png\` - Baseline screenshots

## Usage

Baselines are **version controlled** in git. When UI changes are intentional:

1. Review the diff images in test reports
2. If changes are correct, update baselines:
   \`\`\`bash
   pnpm test:visual:update
   \`\`\`
3. Commit the updated baselines with your PR

## CI/CD

In CI, tests compare current screenshots against these baselines.
Failures indicate unintended visual changes that need investigation.

## Platform-Specific Baselines

Some rendering differences exist across platforms (fonts, anti-aliasing).
Platform-specific baselines are stored as:
- \`{name}.darwin.png\` - macOS
- \`{name}.linux.png\` - Linux (used in CI)
- \`{name}.win32.png\` - Windows

The test framework automatically selects the correct baseline for the platform.
`
      );
    }
  }

  /**
   * Get baseline path for a screenshot
   */
  getBaselinePath(testSuite: string, screenshotName: string, usePlatform = true): string {
    const suiteDir = path.join(this.baselinesDir, this.sanitizePath(testSuite));

    if (usePlatform && process.platform !== 'linux') {
      // Check for platform-specific baseline first
      const platformName = `${screenshotName}.${process.platform}.png`;
      const platformPath = path.join(suiteDir, platformName);
      if (fs.existsSync(platformPath)) {
        return platformPath;
      }
    }

    // Fall back to generic baseline
    return path.join(suiteDir, `${screenshotName}.png`);
  }

  /**
   * Save a screenshot as baseline
   */
  async saveBaseline(
    testSuite: string,
    screenshotName: string,
    sourcePath: string,
    metadata: Partial<BaselineMetadata> = {}
  ): Promise<string> {
    await this.initialize();

    const suiteDir = path.join(this.baselinesDir, this.sanitizePath(testSuite));
    if (!fs.existsSync(suiteDir)) {
      fs.mkdirSync(suiteDir, { recursive: true });
    }

    const baselinePath = path.join(suiteDir, `${screenshotName}.png`);

    // Copy screenshot to baseline
    fs.copyFileSync(sourcePath, baselinePath);

    // Get image metadata
    const stats = fs.statSync(baselinePath);
    const PNG = await import('pngjs').then((m) => m.PNG);
    const imageData = PNG.sync.read(fs.readFileSync(baselinePath));

    // Update index
    const index = this.loadIndex();
    const id = `${testSuite}/${screenshotName}`;

    index.baselines[id] = {
      id,
      testName: testSuite,
      name: screenshotName,
      createdAt: index.baselines[id]?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dimensions: {
        width: imageData.width,
        height: imageData.height,
      },
      fileSize: stats.size,
      platform: process.platform,
      ...metadata,
    };

    this.saveIndex(index);

    console.log(`Baseline saved: ${baselinePath}`);
    return baselinePath;
  }

  /**
   * Check if baseline exists
   */
  hasBaseline(testSuite: string, screenshotName: string): boolean {
    const baselinePath = this.getBaselinePath(testSuite, screenshotName);
    return fs.existsSync(baselinePath);
  }

  /**
   * Get baseline metadata
   */
  getBaselineMetadata(testSuite: string, screenshotName: string): BaselineMetadata | null {
    const index = this.loadIndex();
    const id = `${testSuite}/${screenshotName}`;
    return index.baselines[id] || null;
  }

  /**
   * List all baselines for a test suite
   */
  listBaselines(testSuite?: string): BaselineMetadata[] {
    const index = this.loadIndex();

    if (testSuite) {
      return Object.values(index.baselines).filter((b) => b.testName === testSuite);
    }

    return Object.values(index.baselines);
  }

  /**
   * Delete a baseline
   */
  async deleteBaseline(testSuite: string, screenshotName: string): Promise<void> {
    const baselinePath = this.getBaselinePath(testSuite, screenshotName, false);

    if (fs.existsSync(baselinePath)) {
      fs.unlinkSync(baselinePath);
    }

    // Remove from index
    const index = this.loadIndex();
    const id = `${testSuite}/${screenshotName}`;
    delete index.baselines[id];
    this.saveIndex(index);

    console.log(`Baseline deleted: ${baselinePath}`);
  }

  /**
   * Get diff output path for a comparison
   */
  getDiffPath(testSuite: string, screenshotName: string): string {
    const suiteDir = path.join(this.baselinesDir, this.sanitizePath(testSuite), 'diffs');
    if (!fs.existsSync(suiteDir)) {
      fs.mkdirSync(suiteDir, { recursive: true });
    }
    return path.join(suiteDir, `${screenshotName}.diff.png`);
  }

  /**
   * Load baseline index
   */
  private loadIndex(): BaselineIndex {
    if (!fs.existsSync(this.indexPath)) {
      return {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        baselines: {},
      };
    }

    return JSON.parse(fs.readFileSync(this.indexPath, 'utf-8'));
  }

  /**
   * Save baseline index
   */
  private saveIndex(index: BaselineIndex): void {
    index.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 2));
  }

  /**
   * Sanitize path component
   */
  private sanitizePath(name: string): string {
    return name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
  }
}

/**
 * Get the default baseline manager instance
 */
export function getBaselineManager(): BaselineManager {
  return new BaselineManager();
}
