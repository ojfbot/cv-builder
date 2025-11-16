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
if (args.length < 2) {
  console.error('Usage: node upload-screenshots.js <pr-number> <screenshot-dir>');
  console.error('Example: node upload-screenshots.js 22 packages/browser-automation/temp/screenshots');
  process.exit(1);
}

const prNumber = args[0];
const screenshotDir = args[1];

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

// Get current branch
let currentBranch;
try {
  currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
} catch (error) {
  console.error('Error getting current branch:', error.message);
  process.exit(1);
}

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

const copiedImages = [];
for (const imgPath of imageFiles) {
  const filename = path.basename(imgPath);
  const destPath = path.join(prTempDir, filename);

  // Copy (overwrite if exists)
  fs.copyFileSync(imgPath, destPath);
  console.log(`✓ Copied ${filename} to temp/pr-${prNumber}/`);
  copiedImages.push({ original: imgPath, dest: destPath, filename });
}

// Generate markdown comment
const generateCommentMarkdown = () => {
  let markdown = '## 📸 Screenshots - Browser Automation in Action\n\n';
  markdown += 'The automation service successfully captured these screenshots:\n\n';
  markdown += '---\n\n';

  for (const img of copiedImages) {
    const relPath = path.relative(process.cwd(), img.dest);
    // Use GitHub blob URL which works for unmerged branches/PRs
    const blobUrl = `https://github.com/${repoInfo.owner.login}/${repoInfo.name}/blob/${currentBranch}/${relPath}?raw=true`;
    const title = img.filename
      .replace(/-/g, ' ')
      .replace(/\.(png|jpg|jpeg|gif)$/i, '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    markdown += `### ${title}\n\n`;
    markdown += `![${title}](${blobUrl})\n\n`;
    markdown += '---\n\n';
  }

  markdown += `\n**Total screenshots:** ${copiedImages.length}\n`;
  markdown += `**Source directory:** \`${screenshotDir}\`\n`;
  markdown += `**PR directory:** \`${path.relative(process.cwd(), prTempDir)}\`\n`;

  return markdown;
};

const commentMarkdown = generateCommentMarkdown();

// Save to temp file
const tempFile = '/tmp/github-screenshot-comment.md';
fs.writeFileSync(tempFile, commentMarkdown);

console.log('\n📝 Generated comment markdown:');
console.log('─'.repeat(80));
console.log(commentMarkdown);
console.log('─'.repeat(80));

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

    // Push
    console.log('\n⬆️  Pushing to remote...');
    execSync('git push', { stdio: 'inherit' });
    console.log('✓ Pushed to remote');
  } catch (error) {
    console.error('Error committing/pushing files:', error.message);
    console.log('\n⚠️  You may need to commit and push manually');
  }
}

// Wait a moment for GitHub to process the push
console.log('\n⏳ Waiting for GitHub to process files...');
execSync('sleep 3');

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
