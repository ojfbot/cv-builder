/**
 * Reporter base interface - All reporters must implement this
 */

import { SuiteResult } from '../types.js';

export interface Reporter {
  /**
   * Called when a test suite starts
   */
  onSuiteStart(suiteName: string): void;

  /**
   * Called when a test suite completes
   */
  onSuiteEnd(result: SuiteResult): void;

  /**
   * Called when all test runs are complete
   */
  onRunComplete(
    results: SuiteResult[],
    summary: {
      totalSuites: number;
      totalTests: number;
      passed: number;
      failed: number;
      skipped: number;
    }
  ): void;
}
