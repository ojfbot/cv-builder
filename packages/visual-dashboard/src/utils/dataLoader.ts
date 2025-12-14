/**
 * Data loader utilities for fetching test data
 */

import type { TestIndex, TestManifest } from '../types';

const BASE_PATH = '/data';

export async function loadTestIndex(): Promise<TestIndex> {
  const response = await fetch(`${BASE_PATH}/index.json`);
  if (!response.ok) {
    throw new Error(`Failed to load test index: ${response.statusText}`);
  }
  return response.json();
}

export async function loadManifest(manifestPath: string): Promise<TestManifest> {
  const response = await fetch(`${BASE_PATH}/${manifestPath}`);
  if (!response.ok) {
    throw new Error(`Failed to load manifest: ${response.statusText}`);
  }
  return response.json();
}

export async function loadDiagram(diagramPath: string): Promise<string> {
  const response = await fetch(`${BASE_PATH}/${diagramPath}`);
  if (!response.ok) {
    throw new Error(`Failed to load diagram: ${response.statusText}`);
  }
  return response.text();
}

export function getScreenshotUrl(screenshotPath: string, manifestPath?: string): string {
  // If screenshot path is absolute (contains '/'), use it directly
  if (screenshotPath.includes('/')) {
    return `${BASE_PATH}/${screenshotPath}`;
  }

  // Otherwise, construct path based on manifest location
  if (manifestPath) {
    // Extract directory from manifest path (e.g., "manifests/capture-test/manifest.json" -> "capture-test")
    const dir = manifestPath.replace('manifests/', '').replace('/manifest.json', '');
    return `${BASE_PATH}/screenshots/${dir}/${screenshotPath}`;
  }

  // Fallback to direct path
  return `${BASE_PATH}/${screenshotPath}`;
}
