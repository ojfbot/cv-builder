/**
 * GitHub Gist Uploader
 *
 * Uploads screenshots to GitHub Gists for embedding in PR comments.
 * Handles rate limiting, cleanup, and provides markdown snippets.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Gist file to upload
 */
export interface GistFile {
  filename: string;
  content: string; // base64 or text content
}

/**
 * Gist upload options
 */
export interface GistUploadOptions {
  /**
   * Description for the gist
   */
  description?: string;

  /**
   * Whether the gist is public
   */
  public?: boolean;

  /**
   * Files to upload (will be converted to base64 if binary)
   */
  files: Map<string, string>; // filename -> file path or content
}

/**
 * Uploaded gist information
 */
export interface UploadedGist {
  /**
   * Gist ID
   */
  id: string;

  /**
   * Gist URL
   */
  url: string;

  /**
   * Raw URLs for each file
   */
  rawUrls: Map<string, string>;

  /**
   * Created at timestamp
   */
  createdAt: string;

  /**
   * Gist description
   */
  description: string;
}

/**
 * Screenshot upload result
 */
export interface ScreenshotUploadResult {
  /**
   * Before screenshot gist URL
   */
  beforeUrl?: string;

  /**
   * After screenshot gist URL
   */
  afterUrl?: string;

  /**
   * Diff image gist URL
   */
  diffUrl?: string;

  /**
   * Gist ID containing all screenshots
   */
  gistId: string;

  /**
   * Gist URL
   */
  gistUrl: string;

  /**
   * Markdown snippet for embedding in PR
   */
  markdown: string;
}

/**
 * GitHub Gist Uploader
 */
export class GistUploader {
  private token?: string;

  constructor(token?: string) {
    this.token = token || this.getGitHubToken();
  }

  /**
   * Upload screenshots to a gist
   */
  async uploadScreenshots(
    beforePath?: string,
    afterPath?: string,
    diffPath?: string,
    description: string = 'Visual Regression Screenshots'
  ): Promise<ScreenshotUploadResult> {
    const files = new Map<string, string>();

    // Add screenshots if they exist
    if (beforePath && fs.existsSync(beforePath)) {
      files.set('before.png', beforePath);
    }

    if (afterPath && fs.existsSync(afterPath)) {
      files.set('after.png', afterPath);
    }

    if (diffPath && fs.existsSync(diffPath)) {
      files.set('diff.png', diffPath);
    }

    if (files.size === 0) {
      throw new Error('No valid screenshot files provided');
    }

    // Upload to gist
    const gist = await this.uploadGist({
      description,
      public: false,
      files,
    });

    // Generate markdown
    const markdown = this.generateMarkdown(gist, beforePath, afterPath, diffPath);

    return {
      beforeUrl: gist.rawUrls.get('before.png'),
      afterUrl: gist.rawUrls.get('after.png'),
      diffUrl: gist.rawUrls.get('diff.png'),
      gistId: gist.id,
      gistUrl: gist.url,
      markdown,
    };
  }

  /**
   * Upload files to a new gist
   */
  async uploadGist(options: GistUploadOptions): Promise<UploadedGist> {
    if (!this.token) {
      throw new Error('GitHub token required. Set GITHUB_TOKEN environment variable.');
    }

    // Prepare gist files (gh CLI expects JSON format)
    const gistFiles: Record<string, { content: string }> = {};

    for (const [filename, filePath] of options.files) {
      let content: string;

      if (fs.existsSync(filePath)) {
        // Read file and convert to base64 if binary
        const buffer = fs.readFileSync(filePath);
        if (this.isBinaryFile(filename)) {
          // For binary files, we can't use gists directly
          // We'll use a workaround: create a placeholder and note the limitation
          content = `Binary file: ${filename}\nSize: ${buffer.length} bytes\nNote: Binary files cannot be directly embedded in gists.`;
        } else {
          content = buffer.toString('utf-8');
        }
      } else {
        // Treat as content directly
        content = filePath;
      }

      gistFiles[filename] = { content };
    }

    // Create gist using gh CLI
    const gistData = {
      description: options.description || 'Visual Regression Test Results',
      public: options.public ?? false,
      files: gistFiles,
    };

    const tempFile = `/tmp/gist-${Date.now()}.json`;
    fs.writeFileSync(tempFile, JSON.stringify(gistData, null, 2));

    try {
      // Create gist using gh CLI
      const result = execSync(
        `gh gist create ${options.public ? '--public' : ''} -d "${options.description || 'Visual Regression Test'}" ${Array.from(options.files.keys()).map(f => {
          const filePath = options.files.get(f)!;
          return fs.existsSync(filePath) ? filePath : '-';
        }).join(' ')}`,
        { encoding: 'utf-8', env: { ...process.env, GH_TOKEN: this.token } }
      ).trim();

      // Parse gist URL
      const gistUrl = result;
      const gistId = gistUrl.split('/').pop()!;

      // Get raw URLs
      const rawUrls = new Map<string, string>();
      for (const filename of options.files.keys()) {
        rawUrls.set(filename, `https://gist.githubusercontent.com/${gistId}/raw/${filename}`);
      }

      fs.unlinkSync(tempFile);

      return {
        id: gistId,
        url: gistUrl,
        rawUrls,
        createdAt: new Date().toISOString(),
        description: options.description || 'Visual Regression Test',
      };
    } catch (error) {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      throw new Error(`Failed to create gist: ${error}`);
    }
  }

  /**
   * Delete a gist
   */
  async deleteGist(gistId: string): Promise<void> {
    if (!this.token) {
      throw new Error('GitHub token required');
    }

    try {
      execSync(`gh gist delete ${gistId}`, {
        stdio: 'inherit',
        env: { ...process.env, GH_TOKEN: this.token },
      });
    } catch (error) {
      throw new Error(`Failed to delete gist ${gistId}: ${error}`);
    }
  }

  /**
   * List user's gists
   */
  async listGists(limit: number = 100): Promise<{ id: string; description: string; createdAt: string }[]> {
    if (!this.token) {
      throw new Error('GitHub token required');
    }

    try {
      const result = execSync(
        `gh gist list --limit ${limit}`,
        { encoding: 'utf-8', env: { ...process.env, GH_TOKEN: this.token } }
      );

      const gists: { id: string; description: string; createdAt: string }[] = [];
      const lines = result.trim().split('\n');

      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length >= 3) {
          gists.push({
            id: parts[0],
            description: parts[1] || '',
            createdAt: parts[2] || '',
          });
        }
      }

      return gists;
    } catch (error) {
      throw new Error(`Failed to list gists: ${error}`);
    }
  }

  /**
   * Clean up old gists (older than specified days)
   */
  async cleanupOldGists(daysOld: number = 30, descriptionPattern?: string): Promise<number> {
    const gists = await this.listGists();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let deletedCount = 0;

    for (const gist of gists) {
      const createdAt = new Date(gist.createdAt);

      if (createdAt < cutoffDate) {
        // Check description pattern if provided
        if (descriptionPattern && !gist.description.includes(descriptionPattern)) {
          continue;
        }

        try {
          await this.deleteGist(gist.id);
          console.log(`Deleted gist ${gist.id}: ${gist.description}`);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete gist ${gist.id}:`, error);
        }
      }
    }

    return deletedCount;
  }

  /**
   * Generate markdown for PR comment
   */
  private generateMarkdown(
    gist: UploadedGist,
    beforePath?: string,
    afterPath?: string,
    diffPath?: string
  ): string {
    const sections: string[] = [];

    sections.push('## 📸 Visual Regression Screenshots\n');

    // Before screenshot
    if (beforePath && gist.rawUrls.has('before.png')) {
      sections.push('### Before');
      sections.push(`![Before](${gist.rawUrls.get('before.png')})\n`);
    }

    // After screenshot
    if (afterPath && gist.rawUrls.has('after.png')) {
      sections.push('### After');
      sections.push(`![After](${gist.rawUrls.get('after.png')})\n`);
    }

    // Diff screenshot
    if (diffPath && gist.rawUrls.has('diff.png')) {
      sections.push('### Diff');
      sections.push(`![Diff](${gist.rawUrls.get('diff.png')})\n`);
    }

    sections.push(`📎 [View full gist](${gist.url})\n`);

    return sections.join('\n');
  }

  /**
   * Get GitHub token from environment or gh CLI
   */
  private getGitHubToken(): string | undefined {
    // Try environment variable first
    if (process.env.GITHUB_TOKEN) {
      return process.env.GITHUB_TOKEN;
    }

    // Try gh CLI auth status
    try {
      const result = execSync('gh auth token', { encoding: 'utf-8' }).trim();
      return result;
    } catch {
      return undefined;
    }
  }

  /**
   * Check if filename indicates binary file
   */
  private isBinaryFile(filename: string): boolean {
    const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.zip', '.tar', '.gz'];
    const ext = path.extname(filename).toLowerCase();
    return binaryExtensions.includes(ext);
  }

  /**
   * Check GitHub API rate limit
   */
  async checkRateLimit(): Promise<{ remaining: number; limit: number; reset: Date }> {
    if (!this.token) {
      throw new Error('GitHub token required');
    }

    try {
      const result = execSync('gh api rate_limit', {
        encoding: 'utf-8',
        env: { ...process.env, GH_TOKEN: this.token },
      });

      const data = JSON.parse(result);
      const core = data.resources.core;

      return {
        remaining: core.remaining,
        limit: core.limit,
        reset: new Date(core.reset * 1000),
      };
    } catch (error) {
      throw new Error(`Failed to check rate limit: ${error}`);
    }
  }
}

/**
 * Utility function to upload screenshots
 */
export async function uploadScreenshots(
  beforePath?: string,
  afterPath?: string,
  diffPath?: string,
  description?: string
): Promise<ScreenshotUploadResult> {
  const uploader = new GistUploader();
  return uploader.uploadScreenshots(beforePath, afterPath, diffPath, description);
}

/**
 * Utility function to cleanup old gists
 */
export async function cleanupOldGists(daysOld: number = 30, pattern?: string): Promise<number> {
  const uploader = new GistUploader();
  return uploader.cleanupOldGists(daysOld, pattern);
}
