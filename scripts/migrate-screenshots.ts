#!/usr/bin/env tsx

/**
 * Screenshot Migration Script
 *
 * Migrates screenshots from old chaotic structure to new semantic 3-tier system:
 * - Tier 1: Ephemeral (temp/screenshots/ephemeral/{timestamp}/)
 * - Tier 2: PR Documentation (temp/screenshots/pr-{number}/)
 * - Tier 3: Permanent Docs (docs/screenshots/{app}/{suite}/)
 *
 * Migration strategy:
 * - PR-specific dirs (pr-22, pr-23, etc.) → Stay in place (already correct tier)
 * - Timestamp dirs (2025-11-16T...) → Move to ephemeral/
 * - Named dirs (pr-25-app-demo, etc.) → Parse and move to correct PR dir
 * - Old package dirs → Consolidate to monorepo-level structure
 *
 * Usage:
 *   npm run screenshots:migrate           # Execute migration
 *   npm run screenshots:migrate:dry-run   # Preview without moving
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

const isDryRun = process.argv.includes('--dry-run');

interface MigrationTask {
  type: 'move' | 'copy' | 'delete';
  from: string;
  to: string;
  reason: string;
}

interface ScreenshotLocation {
  path: string;
  name: string;
  type: 'timestamp' | 'pr-number' | 'pr-named' | 'unknown';
  prNumber?: number;
  files: string[];
}

const migrationTasks: MigrationTask[] = [];

/**
 * Detect screenshot directory type and extract metadata
 */
function classifyDirectory(dirPath: string, dirName: string): ScreenshotLocation {
  const location: ScreenshotLocation = {
    path: dirPath,
    name: dirName,
    type: 'unknown',
    files: []
  };

  // Timestamp format: YYYY-MM-DDTHH-mm-ss
  if (/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/.test(dirName)) {
    location.type = 'timestamp';
    return location;
  }

  // PR number format: pr-23, pr-25, etc.
  const prNumberMatch = dirName.match(/^pr-(\d+)$/);
  if (prNumberMatch) {
    location.type = 'pr-number';
    location.prNumber = parseInt(prNumberMatch[1]);
    return location;
  }

  // PR named format: pr-25-app-demo, pr-phase4-5, etc.
  const prNamedMatch = dirName.match(/^pr-(\d+)-/);
  if (prNamedMatch) {
    location.type = 'pr-named';
    location.prNumber = parseInt(prNamedMatch[1]);
    return location;
  }

  // Check if directory name contains PR reference
  const prInNameMatch = dirName.match(/pr-?(\d+)/i);
  if (prInNameMatch) {
    location.type = 'pr-named';
    location.prNumber = parseInt(prInNameMatch[1]);
    return location;
  }

  return location;
}

/**
 * Infer semantic path from filename
 */
function inferSemanticPath(filename: string): { app: string; suite: string; case: string } {
  const name = filename.toLowerCase().replace(/\.(png|jpg|jpeg)$/, '');

  // Default structure
  let app = 'cv-builder';
  let suite = 'unknown';
  let caseName = name;

  // Detect app
  if (name.includes('swagger')) {
    app = 'browser-automation';
    suite = 'swagger-ui';
  } else if (name.includes('example')) {
    app = 'browser-automation';
    suite = 'example-test';
  } else if (name.includes('cv-builder') || name.includes('dashboard')) {
    app = 'cv-builder';
  }

  // Detect suite from filename patterns
  if (name.includes('dashboard')) {
    suite = 'dashboard';
    caseName = name.replace('cv-builder-', '').replace('dashboard-', '');
  } else if (name.includes('bio')) {
    suite = 'bio-form';
    caseName = name.replace('cv-builder-', '').replace('bio-', '');
  } else if (name.includes('job')) {
    suite = 'jobs';
    caseName = name.replace('cv-builder-', '').replace('job-', '').replace('jobs-', '');
  } else if (name.includes('output')) {
    suite = 'outputs';
    caseName = name.replace('cv-builder-', '').replace('output-', '').replace('outputs-', '');
  } else if (name.includes('chat')) {
    suite = 'chat';
    caseName = name.replace('cv-builder-', '').replace('chat-', '');
  } else if (name.includes('interactive')) {
    suite = 'interactive';
    caseName = name.replace('interactive-', '');
  } else if (name.includes('swagger')) {
    suite = 'swagger-ui';
    caseName = name.replace('swagger-ui-', '');
  } else if (name.includes('example')) {
    suite = 'example-test';
    caseName = name.replace('example-', '');
  } else if (name.includes('header')) {
    suite = 'navigation';
    caseName = 'header';
  } else if (name.includes('settings')) {
    suite = 'settings';
    caseName = name.replace('settings-', '');
  } else if (name.includes('theme')) {
    suite = 'theme';
    caseName = name.replace('theme-', '');
  } else if (name.includes('sidebar')) {
    suite = 'sidebar';
    caseName = name.replace('sidebar-', '');
  } else if (name.includes('tab')) {
    suite = 'navigation';
    caseName = name.replace('tab-', '');
  }

  // Clean up case name
  caseName = caseName
    .replace(/^cv-builder-/, '')
    .replace(/^0\d-/, '') // Remove leading numbers like "01-", "02-"
    .replace(/-+/g, '-')  // Collapse multiple dashes
    .replace(/^-|-$/g, ''); // Remove leading/trailing dashes

  return { app, suite, case: caseName };
}

/**
 * Scan all screenshot directories
 */
async function scanScreenshotDirectories(): Promise<ScreenshotLocation[]> {
  const locations: ScreenshotLocation[] = [];

  const scanPaths = [
    'temp/screenshots',
    'packages/browser-automation/temp',
    'packages/browser-automation/temp/screenshots'
  ];

  for (const scanPath of scanPaths) {
    try {
      await fs.access(scanPath);
    } catch {
      continue; // Directory doesn't exist, skip
    }

    const entries = await fs.readdir(scanPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const dirPath = path.join(scanPath, entry.name);
      const location = classifyDirectory(dirPath, entry.name);

      // Find image files
      try {
        const files = await fs.readdir(dirPath);
        location.files = files.filter(f =>
          /\.(png|jpg|jpeg|gif)$/i.test(f)
        );

        if (location.files.length > 0) {
          locations.push(location);
        }
      } catch (error) {
        console.warn(`⚠️  Could not read directory: ${dirPath}`);
      }
    }
  }

  return locations;
}

/**
 * Plan migration for all screenshot directories
 */
async function planMigration(locations: ScreenshotLocation[]): Promise<void> {
  console.log('\n📋 Planning Migration\n');

  for (const location of locations) {
    console.log(`\n🔍 Analyzing: ${location.path}`);
    console.log(`   Type: ${location.type}`);
    console.log(`   Files: ${location.files.length} screenshots`);

    if (location.type === 'timestamp') {
      // Timestamp directories → Move to ephemeral/
      const timestamp = location.name;
      const targetDir = `temp/screenshots/ephemeral/${timestamp}`;

      migrationTasks.push({
        type: 'move',
        from: location.path,
        to: targetDir,
        reason: `Timestamp directory → ephemeral tier`
      });

      console.log(`   ✅ Will move to: ${targetDir}`);

    } else if (location.type === 'pr-number') {
      // Already in correct format (pr-23, pr-25, etc.)
      const expectedPath = `temp/screenshots/${location.name}`;

      if (location.path === expectedPath) {
        console.log(`   ✅ Already in correct location`);
      } else {
        // Need to consolidate from package-level to monorepo-level
        migrationTasks.push({
          type: 'move',
          from: location.path,
          to: expectedPath,
          reason: `Consolidate to monorepo-level PR directory`
        });

        console.log(`   ✅ Will consolidate to: ${expectedPath}`);
      }

      // Check if files need semantic reorganization
      const needsReorg = location.files.some(f => {
        const semantic = inferSemanticPath(f);
        return !f.includes(`${semantic.app}/${semantic.suite}/`);
      });

      if (needsReorg) {
        console.log(`   ⚠️  Contains flat files - will reorganize to semantic structure`);

        for (const file of location.files) {
          const semantic = inferSemanticPath(file);
          const currentPath = path.join(location.path, file);
          const targetPath = `temp/screenshots/${location.name}/${semantic.app}/${semantic.suite}/${semantic.case}.png`;

          migrationTasks.push({
            type: 'move',
            from: currentPath,
            to: targetPath,
            reason: `Reorganize to semantic path: ${semantic.app}/${semantic.suite}/${semantic.case}`
          });
        }
      }

    } else if (location.type === 'pr-named') {
      // Named PR directories (pr-25-app-demo, pr-phase4-5) → Move to pr-{number}
      const targetDir = `temp/screenshots/pr-${location.prNumber}`;

      console.log(`   ✅ Will consolidate to: ${targetDir}`);

      for (const file of location.files) {
        const semantic = inferSemanticPath(file);
        const currentPath = path.join(location.path, file);
        const targetPath = `${targetDir}/${semantic.app}/${semantic.suite}/${semantic.case}.png`;

        migrationTasks.push({
          type: 'move',
          from: currentPath,
          to: targetPath,
          reason: `Consolidate to PR ${location.prNumber} with semantic structure`
        });
      }

    } else {
      // Unknown type - move to ephemeral with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const targetDir = `temp/screenshots/ephemeral/migrated-${location.name}-${timestamp}`;

      migrationTasks.push({
        type: 'move',
        from: location.path,
        to: targetDir,
        reason: `Unknown type → ephemeral tier`
      });

      console.log(`   ⚠️  Unknown type, will move to: ${targetDir}`);
    }
  }
}

/**
 * Execute migration tasks
 */
async function executeMigration(): Promise<void> {
  console.log(`\n${isDryRun ? '🔍 DRY RUN - ' : '🚀 '}Executing Migration\n`);

  let movedCount = 0;
  let skippedCount = 0;

  // Group tasks by source directory to handle directory moves efficiently
  const dirMoves = migrationTasks.filter(t => t.type === 'move' && !t.from.includes('.png'));
  const fileMoves = migrationTasks.filter(t => t.type === 'move' && t.from.includes('.png'));

  // Execute directory moves first
  for (const task of dirMoves) {
    console.log(`\n${isDryRun ? '[DRY RUN] ' : ''}📦 ${task.reason}`);
    console.log(`   From: ${task.from}`);
    console.log(`   To:   ${task.to}`);

    if (!isDryRun) {
      try {
        // Create target directory
        await fs.mkdir(path.dirname(task.to), { recursive: true });

        // Move directory
        await fs.rename(task.from, task.to);

        movedCount++;
        console.log(`   ✅ Moved`);
      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}`);
        skippedCount++;
      }
    }
  }

  // Execute file moves
  for (const task of fileMoves) {
    console.log(`\n${isDryRun ? '[DRY RUN] ' : ''}📄 ${task.reason}`);
    console.log(`   From: ${task.from}`);
    console.log(`   To:   ${task.to}`);

    if (!isDryRun) {
      try {
        // Create target directory
        await fs.mkdir(path.dirname(task.to), { recursive: true });

        // Check if source exists
        try {
          await fs.access(task.from);
        } catch {
          console.log(`   ⚠️  Source file not found (may have been moved already)`);
          skippedCount++;
          continue;
        }

        // Move file
        await fs.rename(task.from, task.to);

        movedCount++;
        console.log(`   ✅ Moved`);
      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}`);
        skippedCount++;
      }
    }
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📊 Migration Summary`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`Total tasks: ${migrationTasks.length}`);
  if (!isDryRun) {
    console.log(`✅ Moved: ${movedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
  }
  console.log(`${'─'.repeat(60)}`);
}

/**
 * Clean up empty directories
 */
async function cleanupEmptyDirs(): Promise<void> {
  if (isDryRun) return;

  console.log(`\n🧹 Cleaning up empty directories...`);

  const checkDirs = [
    'temp/screenshots',
    'packages/browser-automation/temp',
    'packages/browser-automation/temp/screenshots'
  ];

  let removedCount = 0;

  for (const dir of checkDirs) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const fullPath = path.join(dir, entry.name);

        try {
          const contents = await fs.readdir(fullPath);
          if (contents.length === 0) {
            await fs.rmdir(fullPath);
            console.log(`   🗑️  Removed empty: ${fullPath}`);
            removedCount++;
          }
        } catch {
          // Ignore errors
        }
      }
    } catch {
      // Directory doesn't exist, skip
    }
  }

  if (removedCount > 0) {
    console.log(`\n✅ Removed ${removedCount} empty directories`);
  }
}

/**
 * Generate migration report
 */
function generateReport(): void {
  console.log(`\n📊 Migration Report\n`);

  const byReason = migrationTasks.reduce((acc, task) => {
    acc[task.reason] = (acc[task.reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`Migration breakdown:`);
  for (const [reason, count] of Object.entries(byReason)) {
    console.log(`  • ${reason}: ${count} files/directories`);
  }

  console.log(`\nNew structure:`);
  console.log(`  temp/screenshots/`);
  console.log(`  ├── ephemeral/              # Timestamp-based test runs (gitignored)`);
  console.log(`  └── pr-{number}/            # PR documentation (tracked in git)`);
  console.log(`      └── {app}/{suite}/      # Semantic organization`);
}

/**
 * Main execution
 */
async function main() {
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No files will be moved\n');
  }

  console.log('📸 Screenshot Migration Tool');
  console.log('═'.repeat(60));

  // Scan existing screenshots
  console.log('\n🔍 Scanning for screenshot directories...');
  const locations = await scanScreenshotDirectories();
  console.log(`\n✅ Found ${locations.length} screenshot directories`);

  if (locations.length === 0) {
    console.log('\n✨ No screenshots to migrate!');
    return;
  }

  // Plan migration
  await planMigration(locations);

  // Generate report
  generateReport();

  // Confirm execution
  if (!isDryRun) {
    console.log(`\n⚠️  This will move ${migrationTasks.length} files/directories`);
    console.log(`\nPress Ctrl+C to cancel, or wait 3 seconds to continue...`);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // Execute migration
  await executeMigration();

  // Clean up empty directories
  await cleanupEmptyDirs();

  console.log(`\n✅ Migration complete!`);

  if (isDryRun) {
    console.log(`\n💡 Run without --dry-run to execute the migration:`);
    console.log(`   npm run screenshots:migrate\n`);
  } else {
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Review the changes with: git status`);
    console.log(`   2. Run cleanup to apply retention policy: npm run screenshots:cleanup`);
    console.log(`   3. Commit the reorganized screenshots\n`);
  }
}

main().catch(console.error);
