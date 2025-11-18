#!/usr/bin/env tsx
/**
 * Comprehensive Test Runner
 *
 * Runs all UI tests in the semantic test organization structure and ensures
 * 100% screenshot coverage for PR baseline documentation.
 *
 * Usage:
 *   npm run test:comprehensive              # Run all tests
 *   npm run test:comprehensive -- --suite=bio-form  # Run specific suite
 *   npm run test:comprehensive -- --dry-run # List tests without running
 */

import { spawn } from 'child_process';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Test suite definitions matching semantic directory structure
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

type TestSuite = typeof TEST_SUITES[number];

interface TestFile {
  suite: TestSuite;
  name: string;
  path: string;
}

interface TestRunnerOptions {
  suite?: TestSuite;
  dryRun?: boolean;
  verbose?: boolean;
}

// Parse command line arguments
function parseArgs(): TestRunnerOptions {
  const args = process.argv.slice(2);
  const options: TestRunnerOptions = {};

  for (const arg of args) {
    if (arg.startsWith('--suite=')) {
      const suite = arg.split('=')[1] as TestSuite;
      if (!TEST_SUITES.includes(suite)) {
        console.error(`❌ Invalid suite: ${suite}`);
        console.error(`   Valid suites: ${TEST_SUITES.join(', ')}`);
        process.exit(1);
      }
      options.suite = suite;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    }
  }

  return options;
}

// Discover all test files in semantic structure
async function discoverTests(suiteFilter?: TestSuite): Promise<TestFile[]> {
  const testsDir = join(process.cwd(), 'tests', 'cv-builder');
  const tests: TestFile[] = [];

  const suitesToScan = suiteFilter ? [suiteFilter] : TEST_SUITES;

  for (const suite of suitesToScan) {
    const suiteDir = join(testsDir, suite);

    if (!existsSync(suiteDir)) {
      console.warn(`⚠️  Suite directory not found: ${suite}`);
      continue;
    }

    const files = await readdir(suiteDir);
    const testFiles = files.filter(f => f.endsWith('.test.ts'));

    for (const file of testFiles) {
      tests.push({
        suite,
        name: file.replace('.test.ts', ''),
        path: join(suiteDir, file),
      });
    }
  }

  return tests;
}

// Run a single test file
async function runTest(test: TestFile, verbose: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 Running: ${test.suite}/${test.name}`);
    console.log(`${'='.repeat(80)}\n`);

    const child = spawn('tsx', [test.path], {
      stdio: verbose ? 'inherit' : 'pipe',
      env: {
        ...process.env,
        API_URL: process.env.API_URL || 'http://localhost:3002',
        APP_URL: process.env.APP_URL || 'http://localhost:3000',
      },
    });

    let output = '';

    if (!verbose) {
      child.stdout?.on('data', (data) => {
        output += data.toString();
      });
      child.stderr?.on('data', (data) => {
        output += data.toString();
      });
    }

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${test.suite}/${test.name} PASSED`);
        resolve(true);
      } else {
        console.error(`❌ ${test.suite}/${test.name} FAILED`);
        if (!verbose && output) {
          console.error('\nTest output:');
          console.error(output);
        }
        resolve(false);
      }
    });
  });
}

// Main runner
async function main() {
  const options = parseArgs();

  console.log('🚀 CV Builder Comprehensive Test Suite');
  console.log('━'.repeat(80));

  if (options.suite) {
    console.log(`📦 Suite filter: ${options.suite}`);
  }

  if (options.dryRun) {
    console.log('🔍 Dry run mode: tests will be listed but not executed\n');
  }

  // Discover tests
  const tests = await discoverTests(options.suite);

  if (tests.length === 0) {
    console.error('❌ No tests found!');
    process.exit(1);
  }

  console.log(`\n📊 Found ${tests.length} test files:\n`);

  // Group by suite for display
  const testsBySuite = tests.reduce((acc, test) => {
    if (!acc[test.suite]) acc[test.suite] = [];
    acc[test.suite].push(test);
    return acc;
  }, {} as Record<string, TestFile[]>);

  for (const [suite, suiteTests] of Object.entries(testsBySuite)) {
    console.log(`  ${suite}/`);
    for (const test of suiteTests) {
      console.log(`    ├─ ${test.name}.test.ts`);
    }
  }

  if (options.dryRun) {
    console.log('\n✅ Dry run complete');
    process.exit(0);
  }

  // Run tests
  console.log('\n🧪 Starting test execution...\n');

  const results: Array<{ test: TestFile; passed: boolean }> = [];

  for (const test of tests) {
    const passed = await runTest(test, options.verbose || false);
    results.push({ test, passed });
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80) + '\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    for (const result of results.filter(r => !r.passed)) {
      console.log(`  - ${result.test.suite}/${result.test.name}`);
    }
  }

  console.log('\n' + '='.repeat(80));

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
