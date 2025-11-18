#!/usr/bin/env node

/**
 * Upload screenshots to GitHub PR/Issue comment
 *
 * This script uploads local image files to GitHub by:
 * 1. Reading image files from a directory
 * 2. Converting them to base64
 * 3. Creating a comment with the images using gh pr comment --body-file
 *
 * Since GitHub doesn't have an official API for uploading images to comments,
 * this script uses the approach of embedding images as base64 data URLs or
 * opening the web browser for manual upload.
 *
 * Usage:
 *   node upload-screenshots.js <pr-number> <screenshot-dir>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node upload-screenshots.js <pr-number> [screenshot-dir]');
  console.error('Example: node upload-screenshots.js 22 packages/browser-automation/temp/screenshots');
  console.error('         node upload-screenshots.js 23 auto-detect');
  console.error('');
  console.error('If screenshot-dir is omitted or "auto-detect", will search common locations');
  process.exit(1);
}

const prNumber = args[0];
let screenshotDir = args[1] || 'auto-detect';

/**
 * Auto-detect screenshot directories by searching common locations
 */
const autoDetectScreenshotDirs = () => {
  const searchLocations = [
    'packages/browser-automation/temp/screenshots',
    'packages/browser-automation/docs/screenshots',
    'temp/screenshots',
    'docs/screenshots'
  ];

  const foundDirs = [];

  for (const location of searchLocations) {
    if (fs.existsSync(location)) {
      const entries = fs.readdirSync(location, { withFileTypes: true });

      // Check if this directory has subdirectories with screenshots
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(location, entry.name);
          const hasImages = fs.readdirSync(fullPath).some(file =>
            ['.png', '.jpg', '.jpeg', '.gif'].includes(path.extname(file).toLowerCase())
          );

          if (hasImages) {
            const stats = fs.statSync(fullPath);
            foundDirs.push({
              path: fullPath,
              name: entry.name,
              mtime: stats.mtime
            });
          }
        }
      }

      // Also check if the location itself has images
      const hasImages = fs.readdirSync(location).some(file =>
        ['.png', '.jpg', '.jpeg', '.gif'].includes(path.extname(file).toLowerCase())
      );

      if (hasImages) {
        const stats = fs.statSync(location);
        foundDirs.push({
          path: location,
          name: path.basename(location),
          mtime: stats.mtime
        });
      }
    }
  }

  // Sort by modification time, most recent first
  foundDirs.sort((a, b) => b.mtime - a.mtime);

  return foundDirs;
};

// Auto-detect screenshot directory if requested
if (screenshotDir === 'auto-detect') {
  console.log('🔍 Auto-detecting screenshot directories...\n');

  const foundDirs = autoDetectScreenshotDirs();

  if (foundDirs.length === 0) {
    console.error('Error: No screenshot directories found in common locations');
    console.error('Searched: temp/screenshots/*, docs/screenshots/*, packages/*/temp/screenshots/*, packages/*/docs/screenshots/*');
    process.exit(1);
  }

  // Use the most recently modified directory
  screenshotDir = foundDirs[0].path;

  console.log(`Found ${foundDirs.length} screenshot location(s):`);
  foundDirs.slice(0, 5).forEach((dir, index) => {
    const indicator = index === 0 ? '→' : ' ';
    console.log(`  ${indicator} ${dir.path} (${dir.mtime.toISOString().replace('T', ' ').substring(0, 19)})`);
  });

  console.log(`\n✓ Selected most recent: ${screenshotDir}\n`);
}

// Validate inputs
if (!fs.existsSync(screenshotDir)) {
  console.error(`Error: Screenshot directory not found: ${screenshotDir}`);
  process.exit(1);
}

// Get repository info
let repoInfo;
try {
  const repoJson = execSync('gh repo view --json owner,name', { encoding: 'utf-8' });
  repoInfo = JSON.parse(repoJson);
} catch (error) {
  console.error('Error getting repository info:', error.message);
  process.exit(1);
}

// Get current branch for display purposes
let currentBranch;
try {
  currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
} catch (error) {
  console.error('Error getting current branch:', error.message);
  process.exit(1);
}

// Get commit SHA for permanent URLs (CRITICAL: must be fetched AFTER commit and push)
let commitSha = null;
const getCommitSha = () => {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch (error) {
    console.error('Error getting commit SHA:', error.message);
    process.exit(1);
  }
};

// Find all image files
const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif'];
const findImages = (dir) => {
  const files = [];
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
};

const imageFiles = findImages(screenshotDir);

if (imageFiles.length === 0) {
  console.error(`No image files found in ${screenshotDir}`);
  process.exit(1);
}

console.log(`Found ${imageFiles.length} image(s):`);
imageFiles.forEach(file => console.log(`  - ${file}`));

// Since GitHub doesn't support programmatic image upload,
// we'll use one of these approaches:

// APPROACH: Copy images to temp/pr-<number>/ and commit (for PR documentation)
console.log('\n📋 Approach: Commit images to temp/pr-<number>/ and use raw GitHub URLs\n');

const prTempDir = path.join(process.cwd(), 'packages/browser-automation/temp', `pr-${prNumber}`);
if (!fs.existsSync(prTempDir)) {
  fs.mkdirSync(prTempDir, { recursive: true });
  console.log(`Created directory: ${prTempDir}`);
}

// Extract metadata from screenshot files
const extractMetadata = (imgPath) => {
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
    sessionDir
  };
};

// Generate context based on filename patterns
const generateContext = (filename) => {
  const name = filename.toLowerCase();

  // Pattern matching for common screenshot types
  if (name.includes('dashboard')) {
    return {
      what: 'Complete dashboard interface showing all navigation tabs and main interactive area',
      why: 'Demonstrates the full application layout and primary user interface',
      when: 'Captured during integration testing of browser automation API'
    };
  } else if (name.includes('header')) {
    return {
      what: 'Navigation header with tabs and controls',
      why: 'Shows element-specific screenshot capability (targeting specific components)',
      when: 'Captured to demonstrate selector-based screenshot feature'
    };
  } else if (name.includes('example') && name.includes('homepage')) {
    return {
      what: 'Example.com homepage - standard test page',
      why: 'Validates full-page screenshot functionality with a known stable page',
      when: 'Captured during basic workflow testing'
    };
  } else if (name.includes('example') && name.includes('h1')) {
    return {
      what: 'H1 element from Example.com page',
      why: 'Demonstrates element-specific screenshot by CSS selector',
      when: 'Captured to validate element querying and isolated screenshot capture'
    };
  } else if (name.includes('error') || name.includes('fail')) {
    return {
      what: 'Error state or failure condition',
      why: 'Documents issue or bug for debugging purposes',
      when: 'Captured when error condition occurred'
    };
  } else if (name.includes('test')) {
    return {
      what: 'Test execution result or test interface',
      why: 'Documents test results or validates test functionality',
      when: 'Captured during automated test run'
    };
  } else if (name.includes('before') || name.includes('after')) {
    return {
      what: name.includes('before') ? 'State before changes' : 'State after changes',
      why: 'Visual comparison for change validation',
      when: 'Captured for visual regression testing'
    };
  } else {
    return {
      what: 'Screenshot captured during development',
      why: 'Documents visual state or behavior',
      when: 'Captured during testing or development'
    };
  }
};

const copiedImages = [];
for (const imgPath of imageFiles) {
  const metadata = extractMetadata(imgPath);
  const context = generateContext(metadata.filename);
  const destPath = path.join(prTempDir, metadata.filename);

  // Copy (overwrite if exists)
  fs.copyFileSync(imgPath, destPath);
  console.log(`✓ Copied ${metadata.filename} to temp/pr-${prNumber}/`);

  copiedImages.push({
    original: imgPath,
    dest: destPath,
    ...metadata,
    context
  });
}

// Generate markdown comment
const generateCommentMarkdown = () => {
  // CRITICAL: Must fetch commit SHA AFTER push to ensure URLs work
  if (!commitSha) {
    console.error('ERROR: commitSha not set. This should never happen.');
    process.exit(1);
  }

  let markdown = '## 📸 Screenshots - Browser Automation in Action\n\n';
  markdown += 'The automation service successfully captured these screenshots during development and testing.\n\n';
  markdown += '---\n\n';

  for (const img of copiedImages) {
    const relPath = path.relative(process.cwd(), img.dest);
    // CRITICAL: Use commit SHA (not branch) for permanent URLs that survive branch deletion/rebase
    const blobUrl = `https://github.com/${repoInfo.owner.login}/${repoInfo.name}/blob/${commitSha}/${relPath}?raw=true`;
    const title = img.filename
      .replace(/-/g, ' ')
      .replace(/\.(png|jpg|jpeg|gif)$/i, '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
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

  return markdown;
};

// Commit images FIRST before generating markdown (so we have the commit SHA)
// Commit images if there are new files
const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' });
if (gitStatus.includes(`temp/pr-${prNumber}/`)) {
  console.log('\n📦 Committing screenshot files...');

  try {
    execSync(`git add packages/browser-automation/temp/pr-${prNumber}/`, { stdio: 'inherit' });
    const commitMsg = `docs(browser-automation): add screenshots for PR #${prNumber}

Added ${copiedImages.length} screenshot(s) from ${screenshotDir}

🤖 Generated with screenshot-commenter agent`;

    execSync(`git commit -m "${commitMsg}"`, { stdio: 'inherit' });
    console.log('✓ Screenshots committed');

    // Push to remote BEFORE generating URLs
    console.log('\n⬆️  Pushing to remote (REQUIRED for URLs to work)...');
    execSync('git push', { stdio: 'inherit' });
    console.log('✓ Pushed to remote');

    // NOW fetch commit SHA for URL generation
    commitSha = getCommitSha();
    console.log(`✓ Commit SHA: ${commitSha}`);
  } catch (error) {
    console.error('Error committing/pushing files:', error.message);
    console.log('\n⚠️  You may need to commit and push manually');
    process.exit(1);
  }
} else {
  // No new files, use current commit SHA
  commitSha = getCommitSha();
  console.log(`\nℹ️  No new files to commit. Using current commit SHA: ${commitSha}`);
}

// NOW generate markdown with commit SHA
const commentMarkdown = generateCommentMarkdown();

// Save to temp file
const tempFile = '/tmp/github-screenshot-comment.md';
fs.writeFileSync(tempFile, commentMarkdown);

console.log('\n📝 Generated comment markdown:');
console.log('─'.repeat(80));
console.log(commentMarkdown);
console.log('─'.repeat(80));

// Wait a moment for GitHub to process the push
console.log('\n⏳ Waiting for GitHub to process files (ensuring blob URLs are available)...');
execSync('sleep 5');

// Post comment
console.log(`\n💬 Posting comment to PR #${prNumber}...`);
try {
  execSync(`gh pr comment ${prNumber} --body-file ${tempFile}`, { stdio: 'inherit' });
  console.log('\n✅ Comment posted successfully!');
  console.log(`🔗 View PR: https://github.com/${repoInfo.owner.login}/${repoInfo.name}/pull/${prNumber}`);
} catch (error) {
  console.error('\n❌ Error posting comment:', error.message);
  console.log(`\n📋 You can manually post the comment from: ${tempFile}`);
  process.exit(1);
}
