/**
 * Browser Observability Module
 *
 * Provides console logging and error tracking capabilities for debugging
 * browser automation tests. All features are dev-mode only for security.
 *
 * @module observability
 */

export { ConsoleLogger, ConsoleEntry, GetLogsOptions } from './console-logger';
export { ErrorTracker, JavaScriptError } from './error-tracker';
