/**
 * Visual Regression Testing Constants
 *
 * Centralized configuration for visual regression testing thresholds and settings.
 */

/**
 * Standard comparison thresholds for visual regression testing
 *
 * These values represent the acceptable difference percentage (0-1 scale)
 * between baseline and current screenshots.
 *
 * @example
 * ```typescript
 * import { VISUAL_THRESHOLDS } from './constants';
 *
 * await visual.matchesBaseline(screenshot, 'logo', {
 *   threshold: VISUAL_THRESHOLDS.PIXEL_PERFECT
 * });
 * ```
 */
export const VISUAL_THRESHOLDS = {
  /**
   * Pixel-perfect match (0% tolerance)
   *
   * Use for: Logos, icons, exact UI elements
   * Sensitivity: Fails on any pixel difference
   */
  PIXEL_PERFECT: 0,

  /**
   * Strict comparison (1% tolerance)
   *
   * Use for: Critical UI components with minimal rendering differences
   * Sensitivity: Allows for very minor anti-aliasing differences
   */
  STRICT: 0.01,

  /**
   * Standard comparison (10% tolerance) - DEFAULT
   *
   * Use for: Most UI components, layouts, general testing
   * Sensitivity: Allows for minor rendering differences, font smoothing
   *
   * This is the recommended default for most visual regression tests.
   */
  STANDARD: 0.1,

  /**
   * Lenient comparison (25% tolerance)
   *
   * Use for: Dynamic content areas, complex layouts
   * Sensitivity: Allows for significant differences while catching major regressions
   */
  LENIENT: 0.25,

  /**
   * Permissive comparison (50% tolerance)
   *
   * Use for: Highly dynamic content, preliminary testing
   * Sensitivity: Only catches major visual regressions
   */
  PERMISSIVE: 0.5,
} as const;

/**
 * Type for threshold values
 */
export type VisualThreshold = typeof VISUAL_THRESHOLDS[keyof typeof VISUAL_THRESHOLDS];

/**
 * Default diff color for highlighting visual differences (RGB)
 *
 * Default: Red [255, 0, 0]
 */
export const DEFAULT_DIFF_COLOR: [number, number, number] = [255, 0, 0];

/**
 * Alternative diff colors for different use cases
 */
export const DIFF_COLORS = {
  RED: [255, 0, 0] as [number, number, number],
  MAGENTA: [255, 0, 255] as [number, number, number],
  CYAN: [0, 255, 255] as [number, number, number],
  YELLOW: [255, 255, 0] as [number, number, number],
} as const;

/**
 * Default alpha blend amount for diff overlay
 *
 * Range: 0-1 (0 = fully transparent, 1 = fully opaque)
 * Default: 0.1 (10% opacity)
 */
export const DEFAULT_ALPHA = 0.1;

/**
 * Baseline file extensions by platform
 */
export const PLATFORM_EXTENSIONS = {
  DARWIN: '.darwin.png',
  LINUX: '.linux.png',
  WIN32: '.win32.png',
  GENERIC: '.png',
} as const;

/**
 * Baseline storage configuration
 */
export const BASELINE_CONFIG = {
  /**
   * Index file name for baseline metadata
   */
  INDEX_FILE: 'index.json',

  /**
   * Directory name for diff images
   */
  DIFFS_DIR: 'diffs',

  /**
   * Maximum age for diff images (days) before cleanup
   */
  MAX_DIFF_AGE_DAYS: 7,

  /**
   * Baseline directory README filename
   */
  README_FILE: 'README.md',

  /**
   * Git ignore filename for baselines directory
   */
  GITIGNORE_FILE: '.gitignore',
} as const;

/**
 * Supported image formats for screenshots
 */
export const IMAGE_FORMATS = {
  PNG: 'png',
  JPEG: 'jpeg',
} as const;

/**
 * JPEG quality settings
 */
export const JPEG_QUALITY = {
  /**
   * Low quality (faster, smaller files)
   */
  LOW: 60,

  /**
   * Medium quality (balanced)
   */
  MEDIUM: 80,

  /**
   * High quality (slower, larger files)
   */
  HIGH: 95,

  /**
   * Maximum quality
   */
  MAX: 100,
} as const;

/**
 * Validation constraints
 */
export const VALIDATION = {
  /**
   * Minimum threshold value (inclusive)
   */
  MIN_THRESHOLD: 0,

  /**
   * Maximum threshold value (inclusive)
   */
  MAX_THRESHOLD: 1,

  /**
   * Minimum JPEG quality (inclusive)
   */
  MIN_JPEG_QUALITY: 0,

  /**
   * Maximum JPEG quality (inclusive)
   */
  MAX_JPEG_QUALITY: 100,

  /**
   * RGB color component range
   */
  MIN_COLOR_VALUE: 0,
  MAX_COLOR_VALUE: 255,

  /**
   * RGB color array length
   */
  COLOR_ARRAY_LENGTH: 3,
} as const;
