/**
 * End-to-end test for screenshot embedding pipeline
 *
 * Tests the complete flow:
 * 1. Load test manifest with screenshot metadata
 * 2. Embed screenshots into Draw.io diagram
 * 3. Generate extended diagram
 * 4. Validate structure
 *
 * Usage: tsx src/drawio/test-embedding.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { embedScreenshots, ScreenshotEmbedder } from './embedder.js';
import { createManipulator } from './xml-manipulator.js';
import type { TestManifest } from './metadata.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🎬 Testing Screenshot Embedding Pipeline\n');

  // 1. Load manifest
  console.log('📄 Step 1: Loading test manifest...');
  const manifestPath = path.join(__dirname, '../../temp/capture-test/manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ Manifest not found: ${manifestPath}`);
    console.error('   Run test-capture-flow.ts first to generate manifest and screenshots');
    process.exit(1);
  }

  const manifest: TestManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`✅ Loaded manifest: ${manifest.diagramSource}`);
  console.log(`   Steps: ${manifest.totalSteps}`);
  console.log(`   Screenshots: ${manifest.screenshotsCaptured}`);

  // 2. Verify screenshots exist
  console.log('\n📸 Step 2: Verifying screenshots...');
  const screenshotDir = path.join(__dirname, '../../temp/capture-test');
  let missingScreenshots = 0;

  for (const interaction of manifest.interactions) {
    for (const screenshot of interaction.screenshots) {
      const screenshotPath = path.join(screenshotDir, screenshot.screenshotPath);
      if (!fs.existsSync(screenshotPath)) {
        console.error(`   ❌ Missing: ${screenshot.screenshotPath}`);
        missingScreenshots++;
      } else {
        const stats = fs.statSync(screenshotPath);
        console.log(`   ✅ ${screenshot.screenshotPath} (${(stats.size / 1024).toFixed(1)} KB)`);
      }
    }
  }

  if (missingScreenshots > 0) {
    console.error(`\n❌ ${missingScreenshots} screenshots missing`);
    process.exit(1);
  }

  // 3. Load source Draw.io file
  console.log('\n📋 Step 3: Loading source Draw.io file...');
  const sourceFile = path.join(__dirname, '../../templates/drawio/form-interaction.drawio');

  if (!fs.existsSync(sourceFile)) {
    console.error(`❌ Source file not found: ${sourceFile}`);
    process.exit(1);
  }

  console.log(`✅ Source file: ${sourceFile}`);

  // 4. Generate output filename
  const outputDir = path.join(__dirname, '../../temp/embedding-test');
  const outputFile = ScreenshotEmbedder.generateOutputFilename(sourceFile, outputDir);

  console.log(`\n🎯 Step 4: Configuring embedding...`);
  console.log(`   Output: ${outputFile}`);
  console.log(`   Include annotations: true`);
  console.log(`   Image placement: right`);

  // 5. Embed screenshots
  console.log('\n🚀 Step 5: Embedding screenshots...');

  try {
    const result = await embedScreenshots({
      sourceFile,
      manifest,
      screenshotDir,
      outputFile,
      includeAnnotations: true,
      imagePlacement: 'right',
      imageScale: 0.5, // Scale down to 50% for smaller file size
    });

    console.log('\n✅ Embedding complete!');
    console.log(`   Output: ${result.outputFile}`);
    console.log(`   Screenshots embedded: ${result.screenshotsEmbedded}`);
    console.log(`   Annotations added: ${result.annotationsAdded}`);
    console.log(`   File size: ${(result.fileSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`   Git LFS recommended: ${result.recommendGitLFS ? 'Yes' : 'No'}`);

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach((warning) => {
        console.log(`   - ${warning}`);
      });
    }

    // 6. Validate extended file
    console.log('\n🔍 Step 6: Validating extended file...');

    const manipulator = createManipulator();
    const extendedXML = fs.readFileSync(result.outputFile, 'utf-8');
    const doc = manipulator.parse(extendedXML);

    const validation = manipulator.validate(doc);
    if (validation.valid) {
      console.log('   ✅ Valid Draw.io structure');
    } else {
      console.error('   ❌ Invalid structure:');
      validation.errors.forEach((err) => console.error(`      - ${err}`));
      process.exit(1);
    }

    // Count cells
    const cells = manipulator.getAllCells(doc);
    const imageCells = cells.filter((cell) => {
      const style = cell.getAttribute('style') || '';
      return style.includes('shape=image');
    });

    console.log(`   ✅ Total cells: ${cells.length}`);
    console.log(`   ✅ Image cells: ${imageCells.length}`);

    // 7. Check Git LFS status
    console.log('\n📦 Step 7: Checking Git LFS...');
    const hasLFS = await ScreenshotEmbedder.checkGitLFS();

    if (hasLFS) {
      console.log('   ✅ Git LFS is available');

      if (result.recommendGitLFS) {
        console.log('   ℹ️  Consider tracking large Draw.io files:');
        console.log('      git lfs track "*.drawio"');
        console.log('      git add .gitattributes');
      }
    } else {
      console.log('   ⚠️  Git LFS not installed');
      if (result.recommendGitLFS) {
        console.log('      Install Git LFS: https://git-lfs.github.com/');
      }
    }

    // 8. Summary
    console.log('\n📊 Summary:');
    console.log(`   Source diagram: ${path.basename(sourceFile)}`);
    console.log(`   Extended diagram: ${path.basename(result.outputFile)}`);
    console.log(`   Screenshots embedded: ${result.screenshotsEmbedded}`);
    console.log(`   Annotations: ${result.annotationsAdded}`);
    console.log(`   File size: ${(result.fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Valid Draw.io: ✓`);

    console.log('\n✅ All tests passed!');
    console.log(`\n💡 Open in Draw.io:`);
    console.log(`   open "${result.outputFile}"`);

  } catch (error) {
    console.error('\n❌ Embedding failed:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
