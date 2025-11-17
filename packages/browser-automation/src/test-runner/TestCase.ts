/**
 * TestCase class - Encapsulates a single test execution
 */

import {
  TestFunction,
  TestContext,
  TestResult,
  TestStatus,
  AssertionAPI,
} from './types.js';

export class TestCase {
  private name: string;
  private fn: TestFunction;
  private timeoutMs: number;
  private shouldSkip: boolean = false;
  private assertionAPI: AssertionAPI;

  constructor(name: string, fn: TestFunction, assertionAPI: AssertionAPI, timeout: number = 30000) {
    this.name = name;
    this.fn = fn;
    this.assertionAPI = assertionAPI;
    this.timeoutMs = timeout;
  }

  /**
   * Execute the test case
   */
  async run(): Promise<TestResult> {
    const startTime = new Date();
    const result: TestResult = {
      name: this.name,
      status: TestStatus.PENDING,
      duration: 0,
      startTime,
    };

    if (this.shouldSkip) {
      result.status = TestStatus.SKIPPED;
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();
      return result;
    }

    result.status = TestStatus.RUNNING;

    try {
      // Create test context
      const context: TestContext = {
        assert: this.assertionAPI,
        skip: () => {
          this.shouldSkip = true;
          throw new Error('Test skipped');
        },
        timeout: (ms: number) => {
          this.timeoutMs = ms;
        },
      };

      // Run test with timeout
      await this.runWithTimeout(this.fn(context), this.timeoutMs);

      result.status = TestStatus.PASSED;
    } catch (error) {
      if (this.shouldSkip) {
        result.status = TestStatus.SKIPPED;
      } else {
        result.status = TestStatus.FAILED;
        result.error = error instanceof Error ? error : new Error(String(error));
      }
    } finally {
      const endTime = new Date();
      result.endTime = endTime;
      result.duration = endTime.getTime() - startTime.getTime();
    }

    return result;
  }

  /**
   * Run a promise with timeout
   */
  private async runWithTimeout<T>(promise: Promise<T> | T, timeoutMs: number): Promise<T> {
    // If it's not a promise, just return it
    if (!(promise instanceof Promise)) {
      return promise;
    }

    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Test timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  /**
   * Get test name
   */
  getName(): string {
    return this.name;
  }
}
