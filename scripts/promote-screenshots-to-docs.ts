#!/usr/bin/env tsx

/**
 * Promote Latest Screenshot Set to Documentation
 *
 * This script promotes the most recent complete PR screenshot set to docs/screenshots/
 * for permanent documentation and regression testing baseline.
 *
 * Strategy:
 * 1. Find the most recent merged PR with screenshots
 * 2. Copy all screenshots to docs/screenshots/{app}/{suite}/
 * 3. Create README.md with metadata (PR number, date, test coverage)
 * 4. Keep semantic structure for easy navigation
 *
 * Usage:
 *   npm run screenshots:promote              # Promote latest PR
 *   npm run screenshots:promote -- --pr=36   # Promote specific PR
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

const isDryRun = process.argv.includes('--dry-run');
const prArg = process.argv.find(arg => arg.startsWith('--pr='));
const specificPR = prArg ? parseInt(prArg.split('=')[1]) : null;

interface PRInfo {
  number: number;
  mergedAt: Date;
  screenshotCount: number;
  path: string;
}

/**
 * Find all PR screenshot directories with their metadata
 */
async function findPRScreenshots(): Promise<PRInfo[]> {
  const screenshotsDir = 'temp/screenshots';
  const entries = await fs.readdir(screenshotsDir, { withFileTypes: true });
  const prInfos: PRInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('pr-')) continue;

    const prNumber = parseInt(entry.name.match(/^pr-(\d+)$/)?.[1] || '0');
    if (!prNumber) continue;

    const prPath = path.join(screenshotsDir, entry.name);

    // Count screenshots
    const screenshots = await findAllScreenshots(prPath);

    if (screenshots.length === 0) continue;

    try {
      // Get PR metadata from GitHub
      const result = execSync(
        `gh pr view ${prNumber} --json mergedAt,state`,
        { encoding: 'utf-8' }
      );
      const pr = JSON.parse(result);

      if (pr.state !== 'MERGED' || !pr.mergedAt) continue;

      prInfos.push({
        number: prNumber,
        mergedAt: new Date(pr.mergedAt),
        screenshotCount: screenshots.length,
        path: prPath
      });
    } catch (error: any) {
      console.warn(`⚠️  Could not fetch PR #${prNumber}: ${error.message}`);
    }
  }

  return prInfos.sort((a, b) => b.mergedAt.getTime() - a.mergedAt.getTime());
}

/**
 * Find all screenshot files recursively
 */
async function findAllScreenshots(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (/\.(png|jpg|jpeg)$/i.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  await walk(dir);
  return files;
}

/**
 * Copy screenshots to docs/ with semantic structure
 */
async function promoteScreenshots(prInfo: PRInfo): Promise<void> {
  console.log(`\n📸 Promoting PR #${prInfo.number} screenshots to docs/\n`);
  console.log(`Source: ${prInfo.path}`);
  console.log(`Count: ${prInfo.screenshotCount} screenshots`);
  console.log(`Merged: ${prInfo.mergedAt.toISOString().split('T')[0]}\n`);

  const screenshots = await findAllScreenshots(prInfo.path);

  // Group by app/suite for README generation
  const structure: Record<string, Record<string, string[]>> = {};

  for (const screenshot of screenshots) {
    const relativePath = path.relative(prInfo.path, screenshot);
    const parts = relativePath.split(path.sep);

    // Expected structure: {app}/{suite}/{case}.png
    if (parts.length >= 3) {
      const app = parts[0];
      const suite = parts[1];
      const filename = parts[parts.length - 1];

      if (!structure[app]) structure[app] = {};
      if (!structure[app][suite]) structure[app][suite] = [];
      structure[app][suite].push(filename);

      const targetPath = path.join('docs/screenshots', app, suite, filename);

      console.log(`${isDryRun ? '[DRY RUN] ' : ''}📄 ${relativePath} → ${targetPath}`);

      if (!isDryRun) {
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.copyFile(screenshot, targetPath);
      }
    } else {
      console.warn(`⚠️  Skipping non-semantic path: ${relativePath}`);
    }
  }

  // Generate README for each app
  if (!isDryRun) {
    for (const [app, suites] of Object.entries(structure)) {
      const readmePath = path.join('docs/screenshots', app, 'README.md');
      const readme = generateAppReadme(app, suites, prInfo);

      await fs.writeFile(readmePath, readme);
      console.log(`\n📝 Generated: ${readmePath}`);
    }
  }

  // Generate root README
  if (!isDryRun) {
    const rootReadme = generateRootReadme(structure, prInfo);
    await fs.writeFile('docs/screenshots/README.md', rootReadme);
    console.log(`📝 Generated: docs/screenshots/README.md`);
  }
}

/**
 * Generate README for an app
 */
function generateAppReadme(
  app: string,
  suites: Record<string, string[]>,
  prInfo: PRInfo
): string {
  const appTitle = app.split('-').map(w =>
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');

  let readme = `# ${appTitle} - Screenshot Documentation\n\n`;
  readme += `**Source:** PR #${prInfo.number}\n`;
  readme += `**Date:** ${prInfo.mergedAt.toISOString().split('T')[0]}\n`;
  readme += `**Total Screenshots:** ${Object.values(suites).flat().length}\n\n`;
  readme += `## Test Suites\n\n`;

  for (const [suite, files] of Object.entries(suites).sort()) {
    const suiteTitle = suite.split('-').map(w =>
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');

    readme += `### ${suiteTitle}\n\n`;
    readme += `**Screenshots:** ${files.length}\n\n`;

    for (const file of files.sort()) {
      const name = file.replace(/\.(png|jpg|jpeg)$/i, '');
      const caseName = name.split('-').map(w =>
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ');

      readme += `#### ${caseName}\n\n`;
      readme += `![${caseName}](./${suite}/${file})\n\n`;
      readme += `**File:** \`${suite}/${file}\`\n\n`;
      readme += `---\n\n`;
    }
  }

  readme += `## Update History\n\n`;
  readme += `- **${prInfo.mergedAt.toISOString().split('T')[0]}** - Initial documentation from PR #${prInfo.number}\n`;

  return readme;
}

/**
 * Generate root README
 */
function generateRootReadme(
  structure: Record<string, Record<string, string[]>>,
  prInfo: PRInfo
): string {
  let readme = `# Screenshot Documentation\n\n`;
  readme += `This directory contains the **golden reference screenshots** for visual regression testing and documentation.\n\n`;
  readme += `## Current Baseline\n\n`;
  readme += `**Source:** PR #${prInfo.number}\n`;
  readme += `**Date:** ${prInfo.mergedAt.toISOString().split('T')[0]}\n`;
  readme += `**Total Screenshots:** ${Object.values(structure).flatMap(s => Object.values(s).flat()).length}\n\n`;
  readme += `## Applications\n\n`;

  for (const [app, suites] of Object.entries(structure).sort()) {
    const appTitle = app.split('-').map(w =>
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');

    const totalScreenshots = Object.values(suites).flat().length;

    readme += `### ${appTitle}\n\n`;
    readme += `**Suites:** ${Object.keys(suites).length}\n`;
    readme += `**Screenshots:** ${totalScreenshots}\n\n`;

    for (const [suite, files] of Object.entries(suites).sort()) {
      const suiteTitle = suite.split('-').map(w =>
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ');

      readme += `- **${suiteTitle}** (${files.length} screenshots)\n`;
    }

    readme += `\n[View ${appTitle} Documentation](./${app}/README.md)\n\n`;
  }

  readme += `## Usage\n\n`;
  readme += `### For Visual Regression Testing\n\n`;
  readme += `Compare new screenshots against these baselines to detect unintended visual changes.\n\n`;
  readme += `### For Documentation\n\n`;
  readme += `Use these screenshots in documentation, onboarding materials, and design reviews.\n\n`;
  readme += `### Updating Baselines\n\n`;
  readme += `To update these screenshots with a new baseline:\n\n`;
  readme += `\`\`\`bash\n`;
  readme += `# Promote latest PR screenshots\n`;
  readme += `npm run screenshots:promote\n\n`;
  readme += `# Or promote specific PR\n`;
  readme += `npm run screenshots:promote -- --pr=36\n`;
  readme += `\`\`\`\n\n`;
  readme += `## Update History\n\n`;
  readme += `- **${prInfo.mergedAt.toISOString().split('T')[0]}** - Baseline from PR #${prInfo.number} (${Object.values(structure).flatMap(s => Object.values(s).flat()).length} screenshots)\n`;

  return readme;
}

/**
 * Main execution
 */
async function main() {
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No files will be copied\n');
  }

  console.log('📸 Screenshot Promotion Tool');
  console.log('═'.repeat(60));

  // Find PR screenshots
  const prScreenshots = await findPRScreenshots();

  if (prScreenshots.length === 0) {
    console.log('\n❌ No PR screenshots found!');
    return;
  }

  // Select PR to promote
  let selectedPR: PRInfo;

  if (specificPR) {
    const found = prScreenshots.find(pr => pr.number === specificPR);
    if (!found) {
      console.log(`\n❌ PR #${specificPR} not found or has no screenshots`);
      return;
    }
    selectedPR = found;
  } else {
    // Use most recent
    selectedPR = prScreenshots[0];
  }

  console.log(`\n📋 Available PRs with screenshots:\n`);
  prScreenshots.forEach((pr, i) => {
    const indicator = pr.number === selectedPR.number ? '→' : ' ';
    console.log(`  ${indicator} PR #${pr.number}: ${pr.screenshotCount} screenshots (merged ${pr.mergedAt.toISOString().split('T')[0]})`);
  });

  // Promote
  await promoteScreenshots(selectedPR);

  console.log(`\n✅ Promotion complete!`);

  if (isDryRun) {
    console.log(`\n💡 Run without --dry-run to execute:`);
    console.log(`   npm run screenshots:promote\n`);
  } else {
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Review: git status docs/screenshots/`);
    console.log(`   2. Commit: git add docs/screenshots/`);
    console.log(`   3. Document any major UI changes in release notes\n`);
  }
}

main().catch(console.error);
