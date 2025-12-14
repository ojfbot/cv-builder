/**
 * Data loader utilities for fetching test data
 */

import type { TestIndex, TestManifest } from '../types';

const BASE_PATH = import.meta.env.BASE_URL ? `${import.meta.env.BASE_URL}data` : '/data';

/**
 * Sanitize file path to prevent directory traversal attacks
 * Removes ../ and ..\ sequences and normalizes the path
 */
function sanitizePath(path: string): string {
  // Remove any ../ or ..\ sequences
  let sanitized = path.replace(/\.\.[/\\]/g, '');

  // Remove leading slashes to prevent absolute path access
  sanitized = sanitized.replace(/^[/\\]+/, '');

  // Normalize multiple slashes
  sanitized = sanitized.replace(/[/\\]+/g, '/');

  return sanitized;
}

export async function loadTestIndex(): Promise<TestIndex> {
  const response = await fetch(`${BASE_PATH}/index.json`);
  if (!response.ok) {
    throw new Error(`Failed to load test index: ${response.statusText}`);
  }
  return response.json();
}

export async function loadManifest(manifestPath: string): Promise<TestManifest> {
  const sanitized = sanitizePath(manifestPath);
  const response = await fetch(`${BASE_PATH}/${sanitized}`);
  if (!response.ok) {
    throw new Error(`Failed to load manifest: ${response.statusText}`);
  }
  return response.json();
}

export async function loadDiagram(diagramPath: string): Promise<string> {
  const sanitized = sanitizePath(diagramPath);
  const response = await fetch(`${BASE_PATH}/${sanitized}`);
  if (!response.ok) {
    throw new Error(`Failed to load diagram: ${response.statusText}`);
  }
  return response.text();
}

export function getScreenshotUrl(screenshotPath: string, manifestPath?: string): string {
  // Sanitize inputs
  const sanitizedScreenshot = sanitizePath(screenshotPath);
  const sanitizedManifest = manifestPath ? sanitizePath(manifestPath) : undefined;

  // If screenshot path is absolute (contains '/'), use it directly
  if (sanitizedScreenshot.includes('/')) {
    return `${BASE_PATH}/${sanitizedScreenshot}`;
  }

  // Otherwise, construct path based on manifest location
  if (sanitizedManifest) {
    // Extract directory from manifest path (e.g., "manifests/capture-test/manifest.json" -> "capture-test")
    const dir = sanitizedManifest.replace('manifests/', '').replace('/manifest.json', '');
    return `${BASE_PATH}/screenshots/${dir}/${sanitizedScreenshot}`;
  }

  // Fallback to direct path
  return `${BASE_PATH}/${sanitizedScreenshot}`;
}
