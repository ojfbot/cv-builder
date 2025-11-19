#!/usr/bin/env tsx

/**
 * Upload screenshots to GitHub PR/Issue comment
 *
 * Refactored to use @octokit/rest instead of gh CLI for GitHub API operations.
 * Git operations (add, commit, push) still use shell commands for simplicity.
 *
 * Usage:
 *   tsx upload-screenshots.ts <pr-or-issue-number> <type> [screenshot-dir]
 *   tsx upload-screenshots.ts 21 pr auto-detect
 *   tsx upload-screenshots.ts 42 issue temp/screenshots/session-123
 */

import { getGitHubClient } from '../../../packages/browser-automation/src/github/client.js';
import {
  getRepoInfo,
  getCurrentBranch,
  getCommitSha,
  commitAndPush,
  hasUncommittedChanges,
} from '../../../packages/browser-automation/src/github/utils.js';
import fs from 'fs';
import path from 'path';

interface ScreenshotMetadata {
  filename: string;
  captureTime: string;
  fileSize: number;
  sessionDir: string;
  context: {
    what: string;
    why: string;
    when: string;
  };
}

interface CopiedImage extends ScreenshotMetadata {
  original: string;
  dest: string;
}

/**
 * Auto-detect screenshot directories by searching common locations
 */
function autoDetectScreenshotDirs(): Array<{ path: string; name: string; mtime: Date }> {
  const searchLocations = [
    'packages/browser-automation/temp/screenshots',
    'packages/browser-automation/docs/screenshots',
    'temp/screenshots',
    'docs/screenshots',
  ];

  const foundDirs: Array<{ path: string; name: string; mtime: Date }> = [];

  for (const location of searchLocations) {
    if (!fs.existsSync(location)) continue;

    const entries = fs.readdirSync(location, { withFileTypes: true });

    // Check subdirectories for images
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(location, entry.name);
        const hasImages = fs.readdirSync(fullPath).some((file) =>
          ['.png', '.jpg', '.jpeg', '.gif'].includes(path.extname(file).toLowerCase())
        );

        if (hasImages) {
          const stats = fs.statSync(fullPath);
          foundDirs.push({
            path: fullPath,
            name: entry.name,
            mtime: stats.mtime,
          });
        }
      }
    }

    // Also check if the location itself has images
    const hasImages = fs.readdirSync(location).some((file) =>
      ['.png', '.jpg', '.jpeg', '.gif'].includes(path.extname(file).toLowerCase())
    );

    if (hasImages) {
      const stats = fs.statSync(location);
      foundDirs.push({
        path: location,
        name: path.basename(location),
        mtime: stats.mtime,
      });
    }
  }

  // Sort by modification time, most recent first
  foundDirs.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  return foundDirs;
}

/**
 * Find all image files recursively in directory
 */
function findImages(dir: string): string[] {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif'];
  const files: string[] = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...findImages(fullPath));
    } else if (imageExtensions.includes(path.extname(item.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Extract metadata from screenshot file
 */
function extractMetadata(imgPath: string): Omit<ScreenshotMetadata, 'context'> {
  const filename = path.basename(imgPath);
  const stats = fs.statSync(imgPath);
  const sessionDir = path.basename(path.dirname(imgPath));

  // Parse timestamp from session directory (format: 2025-11-16T07-29-46)
  const timestampMatch = sessionDir.match(/(\d{4}-\d{2}-\d{2})T(\d{2}-\d{2}-\d{2})/);
  const captureTime = timestampMatch
    ? `${timestampMatch[1]} ${timestampMatch[2].replace(/-/g, ':')}`
    : new Date(stats.mtime).toISOString().replace('T', ' ').substring(0, 19);

  return {
    filename,
    captureTime,
    fileSize: stats.size,
    sessionDir,
  };
}

/**
 * Generate context based on filename patterns
 */
function generateContext(filename: string): { what: string; why: string; when: string } {
  const name = filename.toLowerCase();

  if (name.includes('dashboard')) {
    return {
      what: 'Complete dashboard interface showing all navigation tabs and main interactive area',
      why: 'Demonstrates the full application layout and primary user interface',
      when: 'Captured during integration testing of browser automation API',
    };
  } else if (name.includes('header')) {
    return {
      what: 'Navigation header with tabs and controls',
      why: 'Shows element-specific screenshot capability (targeting specific components)',
      when: 'Captured to demonstrate selector-based screenshot feature',
    };
  } else if (name.includes('example') && name.includes('homepage')) {
    return {
      what: 'Example.com homepage - standard test page',
      why: 'Validates full-page screenshot functionality with a known stable page',
      when: 'Captured during basic workflow testing',
    };
  } else if (name.includes('example') && name.includes('h1')) {
    return {
      what: 'H1 element from Example.com page',
      why: 'Demonstrates element-specific screenshot by CSS selector',
      when: 'Captured to validate element querying and isolated screenshot capture',
    };
  } else if (name.includes('error') || name.includes('fail')) {
    return {
      what: 'Error state or failure condition',
      why: 'Documents issue or bug for debugging purposes',
      when: 'Captured when error condition occurred',
    };
  } else if (name.includes('test')) {
    return {
      what: 'Test execution result or test interface',
      why: 'Documents test results or validates test functionality',
      when: 'Captured during automated test run',
    };
  } else if (name.includes('before') || name.includes('after')) {
    return {
      what: name.includes('before') ? 'State before changes' : 'State after changes',
      why: 'Visual comparison for change validation',
      when: 'Captured for visual regression testing',
    };
  } else {
    return {
      what: 'Screenshot captured during development',
      why: 'Documents visual state or behavior',
      when: 'Captured during testing or development',
    };
  }
}

/**
 * Generate markdown comment with screenshots
 */
function generateCommentMarkdown(
  copiedImages: CopiedImage[],
  owner: string,
  repo: string,
  commitSha: string,
  targetNumber: number,
  currentBranch: string,
  screenshotDir: string,
  prTempDir: string
): string {
  let markdown = '## 📸 Screenshots - Browser Automation in Action\n\n';
  markdown += 'The automation service successfully captured these screenshots during development and testing.\n\n';
  markdown += '---\n\n';

  for (const img of copiedImages) {
    const relPath = path.relative(process.cwd(), img.dest);
    // CRITICAL: Use commit SHA (not branch) for permanent URLs
    const blobUrl = `https://github.com/${owner}/${repo}/blob/${commitSha}/${relPath}?raw=true`;
    const title = img.filename
      .replace(/-/g, ' ')
      .replace(/\.(png|jpg|jpeg|gif)$/i, '')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    markdown += `### ${title}\n\n`;
    markdown += `![${title}](${blobUrl})\n\n`;

    // Add context metadata
    markdown += `**📋 What:** ${img.context.what}\n\n`;
    markdown += `**💡 Why:** ${img.context.why}\n\n`;
    markdown += `**⏰ When:** ${img.context.when}\n\n`;
    markdown += `**📅 Captured:** ${img.captureTime}\n`;
    markdown += ` | **💾 Size:** ${(img.fileSize / 1024).toFixed(1)} KB\n`;
    markdown += ` | **📁 Session:** \`${img.sessionDir}\`\n\n`;
    markdown += '---\n\n';
  }

  markdown += `\n### Summary\n\n`;
  markdown += `- **Total screenshots:** ${copiedImages.length}\n`;
  markdown += `- **Source directory:** \`${screenshotDir}\`\n`;
  markdown += `- **PR documentation directory:** \`${path.relative(process.cwd(), prTempDir)}\`\n`;
  markdown += `- **Branch:** \`${currentBranch}\`\n`;
  markdown += `- **Commit SHA:** \`${commitSha}\` (used for permanent image URLs)\n`;
  markdown += `\n\n🤖 Generated with @octokit/rest screenshot uploader`;

  return markdown;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: tsx upload-screenshots.ts <pr-or-issue-number> <type> [screenshot-dir]');
    console.error('');
    console.error('Arguments:');
    console.error('  pr-or-issue-number  The PR or issue number to attach screenshots to');
    console.error('  type                Either "pr" or "issue"');
    console.error('  screenshot-dir      Path to screenshots (optional, defaults to auto-detect)');
    console.error('');
    console.error('Examples:');
    console.error('  tsx upload-screenshots.ts 21 pr auto-detect');
    console.error('  tsx upload-screenshots.ts 42 issue temp/screenshots/session-123');
    process.exit(1);
  }

  const targetNumber = parseInt(args[0], 10);
  const targetType = args[1] as 'pr' | 'issue';
  const screenshotDirArg = args[2] || 'auto-detect';

  if (isNaN(targetNumber)) {
    console.error(`Error: Invalid ${targetType} number: ${args[0]}`);
    process.exit(1);
  }

  if (!['pr', 'issue'].includes(targetType)) {
    console.error(`Error: Type must be "pr" or "issue", got: ${targetType}`);
    process.exit(1);
  }

  // Get GitHub client and repo info
  const octokit = getGitHubClient();
  const { owner, repo } = getRepoInfo();
  const currentBranch = getCurrentBranch();

  console.log(`\n📋 Repository: ${owner}/${repo}`);
  console.log(`📋 Branch: ${currentBranch}`);
  console.log(`📋 Target: ${targetType} #${targetNumber}\n`);

  // Auto-detect or validate screenshot directory
  let screenshotDir: string;

  if (screenshotDirArg === 'auto-detect') {
    console.log('🔍 Auto-detecting screenshot directories...\n');

    const foundDirs = autoDetectScreenshotDirs();

    if (foundDirs.length === 0) {
      console.error('Error: No screenshot directories found in common locations');
      console.error(
        'Searched: temp/screenshots/*, docs/screenshots/*, packages/*/temp/screenshots/*, packages/*/docs/screenshots/*'
      );
      process.exit(1);
    }

    // Use the most recently modified directory
    screenshotDir = foundDirs[0].path;

    console.log(`Found ${foundDirs.length} screenshot location(s):`);
    foundDirs.slice(0, 5).forEach((dir, index) => {
      const indicator = index === 0 ? '→' : ' ';
      console.log(
        `  ${indicator} ${dir.path} (${dir.mtime.toISOString().replace('T', ' ').substring(0, 19)})`
      );
    });

    console.log(`\n✓ Selected most recent: ${screenshotDir}\n`);
  } else {
    screenshotDir = screenshotDirArg;
  }

  // Validate screenshot directory exists
  if (!fs.existsSync(screenshotDir)) {
    console.error(`Error: Screenshot directory not found: ${screenshotDir}`);
    process.exit(1);
  }

  // Find all image files
  const imageFiles = findImages(screenshotDir);

  if (imageFiles.length === 0) {
    console.error(`Error: No image files found in ${screenshotDir}`);
    process.exit(1);
  }

  console.log(`Found ${imageFiles.length} image(s):`);
  imageFiles.forEach((file) => console.log(`  - ${file}`));

  // Copy images to PR/issue directory
  console.log('\n📋 Approach: Commit images to temp/pr-<number>/ and use raw GitHub URLs\n');

  const prTempDir = path.join(process.cwd(), 'temp/screenshots', `pr-${targetNumber}`);
  if (!fs.existsSync(prTempDir)) {
    fs.mkdirSync(prTempDir, { recursive: true });
    console.log(`Created directory: ${prTempDir}`);
  }

  const copiedImages: CopiedImage[] = [];

  for (const imgPath of imageFiles) {
    const metadata = extractMetadata(imgPath);
    const context = generateContext(metadata.filename);
    const destPath = path.join(prTempDir, metadata.filename);

    // Copy (overwrite if exists)
    fs.copyFileSync(imgPath, destPath);
    console.log(`✓ Copied ${metadata.filename} to temp/pr-${targetNumber}/`);

    copiedImages.push({
      original: imgPath,
      dest: destPath,
      ...metadata,
      context,
    });
  }

  // Commit and push if needed
  let commitSha: string;

  if (hasUncommittedChanges([`temp/screenshots/pr-${targetNumber}`])) {
    console.log('\n📦 Committing screenshot files...\n');

    const commitMsg = `docs(screenshots): add screenshots for ${targetType} #${targetNumber}\n\nAdded ${copiedImages.length} screenshot(s) from ${screenshotDir}\n\n🤖 Generated with @octokit screenshot uploader`;

    try {
      commitSha = await commitAndPush([`temp/screenshots/pr-${targetNumber}/`], commitMsg);

      console.log(`✓ Committed and pushed (SHA: ${commitSha.substring(0, 7)})\n`);

      // Wait for GitHub to process
      console.log('⏳ Waiting for GitHub to process files...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('\n❌ Error committing/pushing files:', error);
      console.log('\n⚠️  You may need to commit and push manually');
      process.exit(1);
    }
  } else {
    commitSha = getCommitSha();
    console.log(`\nℹ️  No new files to commit. Using current SHA: ${commitSha.substring(0, 7)}\n`);
  }

  // Generate markdown with blob URLs
  const markdown = generateCommentMarkdown(
    copiedImages,
    owner,
    repo,
    commitSha,
    targetNumber,
    currentBranch,
    screenshotDir,
    prTempDir
  );

  // Save to temp file for reference
  const tempFile = '/tmp/github-screenshot-comment.md';
  fs.writeFileSync(tempFile, markdown);

  console.log('\n📝 Generated comment markdown (preview):');
  console.log('─'.repeat(80));
  console.log(markdown.substring(0, 500) + '...\n');
  console.log('─'.repeat(80));
  console.log(`Full markdown saved to: ${tempFile}\n`);

  // Post comment using @octokit
  console.log(`💬 Posting comment to ${targetType} #${targetNumber} using @octokit...\n`);

  try {
    const response = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: targetNumber,
      body: markdown,
    });

    console.log('✅ Comment posted successfully!');
    console.log(`🔗 Comment URL: ${response.data.html_url}`);
    console.log(`📊 Attached ${copiedImages.length} image(s)\n`);

    // Return result for programmatic use
    return {
      success: true,
      commentUrl: response.data.html_url,
      imagesAttached: copiedImages.length,
      commitSha,
    };
  } catch (error: any) {
    console.error('\n❌ Error posting comment:', error.message);

    if (error.status === 404) {
      console.error(`\n${targetType} #${targetNumber} not found in ${owner}/${repo}`);
      console.error('Make sure the PR/issue exists and you have access to the repository.');
    } else if (error.status === 403) {
      console.error('\nPermission denied. Check that your GITHUB_TOKEN has repo access.');
      console.error('Required scopes: repo (full control of private repositories)');
    } else if (error.status === 422) {
      console.error('\nValidation failed:');
      console.error(JSON.stringify(error.response?.data?.errors, null, 2));
    } else {
      console.error('\nUnexpected error:');
      console.error(error);
    }

    console.log(`\n📋 You can manually post the comment from: ${tempFile}`);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

export { main as uploadScreenshots };
