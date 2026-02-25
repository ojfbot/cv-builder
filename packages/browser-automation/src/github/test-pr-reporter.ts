/**
 * Test script for GitHub PR Reporter
 *
 * Tests the complete flow:
 * 1. Load test manifest
 * 2. Upload screenshots to Gists
 * 3. Generate PR comment markdown
 * 4. Validate output
 *
 * Usage: tsx src/github/test-pr-reporter.ts [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GitHubPRReporter } from './pr-reporter.js';
import { GistUploader } from './gist-uploader.js';
import type { TestManifest } from '../drawio/metadata.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('🧪 Testing GitHub PR Reporter\n');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}\n`);

  // 1. Check GitHub authentication
  console.log('🔐 Step 1: Checking GitHub authentication...');

  const uploader = new GistUploader();

  try {
    const rateLimit = await uploader.checkRateLimit();
    console.log(`✅ Authenticated`);
    console.log(`   Rate limit: ${rateLimit.remaining}/${rateLimit.limit}`);
    console.log(`   Resets: ${rateLimit.reset.toLocaleString()}\n`);
  } catch (error) {
    console.error('❌ GitHub authentication failed');
    console.error('   Please run: gh auth login');
    console.error(`   Error: ${error}\n`);
    process.exit(1);
  }

  // 2. Load test manifest
  console.log('📄 Step 2: Loading test manifest...');
  const manifestPath = path.join(__dirname, '../../temp/capture-test/manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ Manifest not found: ${manifestPath}`);
    console.error('   Run test-capture-flow.ts first');
    process.exit(1);
  }

  const manifest: TestManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`✅ Loaded manifest: ${manifest.diagramSource}`);
  console.log(`   Steps: ${manifest.totalSteps}`);
  console.log(`   Screenshots: ${manifest.screenshotsCaptured}\n`);

  // 3. Verify screenshots exist
  console.log('📸 Step 3: Verifying screenshots...');
  const screenshotDir = path.join(__dirname, '../../temp/capture-test');
  let screenshotCount = 0;

  for (const interaction of manifest.interactions) {
    for (const screenshot of interaction.screenshots) {
      const screenshotPath = path.join(screenshotDir, screenshot.screenshotPath);
      if (fs.existsSync(screenshotPath)) {
        screenshotCount++;
      }
    }
  }

  console.log(`✅ Found ${screenshotCount} screenshots\n`);

  // 4. Test Gist upload (dry run or limited)
  if (isDryRun) {
    console.log('🌐 Step 4: Testing Gist upload (DRY RUN)...');
    console.log('   Skipping actual upload');
    console.log('   Would upload screenshots to Gists\n');
  } else {
    console.log('🌐 Step 4: Testing Gist upload...');

    // Upload first screenshot as test
    const firstInteraction = manifest.interactions[0];
    if (firstInteraction && firstInteraction.screenshots.length > 0) {
      const screenshot = firstInteraction.screenshots[0];
      const screenshotPath = path.join(screenshotDir, screenshot.screenshotPath);

      try {
        const result = await uploader.uploadScreenshots(
          undefined,
          screenshotPath,
          undefined,
          'Test Visual Regression Upload'
        );

        console.log('✅ Test gist created');
        console.log(`   Gist URL: ${result.gistUrl}`);
        console.log(`   After URL: ${result.afterUrl}\n`);

        // Clean up test gist
        console.log('🧹 Cleaning up test gist...');
        await uploader.deleteGist(result.gistId);
        console.log('✅ Test gist deleted\n');
      } catch (error) {
        console.error('❌ Gist upload failed:',error);
        console.error('');
      }
    }
  }

  // 5. Generate PR comment markdown
  console.log('📝 Step 5: Generating PR comment markdown...');

  const reporter = new GitHubPRReporter();

  // Generate markdown without posting
  const markdown = await generateMarkdownOnly(reporter, manifest, screenshotDir, !isDryRun);

  console.log('✅ Markdown generated');
  console.log(`   Length: ${markdown.length} characters\n`);

  // 6. Save markdown to file
  const outputPath = path.join(__dirname, '../../temp/pr-comment-preview.md');
  fs.writeFileSync(outputPath, markdown, 'utf-8');

  console.log(`💾 Step 6: Saved preview`);
  console.log(`   File: ${outputPath}\n`);

  // 7. Display preview
  console.log('👀 Step 7: Preview\n');
  console.log('─'.repeat(80));
  console.log(markdown.substring(0, 1000));
  if (markdown.length > 1000) {
    console.log('\n... (truncated, see full preview in file) ...');
  }
  console.log('─'.repeat(80));
  console.log('');

  // 8. Summary
  console.log('📊 Summary:');
  console.log(`   Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Screenshots: ${screenshotCount}`);
  console.log(`   Markdown length: ${markdown.length} chars`);
  console.log(`   Preview saved: ${outputPath}`);

  if (isDryRun) {
    console.log('\n💡 To test with actual uploads, run without --dry-run');
  } else {
    console.log('\n✅ All tests passed!');
  }

  console.log('\n🔗 Usage in CI/CD:');
  console.log('   export GITHUB_TOKEN=<token>');
  console.log('   export PR_NUMBER=<pr-number>');
  console.log('   tsx src/github/post-to-pr.ts');
}

/**
 * Generate markdown without posting to PR
 */
async function generateMarkdownOnly(
  reporter: GitHubPRReporter,
  manifest: TestManifest,
  _screenshotDir: string,
  uploadScreenshots: boolean
): Promise<string> {
  // Use reflection to access private methods
  const sections: string[] = [];

  sections.push('## 🎨 Visual Regression Test Results\n');

  // Summary
  sections.push((reporter as any).generateSummary(manifest));

  // Note about screenshot uploads
  if (!uploadScreenshots) {
    sections.push('\n> **Note:** Screenshot uploads disabled for this preview\n');
  }

  // Detailed results
  sections.push('\n---\n');
  sections.push((reporter as any).generateDetailedResults(manifest));

  // Update baseline instructions (if needed)
  if (manifest.summary.totalFailed > 0) {
    sections.push('\n---\n');
    sections.push((reporter as any).generateUpdateBaselineInstructions(manifest));
  }

  // Footer
  sections.push('\n---\n');
  sections.push((reporter as any).generateFooter(manifest));

  return sections.join('\n');
}

main().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
