#!/usr/bin/env tsx

/**
 * Screenshot Cleanup Script
 *
 * Maintains a 3-PR retention window for screenshot storage:
 * - Keeps ALL open/active PRs
 * - Keeps last 3 merged PRs (sorted by merge date)
 * - Deletes closed PRs that were never merged
 * - Deletes merged PRs beyond the 3-PR window
 * - Cleans up ephemeral screenshots older than 7 days
 *
 * Usage:
 *   npm run screenshots:cleanup           # Execute cleanup
 *   npm run screenshots:cleanup:dry-run   # Preview without deleting
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

interface PRScreenshotInfo {
  prNumber: number;
  dirPath: string;
  state: 'open' | 'merged' | 'closed';
  mergedAt: Date | null;
  closedAt: Date | null;
}

const KEEP_LAST_N_MERGED_PRS = 3;
const EPHEMERAL_MAX_AGE_DAYS = 7;
const SCREENSHOTS_BASE_DIR = 'temp/screenshots';

const isDryRun = process.argv.includes('--dry-run');

/**
 * Fetch PR information from GitHub for all PR screenshot directories
 */
async function getPRScreenshotDirs(): Promise<PRScreenshotInfo[]> {
  const entries = await fs.readdir(SCREENSHOTS_BASE_DIR, { withFileTypes: true });
  const prInfos: PRScreenshotInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('pr-')) continue;

    const prNumber = parseInt(entry.name.match(/^pr-(\d+)$/)?.[1] || '0');
    if (!prNumber) continue;

    try {
      // Fetch PR state from GitHub
      const result = execSync(
        `gh pr view ${prNumber} --json state,mergedAt,closedAt`,
        { encoding: 'utf-8' }
      );
      const pr = JSON.parse(result);

      prInfos.push({
        prNumber,
        dirPath: path.join(SCREENSHOTS_BASE_DIR, entry.name),
        state: pr.state.toLowerCase(),
        mergedAt: pr.mergedAt ? new Date(pr.mergedAt) : null,
        closedAt: pr.closedAt ? new Date(pr.closedAt) : null,
      });
    } catch (error: any) {
      console.warn(`⚠️  Could not fetch PR #${prNumber}: ${error.message}`);
      // Continue with other PRs
    }
  }

  return prInfos;
}

/**
 * Clean up PR screenshot directories based on retention policy
 */
async function cleanupPRScreenshots() {
  console.log('\n🔍 Analyzing PR screenshot directories...\n');

  const allPRs = await getPRScreenshotDirs();

  // Separate PRs by state
  const openPRs = allPRs.filter(pr => pr.state === 'open');
  const mergedPRs = allPRs.filter(pr => pr.state === 'merged' && pr.mergedAt)
    .sort((a, b) => b.mergedAt!.getTime() - a.mergedAt!.getTime()); // Most recent first
  const closedPRs = allPRs.filter(pr => pr.state === 'closed' && !pr.mergedAt);

  console.log('📊 Screenshot Storage Status');
  console.log('─'.repeat(60));
  console.log(`Open PRs: ${openPRs.length}`);
  console.log(`Merged PRs: ${mergedPRs.length}`);
  console.log(`Closed (not merged) PRs: ${closedPRs.length}`);
  console.log('─'.repeat(60));

  // Keep: All open PRs + last N merged PRs
  const mergedToKeep = mergedPRs.slice(0, KEEP_LAST_N_MERGED_PRS);
  const mergedToDelete = mergedPRs.slice(KEEP_LAST_N_MERGED_PRS);

  if (mergedToKeep.length > 0) {
    console.log(`\n✅ Keeping ${mergedToKeep.length} most recent merged PRs:`);
    mergedToKeep.forEach(pr => {
      const daysAgo = Math.floor((Date.now() - pr.mergedAt!.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`  - PR #${pr.prNumber} (merged ${daysAgo} days ago)`);
    });
  }

  // Calculate storage to be freed
  let totalDeleted = 0;
  let totalSize = 0;

  const calculateDirSize = async (dirPath: string): Promise<number> => {
    try {
      const result = execSync(`du -sk "${dirPath}"`, { encoding: 'utf-8' });
      const sizeKB = parseInt(result.split('\t')[0]);
      return sizeKB;
    } catch {
      return 0;
    }
  };

  // Delete: Older merged PRs
  if (mergedToDelete.length > 0) {
    console.log(`\n🗑️  ${isDryRun ? 'Would delete' : 'Deleting'} ${mergedToDelete.length} older merged PRs:`);
    for (const pr of mergedToDelete) {
      const daysAgo = Math.floor((Date.now() - pr.mergedAt!.getTime()) / (1000 * 60 * 60 * 24));
      const sizeKB = await calculateDirSize(pr.dirPath);
      totalSize += sizeKB;

      console.log(`  - PR #${pr.prNumber} (merged ${daysAgo} days ago, ${sizeKB} KB)`);

      if (!isDryRun) {
        await fs.rm(pr.dirPath, { recursive: true, force: true });
        totalDeleted++;
      }
    }
  }

  // Delete: Closed PRs that were never merged
  if (closedPRs.length > 0) {
    console.log(`\n🗑️  ${isDryRun ? 'Would delete' : 'Deleting'} ${closedPRs.length} closed (unmerged) PRs:`);
    for (const pr of closedPRs) {
      const sizeKB = await calculateDirSize(pr.dirPath);
      totalSize += sizeKB;

      console.log(`  - PR #${pr.prNumber} (closed without merge, ${sizeKB} KB)`);

      if (!isDryRun) {
        await fs.rm(pr.dirPath, { recursive: true, force: true });
        totalDeleted++;
      }
    }
  }

  if (totalDeleted === 0 && mergedToDelete.length === 0 && closedPRs.length === 0) {
    console.log(`\n✅ No PR screenshots to clean up`);
  } else {
    const action = isDryRun ? 'Would free' : 'Freed';
    console.log(`\n${isDryRun ? '📊' : '✨'} ${action} ${(totalSize / 1024).toFixed(2)} MB from ${mergedToDelete.length + closedPRs.length} PR directories`);
  }

  const remaining = openPRs.length + mergedToKeep.length;
  console.log(`📦 ${isDryRun ? 'Would keep' : 'Keeping'} ${remaining} PR screenshot directories (${openPRs.length} open + ${mergedToKeep.length} merged)`);
}

/**
 * Clean up ephemeral screenshot sessions older than configured age
 */
async function cleanupEphemeralScreenshots() {
  const EPHEMERAL_DIR = path.join(SCREENSHOTS_BASE_DIR, 'ephemeral');

  try {
    await fs.access(EPHEMERAL_DIR);
  } catch {
    console.log(`\n✅ No ephemeral screenshot directory found`);
    return;
  }

  const entries = await fs.readdir(EPHEMERAL_DIR, { withFileTypes: true });
  const now = Date.now();
  let deletedCount = 0;
  let totalSizeKB = 0;

  console.log(`\n🔍 Checking ephemeral screenshots (>${EPHEMERAL_MAX_AGE_DAYS} days old)...`);

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const dirPath = path.join(EPHEMERAL_DIR, entry.name);
    const stats = await fs.stat(dirPath);
    const ageInDays = (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

    if (ageInDays > EPHEMERAL_MAX_AGE_DAYS) {
      const sizeKB = await fs.readdir(dirPath).then(files => files.length * 150); // Estimate ~150KB per screenshot
      totalSizeKB += sizeKB;

      console.log(`  ${isDryRun ? 'Would delete' : 'Deleting'}: ${entry.name} (${ageInDays.toFixed(1)} days old, ~${sizeKB} KB)`);

      if (!isDryRun) {
        await fs.rm(dirPath, { recursive: true, force: true });
        deletedCount++;
      }
    }
  }

  if (deletedCount > 0 || totalSizeKB > 0) {
    const action = isDryRun ? 'Would delete' : 'Deleted';
    console.log(`\n🗑️  ${action} ${deletedCount} ephemeral sessions (~${(totalSizeKB / 1024).toFixed(2)} MB)`);
  } else {
    console.log(`\n✅ No ephemeral screenshots to clean up`);
  }
}

/**
 * Main execution
 */
async function main() {
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No files will be deleted\n');
    console.log('Run without --dry-run to execute cleanup\n');
  }

  console.log('🧹 Screenshot Cleanup Started');
  console.log(`📁 Base directory: ${SCREENSHOTS_BASE_DIR}`);
  console.log(`📋 Retention policy: Keep last ${KEEP_LAST_N_MERGED_PRS} merged PRs + all open PRs`);
  console.log(`⏰ Ephemeral age limit: ${EPHEMERAL_MAX_AGE_DAYS} days`);

  try {
    await cleanupPRScreenshots();
    await cleanupEphemeralScreenshots();

    console.log('\n✅ Screenshot cleanup complete!\n');

    if (isDryRun) {
      console.log('💡 Run `npm run screenshots:cleanup` to execute the cleanup\n');
    }
  } catch (error: any) {
    console.error('\n❌ Error during cleanup:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
