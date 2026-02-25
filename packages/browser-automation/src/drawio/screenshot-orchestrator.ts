/**
 * Screenshot Orchestrator
 *
 * Orchestrates screenshot capture for Draw.io interaction flows.
 * Coordinates interaction execution, screenshot capture, and metadata generation.
 */

import { Page, Browser, chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import {
  DrawioUISchema,
  DrawioNode,
  ViewportConfig,
  VIEWPORT_PRESETS,
} from './schema.js';
import { InteractionExecutor, ExecutionOptions } from './interaction-executor.js';
import {
  MetadataGenerator,
  ScreenshotMetadata,
  InteractionResult,
  TestManifest,
} from './metadata.js';
import { getBaselineManager } from '../visual/baseline-manager.js';
import { ComparisonEngine } from '../visual/comparison-engine.js';

/**
 * Capture options
 */
export interface CaptureOptions extends ExecutionOptions {
  /**
   * Base URL for the application
   */
  baseUrl: string;

  /**
   * Output directory for screenshots
   */
  outputDir: string;

  /**
   * Viewport preset or custom config
   */
  viewport?: keyof typeof VIEWPORT_PRESETS | ViewportConfig;

  /**
   * Whether to compare with baselines
   */
  compareWithBaselines?: boolean;

  /**
   * Visual comparison threshold
   */
  threshold?: number;

  /**
   * Headless mode
   */
  headless?: boolean;

  /**
   * Browser type
   */
  browserType?: 'chromium' | 'firefox' | 'webkit';
}

/**
 * Capture result
 */
export interface CaptureResult {
  /**
   * Test manifest
   */
  manifest: TestManifest;

  /**
   * Output directory
   */
  outputDir: string;

  /**
   * Manifest file path
   */
  manifestPath: string;

  /**
   * Overall success
   */
  passed: boolean;
}

/**
 * Screenshot Orchestrator
 */
export class ScreenshotOrchestrator {
  private browser?: Browser;
  private page?: Page;
  private executor?: InteractionExecutor;
  private metadataGenerator: MetadataGenerator;
  private baselineManager = getBaselineManager();
  private comparisonEngine = new ComparisonEngine();

  constructor() {
    this.metadataGenerator = new MetadataGenerator();
  }

  /**
   * Capture screenshots for an entire flow
   */
  async captureFlow(
    schema: DrawioUISchema,
    options: CaptureOptions
  ): Promise<CaptureResult> {
    const startTime = Date.now();

    // Initialize browser and page
    await this.initialize(options);

    // Get viewport config
    const viewport = this.resolveViewport(options.viewport);

    // Set viewport
    await this.page!.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    // Navigate to base URL
    await this.page!.goto(options.baseUrl, { waitUntil: 'networkidle' });

    // Get action nodes in execution order
    const actionNodes = this.getActionNodes(schema);

    // Execute interactions and capture screenshots
    const interactions: InteractionResult[] = [];
    let stepNumber = 1;

    for (const node of actionNodes) {
      const result = await this.captureInteraction(
        node,
        stepNumber,
        options,
        viewport
      );
      interactions.push(result);
      stepNumber++;
    }

    // Generate manifest
    const duration = Date.now() - startTime;
    const manifest = this.metadataGenerator.generateManifest(
      schema.metadata.sourceFile || 'unknown',
      interactions,
      duration
    );

    // Save manifest
    const manifestPath = await this.saveManifest(manifest, options.outputDir);

    // Cleanup
    await this.cleanup();

    return {
      manifest,
      outputDir: options.outputDir,
      manifestPath,
      passed: manifest.passed,
    };
  }

  /**
   * Capture screenshots for a single interaction
   */
  private async captureInteraction(
    node: DrawioNode,
    stepNumber: number,
    options: CaptureOptions,
    viewport: ViewportConfig
  ): Promise<InteractionResult> {
    const startTime = Date.now();
    const screenshots: ScreenshotMetadata[] = [];

    try {
      // Determine capture timing
      const captureAt = node.screenshotConfig?.captureAt || 'both';

      // Capture before (if needed)
      if (captureAt === 'before' || captureAt === 'both') {
        const beforeScreenshot = await this.captureScreenshot(
          node,
          stepNumber,
          'before',
          options,
          viewport
        );
        screenshots.push(beforeScreenshot);
      }

      // Execute interaction
      await this.executor!.executeNode(node);

      // Capture after (if needed)
      if (captureAt === 'after' || captureAt === 'both') {
        const afterScreenshot = await this.captureScreenshot(
          node,
          stepNumber,
          'after',
          options,
          viewport
        );
        screenshots.push(afterScreenshot);
      }

      const duration = Date.now() - startTime;

      return this.metadataGenerator.generateInteractionResult(
        node,
        stepNumber,
        true,
        screenshots,
        duration
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return this.metadataGenerator.generateInteractionResult(
        node,
        stepNumber,
        false,
        screenshots,
        duration,
        errorMessage
      );
    }
  }

  /**
   * Capture a single screenshot
   */
  private async captureScreenshot(
    node: DrawioNode,
    stepNumber: number,
    captureAt: 'before' | 'after',
    options: CaptureOptions,
    viewport: ViewportConfig
  ): Promise<ScreenshotMetadata> {
    // Generate filename
    const viewportName = this.getViewportName(viewport);
    const filename = `step-${String(stepNumber).padStart(2, '0')}-${captureAt}-${viewportName}.png`;
    const screenshotPath = path.join(options.outputDir, filename);

    // Ensure directory exists
    if (!fs.existsSync(options.outputDir)) {
      fs.mkdirSync(options.outputDir, { recursive: true });
    }

    // Capture screenshot
    const selector = node.screenshotConfig?.selector;
    if (selector) {
      // Screenshot specific element
      const element = this.page!.locator(selector);
      await element.screenshot({ path: screenshotPath });
    } else {
      // Screenshot full page
      await this.page!.screenshot({ path: screenshotPath, fullPage: true });
    }

    // Generate metadata
    const metadata = this.metadataGenerator.generateScreenshotMetadata(
      node,
      stepNumber,
      filename,
      captureAt,
      viewport
    );

    // Compare with baseline if enabled
    if (options.compareWithBaselines) {
      await this.compareWithBaseline(metadata, screenshotPath, options);
    }

    return metadata;
  }

  /**
   * Compare screenshot with baseline
   */
  private async compareWithBaseline(
    metadata: ScreenshotMetadata,
    screenshotPath: string,
    options: CaptureOptions
  ): Promise<void> {
    const testSuite = 'drawio-flow';
    const screenshotName = path.basename(screenshotPath, '.png');

    // Check if baseline exists
    if (!this.baselineManager.hasBaseline(testSuite, screenshotName)) {
      // Create baseline
      console.log(`Creating baseline: ${screenshotName}`);
      await this.baselineManager.saveBaseline(
        testSuite,
        screenshotName,
        screenshotPath
      );
      metadata.passed = true;
      return;
    }

    // Get baseline path
    const baselinePath = this.baselineManager.getBaselinePath(testSuite, screenshotName);
    metadata.baselinePath = baselinePath;

    // Compare (generate diff in same directory as screenshot)
    const diffPath = screenshotPath.replace(/\.png$/, '-diff.png');
    const result = await this.comparisonEngine.compare(
      baselinePath,
      screenshotPath,
      diffPath,
      {
        threshold: options.threshold || 0.001,
      }
    );

    // Update metadata
    metadata.passed = result.matches;
    metadata.diffPercentage = result.diffPercentage;
    metadata.diffPixels = result.diffPixelCount;

    if (result.diffPath) {
      metadata.diffPath = result.diffPath;
    }

    // Log result
    if (!result.matches) {
      console.warn(
        `Visual regression: ${screenshotName} failed (${result.diffPercentage.toFixed(2)}% diff)`
      );
    }
  }

  /**
   * Initialize browser and page
   */
  private async initialize(options: CaptureOptions): Promise<void> {
    this.browser = await chromium.launch({
      headless: options.headless ?? true,
    });

    const viewport = this.resolveViewport(options.viewport);

    const context = await this.browser.newContext({
      viewport: {
        width: viewport.width,
        height: viewport.height,
      },
      deviceScaleFactor: viewport.deviceScaleFactor,
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
    });

    this.page = await context.newPage();
    this.executor = new InteractionExecutor(this.page, options);
  }

  /**
   * Cleanup browser resources
   */
  private async cleanup(): Promise<void> {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
  }

  /**
   * Resolve viewport configuration
   */
  private resolveViewport(
    viewport?: keyof typeof VIEWPORT_PRESETS | ViewportConfig
  ): ViewportConfig {
    if (!viewport) {
      return VIEWPORT_PRESETS.desktop;
    }

    if (typeof viewport === 'string') {
      return VIEWPORT_PRESETS[viewport];
    }

    return viewport;
  }

  /**
   * Get viewport name for filename
   */
  private getViewportName(viewport: ViewportConfig): string {
    // Check if it matches a preset
    for (const [name, preset] of Object.entries(VIEWPORT_PRESETS)) {
      if (
        preset.width === viewport.width &&
        preset.height === viewport.height
      ) {
        return name;
      }
    }

    // Custom viewport
    return `${viewport.width}x${viewport.height}`;
  }

  /**
   * Get action nodes in execution order
   */
  private getActionNodes(schema: DrawioUISchema): DrawioNode[] {
    // Get all nodes that have interactions or are marked for screenshots
    return schema.nodes.filter(
      (n) =>
        (n.type === 'action' && n.interaction) ||
        (n.type === 'state' && n.screenshotConfig) ||
        n.type === 'screenshot'
    );
  }

  /**
   * Save manifest to file
   */
  private async saveManifest(
    manifest: TestManifest,
    outputDir: string
  ): Promise<string> {
    const manifestPath = path.join(outputDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`Manifest saved: ${manifestPath}`);
    return manifestPath;
  }
}

/**
 * Utility function to capture a flow
 */
export async function captureFlow(
  schema: DrawioUISchema,
  options: CaptureOptions
): Promise<CaptureResult> {
  const orchestrator = new ScreenshotOrchestrator();
  return orchestrator.captureFlow(schema, options);
}
