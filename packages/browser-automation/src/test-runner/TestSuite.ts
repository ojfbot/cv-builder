/**
 * TestSuite class - Groups related tests with shared setup/teardown
 */

import { TestCase } from './TestCase.js';
import {
  TestFunction,
  HookFunction,
  SuiteOptions,
  SuiteResult,
  TestStatus,
  AssertionAPI,
} from './types.js';
import { TEST_TIMEOUTS } from './constants.js';

export class TestSuite {
  private name: string;
  private tests: TestCase[] = [];
  private options: SuiteOptions;
  private beforeAllHooks: HookFunction[] = [];
  private afterAllHooks: HookFunction[] = [];
  private beforeEachHooks: HookFunction[] = [];
  private afterEachHooks: HookFunction[] = [];
  private assertionAPI: AssertionAPI;

  constructor(name: string, assertionAPI: AssertionAPI, options: SuiteOptions = {}) {
    this.name = name;
    this.assertionAPI = assertionAPI;
    this.options = {
      timeout: TEST_TIMEOUTS.DEFAULT,
      retries: 0,
      parallel: false,
      ...options,
    };
  }

  /**
   * Add a test case to the suite
   */
  test(name: string, fn: TestFunction): void {
    const testCase = new TestCase(name, fn, this.assertionAPI, this.options.timeout);
    this.tests.push(testCase);
  }

  /**
   * Register beforeAll hook
   */
  beforeAll(fn: HookFunction): void {
    this.beforeAllHooks.push(fn);
  }

  /**
   * Register afterAll hook
   */
  afterAll(fn: HookFunction): void {
    this.afterAllHooks.push(fn);
  }

  /**
   * Register beforeEach hook
   */
  beforeEach(fn: HookFunction): void {
    this.beforeEachHooks.push(fn);
  }

  /**
   * Register afterEach hook
   */
  afterEach(fn: HookFunction): void {
    this.afterEachHooks.push(fn);
  }

  /**
   * Execute all tests in the suite
   */
  async run(filter?: string): Promise<SuiteResult> {
    const startTime = new Date();
    const result: SuiteResult = {
      name: this.name,
      tests: [],
      duration: 0,
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
      },
      startTime,
    };

    try {
      // Run beforeAll hooks
      await this.runHooks(this.beforeAllHooks);

      // Filter tests if needed
      const testsToRun = filter
        ? this.tests.filter((t) => t.getName().includes(filter))
        : this.tests;

      result.summary.total = testsToRun.length;

      // Run tests (sequential or parallel based on options)
      if (this.options.parallel) {
        const testPromises = testsToRun.map((test) => this.runTestWithHooks(test));
        result.tests = await Promise.all(testPromises);
      } else {
        for (const test of testsToRun) {
          const testResult = await this.runTestWithHooks(test);
          result.tests.push(testResult);
        }
      }

      // Calculate summary
      result.summary.passed = result.tests.filter((t) => t.status === TestStatus.PASSED).length;
      result.summary.failed = result.tests.filter((t) => t.status === TestStatus.FAILED).length;
      result.summary.skipped = result.tests.filter((t) => t.status === TestStatus.SKIPPED).length;
    } finally {
      // Run afterAll hooks
      await this.runHooks(this.afterAllHooks);

      const endTime = new Date();
      result.endTime = endTime;
      result.duration = endTime.getTime() - startTime.getTime();
    }

    return result;
  }

  /**
   * Run a test with beforeEach/afterEach hooks
   */
  private async runTestWithHooks(test: TestCase) {
    try {
      await this.runHooks(this.beforeEachHooks);
      const result = await test.run();
      return result;
    } finally {
      await this.runHooks(this.afterEachHooks);
    }
  }

  /**
   * Execute lifecycle hooks
   */
  private async runHooks(hooks: HookFunction[]): Promise<void> {
    for (const hook of hooks) {
      await hook();
    }
  }

  /**
   * Get suite name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get suite options
   */
  getOptions(): SuiteOptions {
    return this.options;
  }

  /**
   * Get number of tests
   */
  getTestCount(): number {
    return this.tests.length;
  }
}
