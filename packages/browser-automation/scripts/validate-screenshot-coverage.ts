#!/usr/bin/env tsx
/**
 * Screenshot Coverage Validator
 *
 * Validates that all tests capture screenshots and that semantic paths are correct.
 * This ensures 100% screenshot coverage for PR baseline documentation.
 */

import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

interface TestAnalysis {
  suite: string;
  file: string;
  path: string;
  hasScreenshots: boolean;
  screenshotCount: number;
  hasSemanticPaths: boolean;
  issues: string[];
}

const TEST_SUITES = [
  'bio-form',
  'chat',
  'interactive',
  'jobs',
  'outputs',
  'settings',
  'sidebar',
  'theme',
] as const;

async function analyzeTestFile(suite: string, file: string, filePath: string): Promise<TestAnalysis> {
  const content = await readFile(filePath, 'utf-8');
  const analysis: TestAnalysis = {
    suite,
    file,
    path: filePath,
    hasScreenshots: false,
    screenshotCount: 0,
    hasSemanticPaths: false,
    issues: [],
  };

  // Check for screenshot() calls
  const screenshotMatches = content.match(/\.screenshot\(/g);
  if (screenshotMatches) {
    analysis.hasScreenshots = true;
    analysis.screenshotCount = screenshotMatches.length;
  } else {
    analysis.issues.push('No screenshot() calls found');
  }

  // Check for semantic test metadata
  const hasTestMetadata = content.includes('test: {');
  const hasAppField = content.includes("app: 'cv-builder'");
  const hasSuiteField = content.includes(`suite: '${suite}'`);

  if (analysis.hasScreenshots) {
    if (hasTestMetadata && hasAppField && hasSuiteField) {
      analysis.hasSemanticPaths = true;
    } else {
      if (!hasTestMetadata) {
        analysis.issues.push('Missing test metadata object in screenshot() call');
      }
      if (!hasAppField) {
        analysis.issues.push("Missing app: 'cv-builder' in test metadata");
      }
      if (!hasSuiteField) {
        analysis.issues.push(`Missing suite: '${suite}' in test metadata`);
      }
    }
  }

  return analysis;
}

async function validateAllTests(): Promise<TestAnalysis[]> {
  const testsDir = join(process.cwd(), 'tests', 'cv-builder');
  const analyses: TestAnalysis[] = [];

  for (const suite of TEST_SUITES) {
    const suiteDir = join(testsDir, suite);

    if (!existsSync(suiteDir)) {
      console.warn(`⚠️  Suite directory not found: ${suite}`);
      continue;
    }

    const files = await readdir(suiteDir);
    const testFiles = files.filter(f => f.endsWith('.test.ts'));

    for (const file of testFiles) {
      const filePath = join(suiteDir, file);
      const analysis = await analyzeTestFile(suite, file, filePath);
      analyses.push(analysis);
    }
  }

  return analyses;
}

async function main() {
  console.log('🔍 Screenshot Coverage Validation');
  console.log('━'.repeat(80));
  console.log('');

  const analyses = await validateAllTests();

  if (analyses.length === 0) {
    console.error('❌ No test files found!');
    process.exit(1);
  }

  let totalScreenshots = 0;
  let filesWithScreenshots = 0;
  let filesWithSemanticPaths = 0;
  const filesWithIssues: TestAnalysis[] = [];

  console.log('📊 Test Analysis:\n');

  for (const analysis of analyses) {
    const status = analysis.hasSemanticPaths ? '✅' : (analysis.hasScreenshots ? '⚠️ ' : '❌');
    console.log(`${status} ${analysis.suite}/${analysis.file}`);
    console.log(`   Screenshots: ${analysis.screenshotCount}`);

    if (analysis.hasScreenshots) {
      filesWithScreenshots++;
      totalScreenshots += analysis.screenshotCount;
    }

    if (analysis.hasSemanticPaths) {
      filesWithSemanticPaths++;
      console.log('   Semantic paths: ✅');
    }

    if (analysis.issues.length > 0) {
      filesWithIssues.push(analysis);
      for (const issue of analysis.issues) {
        console.log(`   ⚠️  ${issue}`);
      }
    }

    console.log('');
  }

  console.log('━'.repeat(80));
  console.log('📈 Coverage Summary\n');
  console.log(`Total test files: ${analyses.length}`);
  console.log(`Files with screenshots: ${filesWithScreenshots}/${analyses.length} (${Math.round(filesWithScreenshots / analyses.length * 100)}%)`);
  console.log(`Files with semantic paths: ${filesWithSemanticPaths}/${analyses.length} (${Math.round(filesWithSemanticPaths / analyses.length * 100)}%)`);
  console.log(`Total screenshot calls: ${totalScreenshots}`);
  console.log('');

  if (filesWithIssues.length > 0) {
    console.log('⚠️  Issues Found:\n');
    for (const analysis of filesWithIssues) {
      console.log(`  ${analysis.suite}/${analysis.file}:`);
      for (const issue of analysis.issues) {
        console.log(`    - ${issue}`);
      }
    }
    console.log('');
  }

  console.log('━'.repeat(80));

  if (filesWithSemanticPaths === analyses.length) {
    console.log('✅ 100% COVERAGE - All tests have screenshots with semantic paths!');
    process.exit(0);
  } else {
    console.log('❌ INCOMPLETE COVERAGE - Some tests need semantic screenshot paths');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});
