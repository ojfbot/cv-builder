/**
 * Screenshot Comparison Engine
 *
 * Deterministic pixel-perfect comparison for visual regression testing.
 * Uses pixelmatch for accurate diff generation with configurable thresholds.
 */

import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

export interface ComparisonOptions {
  /**
   * Matching threshold (0-1). Default: 0.1
   * Lower = more strict. 0 = pixel-perfect.
   */
  threshold?: number;

  /**
   * Include anti-aliasing detection. Default: false
   * Set to true for more lenient comparison (useful for text rendering).
   */
  includeAA?: boolean;

  /**
   * Diff color for highlighting changes (RGB). Default: red
   */
  diffColor?: [number, number, number];

  /**
   * Alpha blend amount for diff overlay (0-1). Default: 0.1
   */
  alpha?: number;
}

export interface ComparisonResult {
  /**
   * Match status
   */
  matches: boolean;

  /**
   * Number of different pixels
   */
  diffPixelCount: number;

  /**
   * Percentage of different pixels (0-100)
   */
  diffPercentage: number;

  /**
   * Total pixels compared
   */
  totalPixels: number;

  /**
   * Path to baseline screenshot
   */
  baselinePath: string;

  /**
   * Path to current screenshot
   */
  currentPath: string;

  /**
   * Path to diff image (if generated)
   */
  diffPath?: string;

  /**
   * Comparison timestamp
   */
  timestamp: string;

  /**
   * Image dimensions
   */
  dimensions: {
    width: number;
    height: number;
  };
}

export class ComparisonEngine {
  private defaultOptions: Required<ComparisonOptions> = {
    threshold: 0.1,
    includeAA: false,
    diffColor: [255, 0, 0], // Red
    alpha: 0.1,
  };

  /**
   * Compare two screenshots and generate diff
   */
  async compare(
    baselinePath: string,
    currentPath: string,
    diffOutputPath?: string,
    options: ComparisonOptions = {}
  ): Promise<ComparisonResult> {
    // Validate inputs
    if (!fs.existsSync(baselinePath)) {
      throw new Error(`Baseline screenshot not found: ${baselinePath}`);
    }
    if (!fs.existsSync(currentPath)) {
      throw new Error(`Current screenshot not found: ${currentPath}`);
    }

    // Merge options with defaults
    const opts = { ...this.defaultOptions, ...options };

    // Load images
    const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
    const current = PNG.sync.read(fs.readFileSync(currentPath));

    // Validate dimensions match
    if (baseline.width !== current.width || baseline.height !== current.height) {
      throw new Error(
        `Screenshot dimensions don't match. ` +
          `Baseline: ${baseline.width}x${baseline.height}, ` +
          `Current: ${current.width}x${current.height}`
      );
    }

    const { width, height } = baseline;
    const totalPixels = width * height;

    // Create diff image
    const diff = new PNG({ width, height });

    // Run pixel comparison
    const diffPixelCount = pixelmatch(
      baseline.data,
      current.data,
      diff.data,
      width,
      height,
      {
        threshold: opts.threshold,
        includeAA: opts.includeAA,
        diffColor: opts.diffColor,
        alpha: opts.alpha,
      }
    );

    const diffPercentage = (diffPixelCount / totalPixels) * 100;
    const matches = diffPixelCount === 0;

    // Save diff image if path provided and there are differences
    let diffPath: string | undefined;
    if (diffOutputPath && diffPixelCount > 0) {
      // Ensure diff output directory exists
      const diffDir = path.dirname(diffOutputPath);
      if (!fs.existsSync(diffDir)) {
        fs.mkdirSync(diffDir, { recursive: true });
      }

      // Write diff image
      fs.writeFileSync(diffOutputPath, PNG.sync.write(diff));
      diffPath = diffOutputPath;
      console.log(`Diff image saved: ${diffOutputPath}`);
    }

    return {
      matches,
      diffPixelCount,
      diffPercentage,
      totalPixels,
      baselinePath,
      currentPath,
      diffPath,
      timestamp: new Date().toISOString(),
      dimensions: { width, height },
    };
  }

  /**
   * Batch compare multiple screenshot pairs
   */
  async compareMultiple(
    comparisons: Array<{
      baselinePath: string;
      currentPath: string;
      diffOutputPath?: string;
      name?: string;
    }>,
    options: ComparisonOptions = {}
  ): Promise<Map<string, ComparisonResult>> {
    const results = new Map<string, ComparisonResult>();

    for (const { baselinePath, currentPath, diffOutputPath, name } of comparisons) {
      const key = name || path.basename(currentPath);
      try {
        const result = await this.compare(
          baselinePath,
          currentPath,
          diffOutputPath,
          options
        );
        results.set(key, result);
      } catch (error) {
        console.error(`Comparison failed for ${key}:`, error);
        // Continue with other comparisons
      }
    }

    return results;
  }

  /**
   * Generate summary report for multiple comparisons
   */
  generateSummary(results: Map<string, ComparisonResult>): {
    totalComparisons: number;
    passed: number;
    failed: number;
    totalDiffPixels: number;
    avgDiffPercentage: number;
  } {
    let totalDiffPixels = 0;
    let totalDiffPercentage = 0;
    let passed = 0;
    let failed = 0;

    results.forEach((result) => {
      totalDiffPixels += result.diffPixelCount;
      totalDiffPercentage += result.diffPercentage;
      if (result.matches) {
        passed++;
      } else {
        failed++;
      }
    });

    return {
      totalComparisons: results.size,
      passed,
      failed,
      totalDiffPixels,
      avgDiffPercentage: results.size > 0 ? totalDiffPercentage / results.size : 0,
    };
  }
}

/**
 * Helper function to create comparison engine with default settings
 */
export function createComparisonEngine(): ComparisonEngine {
  return new ComparisonEngine();
}

/**
 * Quick comparison function for single screenshot pairs
 */
export async function compareScreenshots(
  baselinePath: string,
  currentPath: string,
  diffOutputPath?: string,
  options?: ComparisonOptions
): Promise<ComparisonResult> {
  const engine = new ComparisonEngine();
  return engine.compare(baselinePath, currentPath, diffOutputPath, options);
}
