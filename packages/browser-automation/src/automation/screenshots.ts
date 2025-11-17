/**
 * Screenshot Utilities
 *
 * Manages screenshot capture and file organization.
 */

import { Page } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ViewportSize, ViewportPreset, getViewport, getViewportSuffix } from './viewport.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find project root (where package.json is) to ensure consistent paths
function findProjectRoot(): string {
  let currentDir = __dirname;
  while (currentDir !== path.parse(currentDir).root) {
    try {
      const packageJsonPath = path.join(currentDir, 'package.json');
      if (require('fs').existsSync(packageJsonPath)) {
        const pkg = JSON.parse(require('fs').readFileSync(packageJsonPath, 'utf-8'));
        // Look for workspace root or browser-automation package
        if (pkg.workspaces || pkg.name === '@cv-builder/browser-automation') {
          // If this is browser-automation package, go up 2 levels to monorepo root
          if (pkg.name === '@cv-builder/browser-automation') {
            return path.resolve(currentDir, '../..');
          }
          return currentDir;
        }
      }
    } catch {}
    currentDir = path.dirname(currentDir);
  }
  // Fallback to 3 levels up from src/automation/
  return path.resolve(__dirname, '../../..');
}

const PROJECT_ROOT = findProjectRoot();
const SCREENSHOTS_DIR = process.env.SCREENSHOTS_DIR
  ? path.isAbsolute(process.env.SCREENSHOTS_DIR)
    ? process.env.SCREENSHOTS_DIR
    : path.join(PROJECT_ROOT, process.env.SCREENSHOTS_DIR)
  : path.join(PROJECT_ROOT, 'temp/screenshots');

export type ImageFormat = 'png' | 'jpeg';

export interface ScreenshotOptions {
  name: string;
  fullPage?: boolean;
  selector?: string;
  path?: string;
  viewport?: ViewportPreset | ViewportSize;
  format?: ImageFormat;
  quality?: number; // 0-100, only for JPEG
}

export interface ScreenshotResult {
  success: boolean;
  path: string;
  filename: string;
  timestamp: string;
  url: string;
  dimensions?: {
    width: number;
    height: number;
  };
  viewport?: ViewportSize;
  format?: ImageFormat;
  fileSize?: number;
}

/**
 * Create session directory with timestamp
 */
export async function createSessionDir(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const sessionDir = path.join(SCREENSHOTS_DIR, timestamp);

  await fs.mkdir(sessionDir, { recursive: true });

  return sessionDir;
}

/**
 * Ensure screenshots base directory exists
 */
export async function ensureScreenshotsDir(): Promise<void> {
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
}

/**
 * Capture screenshot
 */
export async function captureScreenshot(
  page: Page,
  options: ScreenshotOptions
): Promise<ScreenshotResult> {
  await ensureScreenshotsDir();

  // Resolve custom path to absolute if provided
  let sessionDir: string;
  if (options.path) {
    sessionDir = path.isAbsolute(options.path)
      ? options.path
      : path.join(PROJECT_ROOT, options.path);
    // Ensure custom directory exists
    await fs.mkdir(sessionDir, { recursive: true });
  } else {
    sessionDir = await createSessionDir();
  }

  const timestamp = new Date().toISOString();

  // Determine file format
  const format = options.format || 'png';
  const extension = format === 'jpeg' ? 'jpg' : 'png';

  // Add viewport suffix if provided
  const viewportSuffix = options.viewport ? getViewportSuffix(options.viewport) : '';
  const filename = `${options.name}${viewportSuffix}.${extension}`;
  const filepath = path.join(sessionDir, filename);

  console.log(`Capturing screenshot: ${filepath}`);

  // Set viewport if provided
  let currentViewport: ViewportSize | undefined;
  if (options.viewport) {
    currentViewport = getViewport(options.viewport);
    await page.setViewportSize({
      width: currentViewport.width,
      height: currentViewport.height,
    });
    console.log(`  Viewport: ${currentViewport.width}x${currentViewport.height}`);
  }

  // Build screenshot options
  const screenshotOpts: any = {
    path: filepath,
    type: format,
  };

  if (format === 'jpeg' && options.quality !== undefined) {
    screenshotOpts.quality = Math.max(0, Math.min(100, options.quality));
  }

  // Capture full page screenshot
  if (options.fullPage || !options.selector) {
    screenshotOpts.fullPage = options.fullPage !== false;
    await page.screenshot(screenshotOpts);
  }
  // Capture element screenshot
  else if (options.selector) {
    const element = page.locator(options.selector).first();
    const exists = await element.count() > 0;

    if (!exists) {
      throw new Error(`Element not found: ${options.selector}`);
    }

    await element.screenshot(screenshotOpts);
  }

  // Get file stats
  const stats = await fs.stat(filepath);

  console.log(`Screenshot saved: ${filepath} (${stats.size} bytes)`);

  // Update manifest
  try {
    const { updateManifest } = await import('./manifest.js');
    await updateManifest(sessionDir, {
      filename,
      path: filepath,
      fileSize: stats.size,
      viewport: viewportSuffix.substring(1) || undefined, // Remove leading dash
      format,
    });
  } catch (error) {
    console.error('Failed to update manifest:', error);
  }

  return {
    success: true,
    path: filepath,
    filename,
    timestamp,
    url: page.url(),
    viewport: currentViewport,
    format,
    fileSize: stats.size,
  };
}

/**
 * Get list of screenshot sessions
 */
export async function listSessions(): Promise<string[]> {
  try {
    await ensureScreenshotsDir();
    const entries = await fs.readdir(SCREENSHOTS_DIR, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort()
      .reverse(); // Most recent first
  } catch (error) {
    console.error('Error listing sessions:', error);
    return [];
  }
}

/**
 * Get screenshots in a session
 */
export async function listScreenshotsInSession(sessionId: string): Promise<string[]> {
  try {
    const sessionDir = path.join(SCREENSHOTS_DIR, sessionId);
    const entries = await fs.readdir(sessionDir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.png'))
      .map(entry => entry.name);
  } catch (error) {
    console.error(`Error listing screenshots in session ${sessionId}:`, error);
    return [];
  }
}

/**
 * Create manifest file for session
 */
export async function createManifest(
  sessionDir: string,
  screenshots: ScreenshotResult[]
): Promise<void> {
  const manifestPath = path.join(sessionDir, 'manifest.json');

  const manifest = {
    created: new Date().toISOString(),
    screenshots: screenshots.map(s => ({
      filename: s.filename,
      timestamp: s.timestamp,
      url: s.url,
      path: s.path,
    })),
    count: screenshots.length,
  };

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`Manifest created: ${manifestPath}`);
}
