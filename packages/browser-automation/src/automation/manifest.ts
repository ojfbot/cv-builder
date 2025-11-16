/**
 * Screenshot Manifest Management
 *
 * Tracks screenshot metadata in manifest.json files
 */

import fs from 'fs';
import path from 'path';

export interface ScreenshotEntry {
  filename: string;
  path: string;
  timestamp: string;
  fileSize: number;
  viewport?: string;
  format: string;
  githubUrl?: string;
}

export interface ScreenshotManifest {
  sessionId: string;
  created: string;
  screenshots: ScreenshotEntry[];
  metadata: {
    purpose?: string;
    prNumber?: number;
    issueNumber?: number;
    testName?: string;
    uploadedAt?: string;
  };
}

/**
 * Update manifest.json with new screenshot
 */
export async function updateManifest(
  sessionDir: string,
  screenshot: {
    filename: string;
    path: string;
    fileSize: number;
    viewport?: string;
    format: string;
  }
): Promise<void> {
  const manifestPath = path.join(sessionDir, 'manifest.json');

  let manifest: ScreenshotManifest;

  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } else {
    manifest = {
      sessionId: path.basename(sessionDir),
      created: new Date().toISOString(),
      screenshots: [],
      metadata: {},
    };
  }

  // Add new screenshot
  manifest.screenshots.push({
    ...screenshot,
    timestamp: new Date().toISOString(),
  });

  // Write manifest
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Updated manifest: ${manifestPath}`);
}

/**
 * Update manifest with GitHub URLs after upload
 */
export async function updateManifestWithGitHubUrls(
  sessionDir: string,
  urlMapping: { filename: string; githubUrl: string }[],
  prOrIssueNumber?: number,
  type?: 'pr' | 'issue'
): Promise<void> {
  const manifestPath = path.join(sessionDir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.warn(`Manifest not found: ${manifestPath}`);
    return;
  }

  const manifest: ScreenshotManifest = JSON.parse(
    fs.readFileSync(manifestPath, 'utf-8')
  );

  // Update screenshots with GitHub URLs
  urlMapping.forEach((mapping) => {
    const screenshot = manifest.screenshots.find(
      (s) => s.filename === mapping.filename
    );
    if (screenshot) {
      screenshot.githubUrl = mapping.githubUrl;
    }
  });

  // Update metadata
  if (prOrIssueNumber && type === 'pr') {
    manifest.metadata.prNumber = prOrIssueNumber;
  } else if (prOrIssueNumber && type === 'issue') {
    manifest.metadata.issueNumber = prOrIssueNumber;
  }
  manifest.metadata.uploadedAt = new Date().toISOString();

  // Write updated manifest
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Updated manifest with GitHub URLs: ${manifestPath}`);
}

/**
 * Get manifest from session directory
 */
export function getManifest(sessionDir: string): ScreenshotManifest | null {
  const manifestPath = path.join(sessionDir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
}
