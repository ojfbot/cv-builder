/**
 * Visual Regression Testing Module
 *
 * Exports all components for deterministic screenshot comparison
 */

export {
  ComparisonEngine,
  ComparisonOptions,
  ComparisonResult,
  createComparisonEngine,
  compareScreenshots,
} from './comparison-engine.js';

export {
  BaselineManager,
  BaselineMetadata,
  BaselineIndex,
  getBaselineManager,
} from './baseline-manager.js';
