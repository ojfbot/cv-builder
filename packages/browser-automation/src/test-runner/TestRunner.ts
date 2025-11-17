/**
 * TestRunner - Main orchestrator for executing test suites
 */

import { TestSuite } from './TestSuite.js';
import { RunnerConfig, SuiteResult } from './types.js';
import { Reporter } from './reporters/Reporter.js';
import { ConsoleReporter } from './reporters/ConsoleReporter.js';
import { JSONReporter } from './reporters/JSONReporter.js';
import { MarkdownReporter } from './reporters/MarkdownReporter.js';

export class TestRunner {
  private config: RunnerConfig;
  private reporters: Reporter[] = [];
  private suites: TestSuite[] = [];

  constructor(config: RunnerConfig = {}) {
    this.config = {
      reporters: ['console'],
      bail: false,
      verbose: false,
      ...config,
    };

    // Initialize reporters
    this.initializeReporters();
  }

  /**
   * Initialize reporters based on config
   */
  private initializeReporters(): void {
    const reporterTypes = this.config.reporters || ['console'];

    for (const type of reporterTypes) {
      switch (type) {
        case 'console':
          this.reporters.push(new ConsoleReporter(this.config.verbose || false));
          break;
        case 'json':
          this.reporters.push(new JSONReporter(this.config.outputDir));
          break;
        case 'markdown':
          this.reporters.push(new MarkdownReporter(this.config.outputDir));
          break;
      }
    }
  }

  /**
   * Add a test suite to run
   */
  addSuite(suite: TestSuite): void {
    this.suites.push(suite);
  }

  /**
   * Run a single test suite with error handling and cleanup
   */
  async run(suite: TestSuite): Promise<SuiteResult> {
    try {
      // Notify reporters
      for (const reporter of this.reporters) {
        reporter.onSuiteStart(suite.getName());
      }

      // Execute suite
      const result = await suite.run(this.config.filter);

      // Notify reporters
      for (const reporter of this.reporters) {
        reporter.onSuiteEnd(result);
      }

      return result;
    } catch (error) {
      // Ensure reporters are notified even on catastrophic failure
      const errorResult: SuiteResult = {
        name: suite.getName(),
        tests: [],
        duration: 0,
        summary: { total: 0, passed: 0, failed: 1, skipped: 0 },
        startTime: new Date(),
        endTime: new Date(),
      };

      for (const reporter of this.reporters) {
        reporter.onSuiteEnd(errorResult);
      }

      throw error;
    }
  }

  /**
   * Run all registered test suites
   */
  async runAll(): Promise<{
    suites: SuiteResult[];
    summary: {
      totalSuites: number;
      totalTests: number;
      passed: number;
      failed: number;
      skipped: number;
    };
  }> {
    const results: SuiteResult[] = [];
    let shouldBail = false;

    for (const suite of this.suites) {
      if (shouldBail && this.config.bail) {
        break;
      }

      const result = await this.run(suite);
      results.push(result);

      if (result.summary.failed > 0 && this.config.bail) {
        shouldBail = true;
      }
    }

    // Calculate overall summary
    const summary = {
      totalSuites: results.length,
      totalTests: results.reduce((sum, r) => sum + r.summary.total, 0),
      passed: results.reduce((sum, r) => sum + r.summary.passed, 0),
      failed: results.reduce((sum, r) => sum + r.summary.failed, 0),
      skipped: results.reduce((sum, r) => sum + r.summary.skipped, 0),
    };

    // Notify reporters of final summary
    for (const reporter of this.reporters) {
      reporter.onRunComplete(results, summary);
    }

    return { suites: results, summary };
  }

  /**
   * Get exit code based on results (0 = success, 1 = failure)
   */
  static getExitCode(results: { summary: { failed: number } }): number {
    return results.summary.failed > 0 ? 1 : 0;
  }
}
