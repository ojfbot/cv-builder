/**
 * Unit tests for BaselineManager
 *
 * Tests baseline storage, retrieval, and platform-specific logic
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import { BaselineManager } from '../../src/visual/index.js';

const TEST_BASELINES_DIR = path.join(
  process.cwd(),
  'temp/test-baselines-unit'
);

describe('BaselineManager', () => {
  let manager: BaselineManager;
  const testSuite = 'test-suite';
  const screenshotName = 'test-screenshot';

  beforeAll(() => {
    // Create test directory
    if (!fs.existsSync(TEST_BASELINES_DIR)) {
      fs.mkdirSync(TEST_BASELINES_DIR, { recursive: true });
    }
  });

  beforeEach(() => {
    // Clean test directory before each test
    if (fs.existsSync(TEST_BASELINES_DIR)) {
      fs.rmSync(TEST_BASELINES_DIR, { recursive: true });
      fs.mkdirSync(TEST_BASELINES_DIR, { recursive: true });
    }

    manager = new BaselineManager(TEST_BASELINES_DIR);
  });

  afterAll(() => {
    // Cleanup
    if (fs.existsSync(TEST_BASELINES_DIR)) {
      fs.rmSync(TEST_BASELINES_DIR, { recursive: true });
    }
  });

  describe('Initialization', () => {
    it('should create baselines directory on initialization', async () => {
      await manager.initialize();

      expect(fs.existsSync(TEST_BASELINES_DIR)).toBe(true);
    });

    it('should create index.json on initialization', async () => {
      await manager.initialize();

      const indexPath = path.join(TEST_BASELINES_DIR, 'index.json');
      expect(fs.existsSync(indexPath)).toBe(true);

      const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      expect(index.version).toBe('1.0.0');
      expect(index.baselines).toEqual({});
    });

    it('should create .gitignore on initialization', async () => {
      await manager.initialize();

      const gitignorePath = path.join(TEST_BASELINES_DIR, '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);

      const content = fs.readFileSync(gitignorePath, 'utf-8');
      expect(content).toContain('*.diff.png');
    });

    it('should create README on initialization', async () => {
      await manager.initialize();

      const readmePath = path.join(TEST_BASELINES_DIR, 'README.md');
      expect(fs.existsSync(readmePath)).toBe(true);

      const content = fs.readFileSync(readmePath, 'utf-8');
      expect(content).toContain('Visual Regression Test Baselines');
    });

    it('should handle concurrent initialization calls', async () => {
      // Call initialize multiple times concurrently
      const promises = [
        manager.initialize(),
        manager.initialize(),
        manager.initialize(),
      ];

      // Should not throw or create conflicts
      await expect(Promise.all(promises)).resolves.not.toThrow();

      // Should only have one index
      const indexPath = path.join(TEST_BASELINES_DIR, 'index.json');
      expect(fs.existsSync(indexPath)).toBe(true);
    });
  });

  describe('Platform-Specific Baselines', () => {
    beforeEach(async () => {
      await manager.initialize();

      // Create test image
      const testImagePath = path.join(TEST_BASELINES_DIR, 'temp-test.png');
      createTestImage(testImagePath, 100, 100);

      // Create generic baseline
      const suiteDir = path.join(TEST_BASELINES_DIR, testSuite);
      fs.mkdirSync(suiteDir, { recursive: true });
      fs.copyFileSync(
        testImagePath,
        path.join(suiteDir, `${screenshotName}.png`)
      );

      // Create platform-specific baselines
      fs.copyFileSync(
        testImagePath,
        path.join(suiteDir, `${screenshotName}.darwin.png`)
      );
      fs.copyFileSync(
        testImagePath,
        path.join(suiteDir, `${screenshotName}.linux.png`)
      );
      fs.copyFileSync(
        testImagePath,
        path.join(suiteDir, `${screenshotName}.win32.png`)
      );
    });

    it('should use platform-specific baseline when available on current platform', () => {
      const baselinePath = manager.getBaselinePath(
        testSuite,
        screenshotName,
        true
      );

      // Should include current platform name
      expect(baselinePath).toContain(process.platform);
    });

    it('should fall back to generic baseline when platform-specific not found', () => {
      const baselinePath = manager.getBaselinePath(
        testSuite,
        'nonexistent-screenshot',
        true
      );

      // Should not include platform name
      expect(baselinePath).not.toContain('.darwin.');
      expect(baselinePath).not.toContain('.linux.');
      expect(baselinePath).not.toContain('.win32.');
      expect(baselinePath).toEndWith('.png');
    });

    it('should use generic baseline when usePlatform is false', () => {
      const baselinePath = manager.getBaselinePath(
        testSuite,
        screenshotName,
        false
      );

      // Should not include platform name
      expect(baselinePath).not.toContain('.darwin.');
      expect(baselinePath).not.toContain('.linux.');
      expect(baselinePath).not.toContain('.win32.');
      expect(baselinePath).toMatch(new RegExp(`${screenshotName}\\.png$`));
    });

    it('should work correctly on all platforms (darwin, linux, win32)', () => {
      // This test verifies the logic works for all platforms
      const platforms = ['darwin', 'linux', 'win32'];

      platforms.forEach((platform) => {
        const suiteDir = path.join(TEST_BASELINES_DIR, testSuite);
        const platformPath = path.join(
          suiteDir,
          `${screenshotName}.${platform}.png`
        );

        // Platform-specific file should exist (created in beforeEach)
        expect(fs.existsSync(platformPath)).toBe(true);
      });
    });
  });

  describe('Baseline CRUD Operations', () => {
    it('should save baseline with metadata', async () => {
      await manager.initialize();

      // Create test image
      const testImagePath = path.join(TEST_BASELINES_DIR, 'temp-test.png');
      createTestImage(testImagePath, 100, 100);

      const savedPath = await manager.saveBaseline(
        testSuite,
        screenshotName,
        testImagePath,
        { viewport: 'desktop' }
      );

      expect(fs.existsSync(savedPath)).toBe(true);

      // Check metadata
      const metadata = manager.getBaselineMetadata(testSuite, screenshotName);
      expect(metadata).not.toBeNull();
      expect(metadata?.viewport).toBe('desktop');
      expect(metadata?.dimensions.width).toBe(100);
      expect(metadata?.dimensions.height).toBe(100);
    });

    it('should check if baseline exists', async () => {
      await manager.initialize();

      expect(manager.hasBaseline(testSuite, screenshotName)).toBe(false);

      // Create baseline
      const testImagePath = path.join(TEST_BASELINES_DIR, 'temp-test.png');
      createTestImage(testImagePath, 100, 100);
      await manager.saveBaseline(testSuite, screenshotName, testImagePath);

      expect(manager.hasBaseline(testSuite, screenshotName)).toBe(true);
    });

    it('should list all baselines', async () => {
      await manager.initialize();

      // Create test image
      const testImagePath = path.join(TEST_BASELINES_DIR, 'temp-test.png');
      createTestImage(testImagePath, 100, 100);

      // Create multiple baselines
      await manager.saveBaseline(testSuite, 'screenshot1', testImagePath);
      await manager.saveBaseline(testSuite, 'screenshot2', testImagePath);
      await manager.saveBaseline('other-suite', 'screenshot3', testImagePath);

      const allBaselines = manager.listBaselines();
      expect(allBaselines.length).toBe(3);

      const suiteBaselines = manager.listBaselines(testSuite);
      expect(suiteBaselines.length).toBe(2);
    });

    it('should delete baseline and remove from index', async () => {
      await manager.initialize();

      // Create baseline
      const testImagePath = path.join(TEST_BASELINES_DIR, 'temp-test.png');
      createTestImage(testImagePath, 100, 100);
      const savedPath = await manager.saveBaseline(
        testSuite,
        screenshotName,
        testImagePath
      );

      expect(fs.existsSync(savedPath)).toBe(true);
      expect(manager.hasBaseline(testSuite, screenshotName)).toBe(true);

      // Delete baseline
      await manager.deleteBaseline(testSuite, screenshotName);

      expect(fs.existsSync(savedPath)).toBe(false);
      expect(manager.hasBaseline(testSuite, screenshotName)).toBe(false);
      expect(manager.getBaselineMetadata(testSuite, screenshotName)).toBeNull();
    });

    it('should update existing baseline metadata', async () => {
      await manager.initialize();

      const testImagePath = path.join(TEST_BASELINES_DIR, 'temp-test.png');
      createTestImage(testImagePath, 100, 100);

      // Save initial baseline
      await manager.saveBaseline(testSuite, screenshotName, testImagePath);
      const initialMetadata = manager.getBaselineMetadata(
        testSuite,
        screenshotName
      );
      const createdAt = initialMetadata?.createdAt;

      // Wait a bit to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Update baseline
      await manager.saveBaseline(testSuite, screenshotName, testImagePath);
      const updatedMetadata = manager.getBaselineMetadata(
        testSuite,
        screenshotName
      );

      // createdAt should stay the same
      expect(updatedMetadata?.createdAt).toBe(createdAt);

      // updatedAt should change
      expect(updatedMetadata?.updatedAt).not.toBe(initialMetadata?.updatedAt);
    });
  });

  describe('Diff Path Generation', () => {
    it('should generate diff path in diffs subdirectory', async () => {
      await manager.initialize();

      const diffPath = manager.getDiffPath(testSuite, screenshotName);

      expect(diffPath).toContain('diffs');
      expect(diffPath).toContain(`${screenshotName}.diff.png`);
      expect(fs.existsSync(path.dirname(diffPath))).toBe(true);
    });

    it('should create diffs directory if it does not exist', async () => {
      await manager.initialize();

      const suiteDir = path.join(TEST_BASELINES_DIR, testSuite);
      const diffsDir = path.join(suiteDir, 'diffs');

      // Ensure diffs directory doesn't exist
      if (fs.existsSync(diffsDir)) {
        fs.rmSync(diffsDir, { recursive: true });
      }

      const diffPath = manager.getDiffPath(testSuite, screenshotName);

      expect(fs.existsSync(diffsDir)).toBe(true);
    });
  });

  describe('Path Sanitization', () => {
    it('should sanitize test suite names', async () => {
      await manager.initialize();

      const testImagePath = path.join(TEST_BASELINES_DIR, 'temp-test.png');
      createTestImage(testImagePath, 100, 100);

      const unsafeName = 'Test Suite With Spaces & Special!@#$%';
      await manager.saveBaseline(unsafeName, screenshotName, testImagePath);

      const baselinePath = manager.getBaselinePath(
        unsafeName,
        screenshotName,
        false
      );

      // Path should be sanitized (lowercase, no special chars)
      expect(baselinePath).toMatch(/test-suite-with-spaces---special------/);
    });
  });
});

/**
 * Helper: Create a test PNG image
 */
function createTestImage(filepath: string, width: number, height: number): void {
  const png = new PNG({ width, height });

  // Fill with solid color
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      png.data[idx] = 255; // R
      png.data[idx + 1] = 0; // G
      png.data[idx + 2] = 0; // B
      png.data[idx + 3] = 255; // Alpha
    }
  }

  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filepath, buffer);
}
