/**
 * Unit tests for ComparisonEngine
 *
 * Tests edge cases, validation, and error handling
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import {
  ComparisonEngine,
  VISUAL_THRESHOLDS,
  VALIDATION,
} from '../../src/visual/index.js';

const FIXTURES_DIR = path.join(process.cwd(), 'tests/fixtures/visual');
const TEMP_DIR = path.join(process.cwd(), 'temp/test-comparison');

describe('ComparisonEngine', () => {
  let engine: ComparisonEngine;

  beforeAll(() => {
    // Create test directories
    if (!fs.existsSync(FIXTURES_DIR)) {
      fs.mkdirSync(FIXTURES_DIR, { recursive: true });
    }
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    // Create test fixtures
    createTestImage(path.join(FIXTURES_DIR, 'baseline.png'), 100, 100, {
      r: 255,
      g: 0,
      b: 0,
    });
    createTestImage(path.join(FIXTURES_DIR, 'identical.png'), 100, 100, {
      r: 255,
      g: 0,
      b: 0,
    });
    createTestImage(path.join(FIXTURES_DIR, 'slightly-different.png'), 100, 100, {
      r: 255,
      g: 10,
      b: 10,
    });
    createTestImage(path.join(FIXTURES_DIR, 'very-different.png'), 100, 100, {
      r: 0,
      g: 255,
      b: 0,
    });
    createTestImage(path.join(FIXTURES_DIR, 'different-size.png'), 200, 200, {
      r: 255,
      g: 0,
      b: 0,
    });
    createCorruptedImage(path.join(FIXTURES_DIR, 'corrupted.png'));

    engine = new ComparisonEngine();
  });

  afterAll(() => {
    // Cleanup temp files
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true });
    }
  });

  describe('Input Validation', () => {
    it('should reject threshold below minimum', async () => {
      await expect(
        engine.compare(
          path.join(FIXTURES_DIR, 'baseline.png'),
          path.join(FIXTURES_DIR, 'identical.png'),
          undefined,
          { threshold: -0.1 }
        )
      ).rejects.toThrow('Threshold must be between 0 and 1');
    });

    it('should reject threshold above maximum', async () => {
      await expect(
        engine.compare(
          path.join(FIXTURES_DIR, 'baseline.png'),
          path.join(FIXTURES_DIR, 'identical.png'),
          undefined,
          { threshold: 1.5 }
        )
      ).rejects.toThrow('Threshold must be between 0 and 1');
    });

    it('should reject alpha below minimum', async () => {
      await expect(
        engine.compare(
          path.join(FIXTURES_DIR, 'baseline.png'),
          path.join(FIXTURES_DIR, 'identical.png'),
          undefined,
          { alpha: -0.1 }
        )
      ).rejects.toThrow('Alpha must be between 0 and 1');
    });

    it('should reject alpha above maximum', async () => {
      await expect(
        engine.compare(
          path.join(FIXTURES_DIR, 'baseline.png'),
          path.join(FIXTURES_DIR, 'identical.png'),
          undefined,
          { alpha: 1.5 }
        )
      ).rejects.toThrow('Alpha must be between 0 and 1');
    });

    it('should reject invalid diffColor array length', async () => {
      await expect(
        engine.compare(
          path.join(FIXTURES_DIR, 'baseline.png'),
          path.join(FIXTURES_DIR, 'identical.png'),
          undefined,
          { diffColor: [255, 0] as any }
        )
      ).rejects.toThrow('diffColor must be [R, G, B]');
    });

    it('should reject diffColor values below minimum', async () => {
      await expect(
        engine.compare(
          path.join(FIXTURES_DIR, 'baseline.png'),
          path.join(FIXTURES_DIR, 'identical.png'),
          undefined,
          { diffColor: [-1, 0, 0] }
        )
      ).rejects.toThrow('diffColor[0] must be between 0 and 255');
    });

    it('should reject diffColor values above maximum', async () => {
      await expect(
        engine.compare(
          path.join(FIXTURES_DIR, 'baseline.png'),
          path.join(FIXTURES_DIR, 'identical.png'),
          undefined,
          { diffColor: [256, 0, 0] }
        )
      ).rejects.toThrow('diffColor[0] must be between 0 and 255');
    });

    it('should reject non-existent baseline file', async () => {
      await expect(
        engine.compare(
          path.join(FIXTURES_DIR, 'nonexistent.png'),
          path.join(FIXTURES_DIR, 'identical.png')
        )
      ).rejects.toThrow('Baseline screenshot not found');
    });

    it('should reject non-existent current file', async () => {
      await expect(
        engine.compare(
          path.join(FIXTURES_DIR, 'baseline.png'),
          path.join(FIXTURES_DIR, 'nonexistent.png')
        )
      ).rejects.toThrow('Current screenshot not found');
    });
  });

  describe('Threshold Boundary Testing', () => {
    it('should pass identical images with PIXEL_PERFECT threshold', async () => {
      const result = await engine.compare(
        path.join(FIXTURES_DIR, 'baseline.png'),
        path.join(FIXTURES_DIR, 'identical.png'),
        undefined,
        { threshold: VISUAL_THRESHOLDS.PIXEL_PERFECT }
      );

      expect(result.matches).toBe(true);
      expect(result.diffPixelCount).toBe(0);
      expect(result.diffPercentage).toBe(0);
    });

    it('should fail slightly different images with PIXEL_PERFECT threshold', async () => {
      const result = await engine.compare(
        path.join(FIXTURES_DIR, 'baseline.png'),
        path.join(FIXTURES_DIR, 'slightly-different.png'),
        undefined,
        { threshold: VISUAL_THRESHOLDS.PIXEL_PERFECT }
      );

      expect(result.matches).toBe(false);
      expect(result.diffPixelCount).toBeGreaterThan(0);
    });

    it('should handle threshold of exactly 1.0', async () => {
      const result = await engine.compare(
        path.join(FIXTURES_DIR, 'baseline.png'),
        path.join(FIXTURES_DIR, 'very-different.png'),
        undefined,
        { threshold: 1.0 }
      );

      // Threshold of 1.0 should match everything
      expect(result.matches).toBe(true);
    });

    it('should handle threshold of exactly 0.0', async () => {
      const result = await engine.compare(
        path.join(FIXTURES_DIR, 'baseline.png'),
        path.join(FIXTURES_DIR, 'identical.png'),
        undefined,
        { threshold: 0.0 }
      );

      expect(result.matches).toBe(true);
    });
  });

  describe('Dimension Mismatch Handling', () => {
    it('should reject images with different dimensions', async () => {
      await expect(
        engine.compare(
          path.join(FIXTURES_DIR, 'baseline.png'),
          path.join(FIXTURES_DIR, 'different-size.png')
        )
      ).rejects.toThrow('Image dimensions do not match');
    });
  });

  describe('Corrupted Image Handling', () => {
    it('should handle corrupted baseline image gracefully', async () => {
      await expect(
        engine.compare(
          path.join(FIXTURES_DIR, 'corrupted.png'),
          path.join(FIXTURES_DIR, 'identical.png')
        )
      ).rejects.toThrow();
    });

    it('should handle corrupted current image gracefully', async () => {
      await expect(
        engine.compare(
          path.join(FIXTURES_DIR, 'baseline.png'),
          path.join(FIXTURES_DIR, 'corrupted.png')
        )
      ).rejects.toThrow();
    });
  });

  describe('Batch Comparison', () => {
    it('should return successes and failures separately', async () => {
      const comparisons = [
        {
          baselinePath: path.join(FIXTURES_DIR, 'baseline.png'),
          currentPath: path.join(FIXTURES_DIR, 'identical.png'),
          name: 'identical',
        },
        {
          baselinePath: path.join(FIXTURES_DIR, 'baseline.png'),
          currentPath: path.join(FIXTURES_DIR, 'nonexistent.png'),
          name: 'missing',
        },
        {
          baselinePath: path.join(FIXTURES_DIR, 'baseline.png'),
          currentPath: path.join(FIXTURES_DIR, 'different-size.png'),
          name: 'size-mismatch',
        },
      ];

      const { successes, failures } = await engine.compareMultiple(comparisons);

      expect(successes.size).toBe(1);
      expect(failures.size).toBe(2);
      expect(successes.has('identical')).toBe(true);
      expect(failures.has('missing')).toBe(true);
      expect(failures.has('size-mismatch')).toBe(true);
    });

    it('should capture error details for failures', async () => {
      const comparisons = [
        {
          baselinePath: path.join(FIXTURES_DIR, 'baseline.png'),
          currentPath: path.join(FIXTURES_DIR, 'nonexistent.png'),
          name: 'missing',
        },
      ];

      const { failures } = await engine.compareMultiple(comparisons);

      expect(failures.has('missing')).toBe(true);
      const error = failures.get('missing');
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toContain('Current screenshot not found');
    });
  });

  describe('Anti-Aliasing Detection', () => {
    it('should respect includeAA option', async () => {
      const resultWithAA = await engine.compare(
        path.join(FIXTURES_DIR, 'baseline.png'),
        path.join(FIXTURES_DIR, 'slightly-different.png'),
        undefined,
        { threshold: VISUAL_THRESHOLDS.STRICT, includeAA: true }
      );

      const resultWithoutAA = await engine.compare(
        path.join(FIXTURES_DIR, 'baseline.png'),
        path.join(FIXTURES_DIR, 'slightly-different.png'),
        undefined,
        { threshold: VISUAL_THRESHOLDS.STRICT, includeAA: false }
      );

      // With AA detection, slight differences may be ignored
      expect(resultWithAA.diffPixelCount).toBeLessThanOrEqual(
        resultWithoutAA.diffPixelCount
      );
    });
  });

  describe('Diff Image Generation', () => {
    it('should generate diff image when path provided', async () => {
      const diffPath = path.join(TEMP_DIR, 'test-diff.png');

      const result = await engine.compare(
        path.join(FIXTURES_DIR, 'baseline.png'),
        path.join(FIXTURES_DIR, 'slightly-different.png'),
        diffPath
      );

      expect(result.diffPath).toBe(diffPath);
      expect(fs.existsSync(diffPath)).toBe(true);
    });

    it('should not generate diff image when path not provided', async () => {
      const result = await engine.compare(
        path.join(FIXTURES_DIR, 'baseline.png'),
        path.join(FIXTURES_DIR, 'identical.png')
      );

      expect(result.diffPath).toBeUndefined();
    });
  });
});

/**
 * Helper: Create a solid color test image
 */
function createTestImage(
  filepath: string,
  width: number,
  height: number,
  color: { r: number; g: number; b: number }
): void {
  const png = new PNG({ width, height });

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      png.data[idx] = color.r;
      png.data[idx + 1] = color.g;
      png.data[idx + 2] = color.b;
      png.data[idx + 3] = 255; // Alpha
    }
  }

  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filepath, buffer);
}

/**
 * Helper: Create a corrupted PNG file
 */
function createCorruptedImage(filepath: string): void {
  // Write invalid PNG data
  fs.writeFileSync(filepath, Buffer.from('NOT A VALID PNG FILE'));
}
