/**
 * Screenshot Embedder
 *
 * Embeds screenshots into Draw.io diagrams based on test manifest metadata.
 * Creates self-documenting visual regression test artifacts.
 */

import fs from 'fs';
import path from 'path';
import { Document, Element } from '@xmldom/xmldom';
import { DrawioXMLManipulator, Position } from './xml-manipulator.js';
import { TestManifest, ScreenshotMetadata } from './metadata.js';

/**
 * Embedding options
 */
export interface EmbedOptions {
  /**
   * Source Draw.io file path
   */
  sourceFile: string;

  /**
   * Test manifest with screenshot metadata
   */
  manifest: TestManifest;

  /**
   * Screenshot directory (containing actual PNG files)
   */
  screenshotDir: string;

  /**
   * Output file path for extended diagram
   */
  outputFile: string;

  /**
   * Whether to include metadata annotations
   */
  includeAnnotations?: boolean;

  /**
   * Image placement: 'right' | 'below'
   */
  imagePlacement?: 'right' | 'below';

  /**
   * Scale factor for images (1.0 = full size)
   */
  imageScale?: number;
}

/**
 * Embedding result
 */
export interface EmbedResult {
  /**
   * Path to generated extended diagram
   */
  outputFile: string;

  /**
   * Number of screenshots embedded
   */
  screenshotsEmbedded: number;

  /**
   * Number of annotations added
   */
  annotationsAdded: number;

  /**
   * File size in bytes
   */
  fileSize: number;

  /**
   * Whether Git LFS is recommended (file > 50MB)
   */
  recommendGitLFS: boolean;

  /**
   * Any warnings during embedding
   */
  warnings: string[];
}

/**
 * Screenshot Embedder
 */
export class ScreenshotEmbedder {
  private manipulator: DrawioXMLManipulator;

  constructor() {
    this.manipulator = new DrawioXMLManipulator();
  }

  /**
   * Embed screenshots into Draw.io diagram
   */
  async embed(options: EmbedOptions): Promise<EmbedResult> {
    const warnings: string[] = [];
    let screenshotsEmbedded = 0;
    let annotationsAdded = 0;

    // 1. Read and parse source Draw.io file
    console.log(`📄 Reading source: ${options.sourceFile}`);
    const sourceXML = fs.readFileSync(options.sourceFile, 'utf-8');
    const doc = this.manipulator.parse(sourceXML);

    // Validate structure
    const validation = this.manipulator.validate(doc);
    if (!validation.valid) {
      throw new Error(`Invalid Draw.io file: ${validation.errors.join(', ')}`);
    }

    // 2. Update metadata
    this.manipulator.updateMetadata(doc, {
      modified: new Date().toISOString(),
      version: `${options.manifest.version}-extended`,
    });

    // 3. Process each interaction's screenshots
    console.log(`📸 Embedding screenshots...`);

    for (const interaction of options.manifest.interactions) {
      const nodeId = interaction.node.id;
      const cell = this.manipulator.findCell(doc, nodeId);

      if (!cell) {
        warnings.push(`Could not find cell for node: ${nodeId}`);
        continue;
      }

      // Embed each screenshot for this interaction
      for (let i = 0; i < interaction.screenshots.length; i++) {
        const screenshot = interaction.screenshots[i];

        try {
          await this.embedScreenshot(
            doc,
            cell,
            screenshot,
            options,
            i
          );
          screenshotsEmbedded++;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          warnings.push(`Failed to embed ${screenshot.screenshotPath}: ${msg}`);
        }
      }

      // Add annotation if enabled
      if (options.includeAnnotations) {
        try {
          this.addAnnotation(doc, cell, interaction.node.label, interaction);
          annotationsAdded++;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          warnings.push(`Failed to add annotation for ${nodeId}: ${msg}`);
        }
      }
    }

    // 4. Add summary annotation
    if (options.includeAnnotations) {
      this.addSummaryAnnotation(doc, options.manifest);
      annotationsAdded++;
    }

    // 5. Serialize and save
    console.log(`💾 Saving extended diagram...`);
    const outputXML = this.manipulator.serialize(doc);

    // Ensure output directory exists
    const outputDir = path.dirname(options.outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(options.outputFile, outputXML, 'utf-8');

    // 6. Get file size and check for Git LFS
    const stats = fs.statSync(options.outputFile);
    const fileSizeMB = stats.size / (1024 * 1024);
    const recommendGitLFS = fileSizeMB > 50;

    if (recommendGitLFS) {
      warnings.push(`File size is ${fileSizeMB.toFixed(1)}MB. Consider using Git LFS.`);
    }

    console.log(`✅ Extended diagram saved: ${options.outputFile}`);
    console.log(`   Screenshots embedded: ${screenshotsEmbedded}`);
    console.log(`   Annotations added: ${annotationsAdded}`);
    console.log(`   File size: ${fileSizeMB.toFixed(1)}MB`);

    return {
      outputFile: options.outputFile,
      screenshotsEmbedded,
      annotationsAdded,
      fileSize: stats.size,
      recommendGitLFS,
      warnings,
    };
  }

  /**
   * Embed a single screenshot
   */
  private async embedScreenshot(
    doc: Document,
    originalCell: Element,
    screenshot: ScreenshotMetadata,
    options: EmbedOptions,
    index: number
  ): Promise<void> {
    // Read screenshot file
    const screenshotPath = path.join(options.screenshotDir, screenshot.screenshotPath);

    if (!fs.existsSync(screenshotPath)) {
      throw new Error(`Screenshot not found: ${screenshotPath}`);
    }

    // Convert to base64
    const imageBuffer = fs.readFileSync(screenshotPath);
    const base64Data = imageBuffer.toString('base64');

    // Calculate position
    const placement = options.imagePlacement || 'right';
    const basePosition = this.manipulator.calculateImagePosition(originalCell, placement);

    if (!basePosition) {
      throw new Error('Could not calculate position for image');
    }

    // Offset multiple screenshots vertically
    const offsetY = index * (basePosition.height + 20);
    const position: Position = {
      ...basePosition,
      y: basePosition.y + offsetY,
    };

    // Apply scale
    const scale = options.imageScale || 1.0;
    position.width *= scale;
    position.height *= scale;

    // Generate unique ID
    const imageId = this.manipulator.generateCellId(doc, `screenshot-${screenshot.nodeId}-${screenshot.captureAt}`);

    // Create label with metadata
    const label = [
      `${screenshot.nodeLabel || screenshot.nodeId}`,
      `${screenshot.captureAt.toUpperCase()}`,
      `${screenshot.viewport.width}x${screenshot.viewport.height}`,
      screenshot.passed ? '✓' : '✗',
    ].join(' | ');

    // Create and insert image cell
    const imageCell = this.manipulator.createImageCell(doc, {
      id: imageId,
      base64Data,
      position,
      label,
    });

    this.manipulator.insertCell(doc, imageCell);
  }

  /**
   * Add metadata annotation for a node
   */
  private addAnnotation(
    doc: Document,
    cell: Element,
    label: string,
    interaction: any
  ): void {
    const position = this.manipulator.getCellPosition(cell);
    if (!position) return;

    // Place annotation above the cell
    const annotationPosition: Position = {
      x: position.x,
      y: position.y - 60,
      width: position.width,
      height: 50,
    };

    const annotationText = [
      `Step ${interaction.stepNumber}: ${label}`,
      `Duration: ${interaction.duration}ms`,
      `Success: ${interaction.success ? '✓' : '✗'}`,
    ].join('\n');

    const annotationId = this.manipulator.generateCellId(doc, `annotation-${interaction.node.id}`);

    const annotationCell = this.manipulator.createAnnotationCell(
      doc,
      annotationId,
      annotationText,
      annotationPosition
    );

    this.manipulator.insertCell(doc, annotationCell);
  }

  /**
   * Add summary annotation to diagram
   */
  private addSummaryAnnotation(doc: Document, manifest: TestManifest): void {
    const summaryText = [
      `📊 Test Run Summary`,
      `Generated: ${new Date(manifest.generatedAt).toLocaleString()}`,
      `Git Commit: ${manifest.gitCommit || 'N/A'}`,
      ``,
      `Total Steps: ${manifest.totalSteps}`,
      `Screenshots: ${manifest.screenshotsCaptured}`,
      `Duration: ${manifest.duration}ms`,
      ``,
      `Passed: ${manifest.summary.totalPassed}`,
      `Failed: ${manifest.summary.totalFailed}`,
      `Avg Diff: ${manifest.summary.averageDiffPercentage.toFixed(2)}%`,
      ``,
      `Overall: ${manifest.passed ? '✓ PASSED' : '✗ FAILED'}`,
    ].join('\n');

    const summaryPosition: Position = {
      x: 50,
      y: 50,
      width: 300,
      height: 250,
    };

    const summaryId = this.manipulator.generateCellId(doc, 'test-summary');

    const summaryCell = this.manipulator.createAnnotationCell(
      doc,
      summaryId,
      summaryText,
      summaryPosition
    );

    this.manipulator.insertCell(doc, summaryCell);
  }

  /**
   * Generate output filename with timestamp
   */
  static generateOutputFilename(sourceFile: string, outputDir: string): string {
    const basename = path.basename(sourceFile, '.drawio');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    return path.join(outputDir, `${basename}-extended-${timestamp}.drawio`);
  }

  /**
   * Check if Git LFS is available
   */
  static async checkGitLFS(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('git lfs version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initialize Git LFS for a file
   */
  static async initGitLFS(pattern: string = '*.drawio'): Promise<void> {
    try {
      const { execSync } = await import('child_process');
      execSync(`git lfs track "${pattern}"`, { stdio: 'inherit' });
      console.log(`✓ Git LFS tracking enabled for ${pattern}`);
    } catch (error) {
      throw new Error(`Failed to initialize Git LFS: ${error}`);
    }
  }
}

/**
 * Utility function to embed screenshots
 */
export async function embedScreenshots(options: EmbedOptions): Promise<EmbedResult> {
  const embedder = new ScreenshotEmbedder();
  return embedder.embed(options);
}
