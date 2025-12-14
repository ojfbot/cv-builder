/**
 * Screenshot Metadata Generator
 *
 * Generates comprehensive metadata for screenshots captured during
 * interaction flow execution.
 */

import { execSync } from 'child_process';
import {
  DrawioNode,
  InteractionType,
  ViewportConfig,
  StateAssertion,
  VIEWPORT_PRESETS,
} from './schema.js';

/**
 * Screenshot metadata
 */
export interface ScreenshotMetadata {
  /**
   * Draw.io node ID this screenshot corresponds to
   */
  nodeId: string;

  /**
   * Step number in the interaction sequence
   */
  stepNumber: number;

  /**
   * Type of interaction that triggered this screenshot
   */
  interactionType: InteractionType | 'initial' | 'final';

  /**
   * When the screenshot was captured
   */
  timestamp: string;

  /**
   * Viewport configuration used
   */
  viewport: ViewportConfig;

  /**
   * Path to the screenshot file (relative)
   */
  screenshotPath: string;

  /**
   * Path to baseline (if exists)
   */
  baselinePath?: string;

  /**
   * Path to diff image (if exists)
   */
  diffPath?: string;

  /**
   * CSS selector for target element (null = full page)
   */
  selector?: string | null;

  /**
   * Expected state after this interaction
   */
  expectedState?: StateAssertion[];

  /**
   * Actual captured state
   */
  actualState?: CapturedState;

  /**
   * Visual regression test result
   */
  passed: boolean;

  /**
   * Visual difference percentage (if compared)
   */
  diffPercentage?: number;

  /**
   * Number of different pixels
   */
  diffPixels?: number;

  /**
   * Git commit hash for traceability
   */
  gitCommit?: string;

  /**
   * Original Draw.io node label
   */
  nodeLabel?: string;

  /**
   * Screenshot capture timing
   */
  captureAt: 'before' | 'after' | 'both';
}

/**
 * Captured UI state
 */
export interface CapturedState {
  /**
   * Elements that were visible
   */
  visibleElements: string[];

  /**
   * Text content of key elements
   */
  textContent: Record<string, string>;

  /**
   * HTML attributes of key elements
   */
  attributes: Record<string, Record<string, string>>;

  /**
   * Computed styles of key elements
   */
  styles?: Record<string, Record<string, string>>;

  /**
   * Element counts by selector
   */
  counts?: Record<string, number>;
}

/**
 * Interaction execution result
 */
export interface InteractionResult {
  /**
   * Node that was executed
   */
  node: DrawioNode;

  /**
   * Step number
   */
  stepNumber: number;

  /**
   * Execution success
   */
  success: boolean;

  /**
   * Error message (if failed)
   */
  error?: string;

  /**
   * Screenshots captured
   */
  screenshots: ScreenshotMetadata[];

  /**
   * Execution duration (ms)
   */
  duration: number;

  /**
   * State before interaction
   */
  stateBefore?: CapturedState;

  /**
   * State after interaction
   */
  stateAfter?: CapturedState;
}

/**
 * Complete manifest for a test run
 */
export interface TestManifest {
  /**
   * Manifest version
   */
  version: string;

  /**
   * When this test run occurred
   */
  generatedAt: string;

  /**
   * Git commit hash
   */
  gitCommit?: string;

  /**
   * Source Draw.io file
   */
  diagramSource: string;

  /**
   * Total interaction steps
   */
  totalSteps: number;

  /**
   * Total screenshots captured
   */
  screenshotsCaptured: number;

  /**
   * Test run duration (ms)
   */
  duration: number;

  /**
   * Overall success
   */
  passed: boolean;

  /**
   * Interaction results
   */
  interactions: InteractionResult[];

  /**
   * Summary statistics
   */
  summary: {
    totalPassed: number;
    totalFailed: number;
    totalScreenshots: number;
    averageDiffPercentage: number;
  };
}

/**
 * Metadata Generator
 */
export class MetadataGenerator {
  private gitCommit?: string;

  constructor() {
    this.gitCommit = this.getGitCommit();
  }

  /**
   * Generate screenshot metadata
   */
  generateScreenshotMetadata(
    node: DrawioNode,
    stepNumber: number,
    screenshotPath: string,
    captureAt: 'before' | 'after',
    viewport: ViewportConfig
  ): ScreenshotMetadata {
    return {
      nodeId: node.id,
      stepNumber,
      interactionType: node.interaction?.type || 'initial',
      timestamp: new Date().toISOString(),
      viewport,
      screenshotPath,
      selector: node.screenshotConfig?.selector,
      expectedState: node.assertions,
      passed: true, // Will be updated after comparison
      captureAt,
      gitCommit: this.gitCommit,
      nodeLabel: node.label,
    };
  }

  /**
   * Generate interaction result
   */
  generateInteractionResult(
    node: DrawioNode,
    stepNumber: number,
    success: boolean,
    screenshots: ScreenshotMetadata[],
    duration: number,
    error?: string
  ): InteractionResult {
    return {
      node,
      stepNumber,
      success,
      error,
      screenshots,
      duration,
    };
  }

  /**
   * Generate test manifest
   */
  generateManifest(
    diagramSource: string,
    interactions: InteractionResult[],
    totalDuration: number
  ): TestManifest {
    const totalScreenshots = interactions.reduce(
      (sum, int) => sum + int.screenshots.length,
      0
    );

    const totalPassed = interactions.filter((i) => i.success).length;
    const totalFailed = interactions.length - totalPassed;

    const allScreenshots = interactions.flatMap((i) => i.screenshots);
    const averageDiffPercentage =
      allScreenshots.reduce((sum, s) => sum + (s.diffPercentage || 0), 0) /
      (allScreenshots.length || 1);

    return {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      gitCommit: this.gitCommit,
      diagramSource,
      totalSteps: interactions.length,
      screenshotsCaptured: totalScreenshots,
      duration: totalDuration,
      passed: totalFailed === 0,
      interactions,
      summary: {
        totalPassed,
        totalFailed,
        totalScreenshots,
        averageDiffPercentage,
      },
    };
  }

  /**
   * Validate metadata against schema
   */
  validate(metadata: ScreenshotMetadata): boolean {
    if (!metadata.nodeId) return false;
    if (!metadata.screenshotPath) return false;
    if (!metadata.timestamp) return false;
    if (!metadata.viewport) return false;
    return true;
  }

  /**
   * Get current git commit hash
   */
  private getGitCommit(): string | undefined {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    } catch {
      return undefined;
    }
  }
}

/**
 * Utility function to generate metadata
 */
export function generateMetadata(
  node: DrawioNode,
  stepNumber: number,
  screenshotPath: string,
  captureAt: 'before' | 'after',
  viewport: ViewportConfig
): ScreenshotMetadata {
  const generator = new MetadataGenerator();
  return generator.generateScreenshotMetadata(
    node,
    stepNumber,
    screenshotPath,
    captureAt,
    viewport
  );
}
