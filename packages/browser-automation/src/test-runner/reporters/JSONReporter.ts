/**
 * JSONReporter - Machine-readable JSON output
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Reporter } from './Reporter.js';
import { SuiteResult } from '../types.js';

export class JSONReporter implements Reporter {
  private outputDir: string;
  private results: SuiteResult[] = [];

  constructor(outputDir: string = './test-results') {
    this.outputDir = outputDir;
  }

  onSuiteStart(_suiteName: string): void {
    // No-op for JSON reporter
  }

  onSuiteEnd(result: SuiteResult): void {
    this.results.push(result);
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
    const output = {
      timestamp: new Date().toISOString(),
      summary,
      suites: results.map((suite) => ({
        name: suite.name,
        duration: suite.duration,
        startTime: suite.startTime.toISOString(),
        endTime: suite.endTime?.toISOString(),
        summary: suite.summary,
        tests: suite.tests.map((test) => ({
          name: test.name,
          status: test.status,
          duration: test.duration,
          startTime: test.startTime.toISOString(),
          endTime: test.endTime?.toISOString(),
          error: test.error
            ? {
                message: test.error.message,
                stack: test.error.stack,
              }
            : undefined,
        })),
      })),
    };

    // Ensure output directory exists
    try {
      mkdirSync(this.outputDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Write JSON file
    const outputPath = join(this.outputDir, `test-results-${Date.now()}.json`);
    writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

    console.log(`JSON report written to: ${outputPath}`);
  }
}
