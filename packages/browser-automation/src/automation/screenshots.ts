/**
 * Screenshot Utilities
 *
 * Manages screenshot capture and file organization.
 */

import { Page } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = process.env.SCREENSHOTS_DIR || '/app/screenshots';

export interface ScreenshotOptions {
  name: string;
  fullPage?: boolean;
  selector?: string;
  path?: string;
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

  const sessionDir = options.path || await createSessionDir();
  const timestamp = new Date().toISOString();
  const filename = `${options.name}.png`;
  const filepath = path.join(sessionDir, filename);

  console.log(`Capturing screenshot: ${filepath}`);

  // Capture full page screenshot
  if (options.fullPage || !options.selector) {
    await page.screenshot({
      path: filepath,
      fullPage: options.fullPage !== false,
    });
  }
  // Capture element screenshot
  else if (options.selector) {
    const element = page.locator(options.selector).first();
    const exists = await element.count() > 0;

    if (!exists) {
      throw new Error(`Element not found: ${options.selector}`);
    }

    await element.screenshot({
      path: filepath,
    });
  }

  // Get file stats
  const stats = await fs.stat(filepath);

  console.log(`Screenshot saved: ${filepath} (${stats.size} bytes)`);

  return {
    success: true,
    path: filepath,
    filename,
    timestamp,
    url: page.url(),
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
