/**
 * VisualDiffReporter - GitHub-friendly visual regression test results
 *
 * Extends MarkdownReporter to include visual comparison results with embedded images.
 */

import { writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { Reporter } from './Reporter.js';
import { SuiteResult, TestStatus } from '../types.js';
import { ComparisonResult } from '../../visual/comparison-engine.js';

export interface VisualTestResult {
  testName: string;
  suiteName: string;
  comparison: ComparisonResult;
  status: 'passed' | 'failed';
}

export class VisualDiffReporter implements Reporter {
  private outputDir: string;
  private results: SuiteResult[] = [];
  private visualResults: VisualTestResult[] = [];
  private artifactsDir: string;

  constructor(outputDir: string = './test-results') {
    this.outputDir = outputDir;
    this.artifactsDir = join(outputDir, 'visual-diffs');
  }

  onSuiteStart(_suiteName: string): void {
    // No-op for Visual Diff reporter
  }

  onSuiteEnd(result: SuiteResult): void {
    this.results.push(result);
  }

  /**
   * Register a visual comparison result
   */
  addVisualComparison(
    testName: string,
    suiteName: string,
    comparison: ComparisonResult
  ): void {
    this.visualResults.push({
      testName,
      suiteName,
      comparison,
      status: comparison.matches ? 'passed' : 'failed',
    });
  }

  onRunComplete(
    results: SuiteResult[],
    summary: {
      totalSuites: number;
      totalTests: number;
      passed: number;
      failed: number;
      skipped: number;
    }
  ): void {
    const lines: string[] = [];

    // Ensure output directories exist
    try {
      mkdirSync(this.outputDir, { recursive: true });
      mkdirSync(this.artifactsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Copy visual diff artifacts
    this.copyVisualArtifacts();

    // Header
    lines.push('# Visual Regression Test Results');
    lines.push('');
    lines.push(`**Date:** ${new Date().toISOString()}`);

    // Overall status
    const visualPassed = this.visualResults.filter((v) => v.status === 'passed').length;
    const visualFailed = this.visualResults.filter((v) => v.status === 'failed').length;
    const overallPassed = summary.failed === 0 && visualFailed === 0;

    lines.push(`**Status:** ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Count |');
    lines.push('|--------|-------|');
    lines.push(`| Total Test Suites | ${summary.totalSuites} |`);
    lines.push(`| Total Tests | ${summary.totalTests} |`);
    lines.push(`| ✅ Passed | ${summary.passed} |`);
    lines.push(`| ❌ Failed | ${summary.failed} |`);
    lines.push(`| ⏭️ Skipped | ${summary.skipped} |`);
    lines.push('');

    // Visual Regression Summary
    if (this.visualResults.length > 0) {
      lines.push('## Visual Regression Summary');
      lines.push('');
      lines.push('| Metric | Count |');
      lines.push('|--------|-------|');
      lines.push(`| Total Visual Tests | ${this.visualResults.length} |`);
      lines.push(`| ✅ Matched Baseline | ${visualPassed} |`);
      lines.push(`| ❌ Visual Changes Detected | ${visualFailed} |`);

      if (visualFailed > 0) {
        const totalDiffPixels = this.visualResults.reduce(
          (sum, v) => sum + v.comparison.diffPixelCount,
          0
        );
        const avgDiffPercentage =
          this.visualResults.reduce((sum, v) => sum + v.comparison.diffPercentage, 0) /
          this.visualResults.length;

        lines.push(`| Total Diff Pixels | ${totalDiffPixels.toLocaleString()} |`);
        lines.push(`| Avg Diff Percentage | ${avgDiffPercentage.toFixed(2)}% |`);
      }

      lines.push('');
    }

    // Visual Changes Detected
    if (visualFailed > 0) {
      lines.push('## Visual Changes Detected');
      lines.push('');
      lines.push(
        '> ⚠️ The following screenshots have visual differences from the baseline. '
      );
      lines.push(
        '> Review the diff images below. If changes are intentional, update the baselines.'
      );
      lines.push('');

      const failures = this.visualResults.filter((v) => v.status === 'failed');

      for (const failure of failures) {
        const comp = failure.comparison;
        const diffFilename = basename(comp.diffPath || '');
        const baselineFilename = basename(comp.baselinePath);
        const currentFilename = basename(comp.currentPath);

        lines.push(`### ${failure.testName}`);
        lines.push('');
        lines.push('**Comparison Details:**');
        lines.push('');
        lines.push('| Property | Value |');
        lines.push('|----------|-------|');
        lines.push(`| Different Pixels | ${comp.diffPixelCount.toLocaleString()} |`);
        lines.push(`| Difference % | ${comp.diffPercentage.toFixed(4)}% |`);
        lines.push(
          `| Dimensions | ${comp.dimensions.width}x${comp.dimensions.height} |`
        );
        lines.push(`| Total Pixels | ${comp.totalPixels.toLocaleString()} |`);
        lines.push('');

        // Visual comparison table
        lines.push('| Baseline | Current | Diff |');
        lines.push('|----------|---------|------|');
        lines.push(
          `| ![Baseline](visual-diffs/${baselineFilename}) | ![Current](visual-diffs/${currentFilename}) | ![Diff](visual-diffs/${diffFilename}) |`
        );
        lines.push('');

        lines.push('**Actions:**');
        lines.push('');
        lines.push('```bash');
        lines.push('# If changes are intentional, update the baseline:');
        lines.push(
          `pnpm --filter @resume-builder/browser-automation test:visual:update -- "${failure.suiteName}" "${failure.testName}"`
        );
        lines.push('');
        lines.push('# Or update all baselines:');
        lines.push('pnpm --filter @resume-builder/browser-automation test:visual:update:all');
        lines.push('```');
        lines.push('');
        lines.push('---');
        lines.push('');
      }
    }

    // Test Suite Results (original functionality)
    for (const suite of results) {
      lines.push(`## Test Suite: ${suite.name}`);
      lines.push('');
      lines.push(`**Duration:** ${this.formatDuration(suite.duration)}`);
      lines.push('');

      // Test table
      lines.push('| Test | Status | Duration |');
      lines.push('|------|--------|----------|');

      for (const test of suite.tests) {
        const status = this.getStatusEmoji(test.status);
        const duration = this.formatDuration(test.duration);
        lines.push(`| ${test.name} | ${status} ${test.status} | ${duration} |`);
      }

      lines.push('');

      // Failures section (non-visual)
      const nonVisualFailures = suite.tests.filter((t) => t.status === TestStatus.FAILED);
      if (nonVisualFailures.length > 0) {
        lines.push('### Test Failures');
        lines.push('');

        for (const test of nonVisualFailures) {
          lines.push(`#### ${test.name}`);
          lines.push('');
          lines.push('```');
          lines.push(`Error: ${test.error?.message || 'Unknown error'}`);
          if (test.error?.stack) {
            lines.push('');
            lines.push(test.error.stack);
          }
          lines.push('```');
          lines.push('');
        }
      }
    }

    // Footer
    lines.push('---');
    lines.push('');
    lines.push('## Artifacts');
    lines.push('');
    lines.push(
      '- **Visual Diffs:** `test-results/visual-diffs/` - Contains baseline, current, and diff images'
    );
    lines.push(
      '- **Test Report:** This file - Complete test execution and visual regression results'
    );
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('*Generated by CV Builder Browser Automation Test Framework*');
    lines.push('*Visual Regression Testing powered by pixelmatch*');
    lines.push('');

    // Write markdown file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = join(this.outputDir, `visual-regression-${timestamp}.md`);
    writeFileSync(outputPath, lines.join('\n'), 'utf-8');

    console.log(`Visual diff report written to: ${outputPath}`);

    // Also write summary for PR comments (condensed version)
    this.writePRSummary(summary, visualPassed, visualFailed);
  }

  /**
   * Write condensed PR comment summary
   */
  private writePRSummary(
    summary: {
      totalSuites: number;
      totalTests: number;
      passed: number;
      failed: number;
      skipped: number;
    },
    visualPassed: number,
    visualFailed: number
  ): void {
    const lines: string[] = [];

    const overallPassed = summary.failed === 0 && visualFailed === 0;

    lines.push('## 🤖 Browser Automation Test Results');
    lines.push('');
    lines.push(`**Status:** ${overallPassed ? '✅ ALL TESTS PASSED' : '❌ TESTS FAILED'}`);
    lines.push('');

    // Quick summary
    lines.push('| Category | Passed | Failed | Total |');
    lines.push('|----------|--------|--------|-------|');
    lines.push(
      `| Functional Tests | ${summary.passed} | ${summary.failed} | ${summary.totalTests} |`
    );
    lines.push(
      `| Visual Regression | ${visualPassed} | ${visualFailed} | ${this.visualResults.length} |`
    );
    lines.push('');

    if (visualFailed > 0) {
      lines.push('### ⚠️ Visual Changes Detected');
      lines.push('');
      lines.push(
        `${visualFailed} screenshot(s) differ from baseline. See full report for details.`
      );
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('📊 **[View Full Report](#)** | 🎯 **[View Visual Diffs](#)**');
    lines.push('');

    const summaryPath = join(this.outputDir, 'pr-comment.md');
    writeFileSync(summaryPath, lines.join('\n'), 'utf-8');
  }

  /**
   * Copy visual artifacts to report directory
   */
  private copyVisualArtifacts(): void {
    for (const visual of this.visualResults) {
      if (visual.status === 'failed') {
        const comp = visual.comparison;

        // Copy baseline
        if (existsSync(comp.baselinePath)) {
          const baselineDest = join(this.artifactsDir, basename(comp.baselinePath));
          copyFileSync(comp.baselinePath, baselineDest);
        }

        // Copy current
        if (existsSync(comp.currentPath)) {
          const currentDest = join(this.artifactsDir, basename(comp.currentPath));
          copyFileSync(comp.currentPath, currentDest);
        }

        // Copy diff
        if (comp.diffPath && existsSync(comp.diffPath)) {
          const diffDest = join(this.artifactsDir, basename(comp.diffPath));
          copyFileSync(comp.diffPath, diffDest);
        }
      }
    }
  }

  private getStatusEmoji(status: TestStatus): string {
    switch (status) {
      case TestStatus.PASSED:
        return '✅';
      case TestStatus.FAILED:
        return '❌';
      case TestStatus.SKIPPED:
        return '⏭️';
      default:
        return '❓';
    }
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  }
}
