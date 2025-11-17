/**
 * Core types for the test framework
 */

/**
 * Test status enumeration
 */
export enum TestStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

/**
 * Result of a single test case execution
 */
export interface TestResult {
  name: string;
  status: TestStatus;
  duration: number; // milliseconds
  error?: Error;
  startTime: Date;
  endTime?: Date;
}

/**
 * Result of a test suite execution
 */
export interface SuiteResult {
  name: string;
  tests: TestResult[];
  duration: number; // milliseconds
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  startTime: Date;
  endTime?: Date;
}

/**
 * Test function signature
 */
export type TestFunction = (context: TestContext) => Promise<void> | void;

/**
 * Lifecycle hook function signature
 */
export type HookFunction = () => Promise<void> | void;

/**
 * Test context provided to each test
 */
export interface TestContext {
  assert: AssertionAPI;
  skip: () => void;
  timeout: (ms: number) => void;
}

/**
 * Assertion API interface (will be implemented in assertions/)
 */
export interface AssertionAPI {
  // Element assertions
  elementExists(selector: string, message?: string): Promise<void>;
  elementVisible(selector: string, message?: string): Promise<void>;
  elementHidden(selector: string, message?: string): Promise<void>;
  elementEnabled(selector: string, message?: string): Promise<void>;
  elementDisabled(selector: string, message?: string): Promise<void>;
  elementCount(selector: string, count: number, message?: string): Promise<void>;
  textContains(selector: string, text: string, message?: string): Promise<void>;
  textEquals(selector: string, text: string, message?: string): Promise<void>;
  attributeEquals(
    selector: string,
    attr: string,
    value: string,
    message?: string
  ): Promise<void>;

  // Screenshot assertions
  screenshotCaptured(result: any, message?: string): void;
  screenshotSize(result: any, minBytes: number, message?: string): void;
  screenshotPath(result: any, expectedPath: string, message?: string): void;

  // Navigation assertions
  urlEquals(url: string, message?: string): Promise<void>;
  urlContains(fragment: string, message?: string): Promise<void>;
  titleEquals(title: string, message?: string): Promise<void>;
  titleContains(text: string, message?: string): Promise<void>;
}

/**
 * Test suite configuration options
 */
export interface SuiteOptions {
  baseUrl?: string;
  screenshotDir?: string;
  timeout?: number;
  retries?: number;
  parallel?: boolean;
}

/**
 * Test runner configuration
 */
export interface RunnerConfig {
  reporters?: ('console' | 'json' | 'markdown')[];
  outputDir?: string;
  bail?: boolean; // Stop on first failure
  verbose?: boolean;
  filter?: string; // Test name filter
}
