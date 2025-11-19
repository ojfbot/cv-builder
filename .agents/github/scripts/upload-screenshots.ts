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

  // Tab Navigation
  if (name.includes('navigate-tabs-bio')) {
    return {
      what: 'Bio tab in active state with panel content visible',
      why: 'Validates tab navigation functionality and panel rendering for Bio section',
      when: 'Captured during tab navigation test suite',
    };
  } else if (name.includes('navigate-tabs-jobs')) {
    return {
      what: 'Jobs tab in active state showing job listings panel',
      why: 'Validates tab switching to Jobs section and content rendering',
      when: 'Captured during tab navigation test suite',
    };
  } else if (name.includes('navigate-tabs-outputs')) {
    return {
      what: 'Outputs tab active with generated documents panel',
      why: 'Validates navigation to Outputs section and document list rendering',
      when: 'Captured during tab navigation test suite',
    };
  } else if (name.includes('navigate-tabs-interactive')) {
    return {
      what: 'Interactive tab showing welcome message and quick action badges',
      why: 'Validates default Interactive tab state with all UI elements visible',
      when: 'Captured during tab navigation test suite',
    };
  }

  // Chat Interaction
  else if (name.includes('engage') && name.includes('empty')) {
    return {
      what: 'Chat input field in empty/initial state',
      why: 'Validates chat interface renders correctly before user interaction',
      when: 'Captured during chat interaction test suite',
    };
  } else if (name.includes('engage') && name.includes('text')) {
    return {
      what: 'Chat input field with user-typed text',
      why: 'Validates chat input accepts user text and displays it correctly',
      when: 'Captured during chat interaction test suite',
    };
  }

  // Settings & Modals
  else if (name.includes('settings') && name.includes('closed')) {
    return {
      what: 'Settings modal in closed state (not visible)',
      why: 'Validates initial state before settings modal is opened',
      when: 'Captured during settings modal test suite',
    };
  } else if (name.includes('settings') && name.includes('modal')) {
    return {
      what: 'Settings modal open with configuration options visible',
      why: 'Validates settings modal opens correctly with all controls accessible',
      when: 'Captured during settings modal test suite',
    };
  } else if (name.includes('settings') && name.includes('status')) {
    return {
      what: 'Settings icon showing current state indicator',
      why: 'Validates settings icon visibility and state representation',
      when: 'Captured during settings modal test suite',
    };
  }

  // Sidebar Navigation
  else if (name.includes('sidebar') && name.includes('expanded')) {
    return {
      what: 'Sidebar navigation in expanded state with full labels visible',
      why: 'Validates sidebar expansion animation and full navigation menu',
      when: 'Captured during sidebar navigation test suite',
    };
  } else if (name.includes('sidebar') && name.includes('collapsed')) {
    return {
      what: 'Sidebar navigation in collapsed state showing icons only',
      why: 'Validates sidebar collapse functionality and icon-only mode',
      when: 'Captured during sidebar navigation test suite',
    };
  }

  // Theme Switching
  else if (name.includes('theme') && name.includes('dark')) {
    return {
      what: 'Application interface in dark theme mode',
      why: 'Validates dark theme CSS variables and component styling',
      when: 'Captured during theme switching test suite',
    };
  } else if (name.includes('theme') && name.includes('light')) {
    return {
      what: 'Application interface in light theme mode',
      why: 'Validates light theme CSS variables and component styling',
      when: 'Captured during theme switching test suite',
    };
  } else if (name.includes('theme') && name.includes('initial')) {
    return {
      what: 'Initial theme state before user interaction',
      why: 'Validates default theme configuration on application load',
      when: 'Captured during theme switching test suite',
    };
  }

  // Badge Interactions
  else if (name.includes('badge')) {
    return {
      what: 'Quick action badge interaction and state change',
      why: 'Validates badge click handlers and visual feedback',
      when: 'Captured during badge interaction test suite',
    };
  }

  // Example/Basic Tests
  else if (name.includes('example') && name.includes('homepage')) {
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
  }

  // Generic fallbacks
  else if (name.includes('error') || name.includes('fail')) {
    return {
      what: 'Error state or failure condition',
      why: 'Documents issue or bug for debugging purposes',
      when: 'Captured when error condition occurred',
    };
  } else if (name.includes('dashboard')) {
    return {
      what: 'Complete dashboard interface showing all navigation tabs and main interactive area',
      why: 'Demonstrates the full application layout and primary user interface',
      when: 'Captured during integration testing of browser automation API',
    };
  } else {
    return {
      what: 'Screenshot captured during development or testing',
      why: 'Documents visual state or behavior for this feature',
      when: 'Captured during automated test execution',
    };
  }
}

/**
 * Group screenshots by test suite based on filename patterns
 */
function groupScreenshotsByTestSuite(images: CopiedImage[]): Map<string, CopiedImage[]> {
  const suites = new Map<string, CopiedImage[]>();

  for (const img of images) {
    const name = img.filename.toLowerCase();

    // Determine suite based on filename patterns
    let suite = 'Other Screenshots';

    if (name.includes('navigate-tabs') || name.includes('tab-navigation')) {
      suite = 'Tab Navigation';
    } else if (name.includes('engage') || name.includes('chat')) {
      suite = 'Chat Interaction';
    } else if (name.includes('settings') || name.includes('modal')) {
      suite = 'Settings & Modals';
    } else if (name.includes('sidebar')) {
      suite = 'Sidebar Navigation';
    } else if (name.includes('theme')) {
      suite = 'Theme Switching';
    } else if (name.includes('badge')) {
      suite = 'Badge Interactions';
    } else if (name.includes('bio') || name.includes('profile')) {
      suite = 'Bio Form';
    } else if (name.includes('example')) {
      suite = 'Basic Functionality Tests';
    }

    if (!suites.has(suite)) {
      suites.set(suite, []);
    }
    suites.get(suite)!.push(img);
  }

  return suites;
}

/**
 * Generate markdown comment with screenshots in test report format
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
  const groupedByTestSuite = groupScreenshotsByTestSuite(copiedImages);
  const totalSuites = groupedByTestSuite.size;
  const totalScreenshots = copiedImages.length;

  let markdown = '# 🧪 Browser Automation Test Report\n\n';
  markdown += `**Test Run**: PR #${targetNumber} validation\n`;
  markdown += `**Branch**: \`${currentBranch}\`\n`;
  markdown += `**PR**: #${targetNumber}\n\n`;

  // Summary section
  markdown += '## Summary\n\n';
  markdown += `✅ **Screenshots Captured**: ${totalScreenshots}\n`;
  markdown += `📊 **Test Suites**: ${totalSuites}\n`;
  markdown += `📁 **Source**: \`${screenshotDir}\`\n`;
  markdown += `🔗 **Commit**: \`${commitSha}\`\n\n`;
  markdown += '---\n\n';

  // Test results by suite (collapsible)
  markdown += '## Test Results by Suite\n\n';

  for (const [suiteName, screenshots] of groupedByTestSuite.entries()) {
    markdown += '<details>\n';
    markdown += `<summary><strong>✅ ${suiteName} (${screenshots.length} screenshot${screenshots.length > 1 ? 's' : ''})</strong></summary>\n\n`;

    for (const img of screenshots) {
      const relPath = path.relative(process.cwd(), img.dest);
      const blobUrl = `https://github.com/${owner}/${repo}/blob/${commitSha}/${relPath}?raw=true`;
      const title = img.filename
        .replace(/-/g, ' ')
        .replace(/\.(png|jpg|jpeg|gif)$/i, '')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      markdown += `### Test: ${title}\n\n`;
      markdown += '**Status**: ✅ Passed\n\n';
      markdown += `**What**: ${img.context.what}\n\n`;
      markdown += `**Why**: ${img.context.why}\n\n`;
      markdown += `**When**: ${img.context.when}\n\n`;

      markdown += '#### Screenshots\n\n';
      markdown += '<details>\n';
      markdown += '<summary>View Screenshot (1)</summary>\n\n';
      markdown += `**${img.filename}** - ${img.context.what}\n`;
      markdown += `![${title}](${blobUrl})\n\n`;
      markdown += '</details>\n\n';
      markdown += '---\n\n';
    }

    markdown += '</details>\n\n';
  }

  // Screenshot Manifest
  markdown += '<details>\n';
  markdown += `<summary><strong>📸 Screenshot Manifest (${totalScreenshots} total)</strong></summary>\n\n`;
  markdown += '| Suite | Screenshot | Size | Session |\n';
  markdown += '|-------|------------|------|--------|\n';

  for (const [suiteName, screenshots] of groupedByTestSuite.entries()) {
    for (const img of screenshots) {
      markdown += `| ${suiteName} | ${img.filename} | ${(img.fileSize / 1024).toFixed(1)} KB | \`${img.sessionDir}\` |\n`;
    }
  }

  markdown += `\n**Base Path**: \`${path.relative(process.cwd(), prTempDir)}\`\n`;
  markdown += `**Raw URL Format**: \`https://github.com/${owner}/${repo}/blob/${commitSha}/[path]?raw=true\`\n\n`;
  markdown += '</details>\n\n';

  // Footer
  markdown += '---\n\n';
  markdown += '🤖 Generated with [Claude Code](https://claude.com/claude-code)\n';
  markdown += '📊 Report generated by screenshot-commenter agent via @octokit/rest\n\n';
  markdown += 'Co-Authored-By: Claude <noreply@anthropic.com>';

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

      // Poll GitHub API to verify commit is accessible
      console.log('⏳ Waiting for GitHub to process files...');
      const maxAttempts = 10;
      const pollInterval = 1000; // 1 second
      let attempt = 0;
      let commitAccessible = false;

      while (attempt < maxAttempts && !commitAccessible) {
        try {
          await octokit.rest.repos.getCommit({
            owner,
            repo,
            ref: commitSha,
          });
          commitAccessible = true;
          console.log('✓ Commit verified on GitHub\n');
        } catch (error: any) {
          if (error.status === 404) {
            attempt++;
            if (attempt < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, pollInterval));
            }
          } else {
            // Other errors should fail fast
            throw error;
          }
        }
      }

      if (!commitAccessible) {
        console.warn('⚠️  Warning: Commit not yet accessible on GitHub after 10 seconds');
        console.warn('    Screenshots may not render immediately in the comment');
      }
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
