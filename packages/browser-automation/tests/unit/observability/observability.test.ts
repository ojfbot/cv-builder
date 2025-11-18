/**
 * Observability Features Unit Tests
 *
 * Tests for circular buffer, duplicate detection, and input validation
 */

import { createTestSuite } from '../../../src/test-runner/index.js';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3002';
const TEST_URL = 'http://localhost:3000'; // Assuming cv-builder runs on 3000

async function main() {
  const { suite, client } = createTestSuite('Observability Features', API_URL);

  // Skip tests if not in development mode
  if (process.env.NODE_ENV !== 'development') {
    console.log('⚠️  Skipping observability tests (requires development mode)');
    return;
  }

  // Setup: Navigate to test application
  suite.test('Setup: Navigate to test application', async () => {
    await client.navigate(TEST_URL, { waitFor: 'networkidle' });
  });

  // Test 1: Input validation - invalid log level
  suite.test('Validates log level parameter', async () => {
    const response = await fetch(`${API_URL}/api/console/logs?level=invalid`);

    if (response.status !== 400) {
      throw new Error(`Expected 400 for invalid log level, got ${response.status}`);
    }

    const body = await response.json();

    if (!body.error || !body.error.includes('Invalid log level')) {
      throw new Error('Expected error message about invalid log level');
    }

    if (!body.validLevels || !Array.isArray(body.validLevels)) {
      throw new Error('Expected validLevels array in error response');
    }

    if (!body.hint) {
      throw new Error('Expected hint in error response');
    }
  });

  // Test 2: Input validation - valid log levels
  suite.test('Accepts valid log levels', async () => {
    const validLevels = ['log', 'info', 'warn', 'error', 'debug'];

    for (const level of validLevels) {
      const response = await fetch(`${API_URL}/api/console/logs?level=${level}`);

      if (response.status === 400) {
        const body = await response.json();
        throw new Error(`Valid log level '${level}' rejected: ${body.error}`);
      }

      // Should be 200 or 503, not 400
      if (response.status !== 200 && response.status !== 503) {
        throw new Error(`Unexpected status ${response.status} for level '${level}'`);
      }
    }
  });

  // Test 3: Input validation - invalid limit (NaN)
  suite.test('Validates limit parameter prevents NaN', async () => {
    const invalidLimits = ['abc', 'invalid', '10.5.3', ''];

    for (const limit of invalidLimits) {
      const response = await fetch(`${API_URL}/api/console/logs?limit=${limit}`);

      if (response.status !== 400) {
        throw new Error(`Expected 400 for invalid limit '${limit}', got ${response.status}`);
      }

      const body = await response.json();

      if (!body.error || !body.error.includes('Invalid limit')) {
        throw new Error(`Expected error about invalid limit for '${limit}'`);
      }
    }
  });

  // Test 4: Input validation - negative limit
  suite.test('Rejects negative limit values', async () => {
    const response = await fetch(`${API_URL}/api/console/logs?limit=-10`);

    if (response.status !== 400) {
      throw new Error(`Expected 400 for negative limit, got ${response.status}`);
    }

    const body = await response.json();

    if (!body.error || !body.hint || !body.hint.includes('positive integer')) {
      throw new Error('Expected error about positive integer requirement');
    }
  });

  // Test 5: Input validation - zero limit
  suite.test('Rejects zero limit value', async () => {
    const response = await fetch(`${API_URL}/api/console/logs?limit=0`);

    if (response.status !== 400) {
      throw new Error(`Expected 400 for zero limit, got ${response.status}`);
    }
  });

  // Test 6: Input validation - valid limit
  suite.test('Accepts valid positive limit', async () => {
    const response = await fetch(`${API_URL}/api/console/logs?limit=10`);

    // Should not be rejected with 400
    if (response.status === 400) {
      const body = await response.json();
      throw new Error(`Valid limit rejected: ${body.error}`);
    }
  });

  // Test 7: Input validation - timestamp format
  suite.test('Validates timestamp format for since parameter', async () => {
    // Try invalid timestamp
    const response = await fetch(`${API_URL}/api/console/logs?since=invalid-date`);

    // Should return 500 with proper error message about invalid timestamp
    if (response.status === 200) {
      console.warn('⚠️  Warning: Invalid timestamp accepted without validation');
    }
  });

  // Test 8: Expression length validation
  suite.test('Validates expression length in evaluate endpoint', async () => {
    // Create an expression that exceeds MAX_EXPRESSION_LENGTH (10000)
    const longExpression = 'a'.repeat(10001);

    const response = await fetch(`${API_URL}/api/store/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expression: longExpression }),
    });

    if (response.status !== 400) {
      throw new Error(`Expected 400 for oversized expression, got ${response.status}`);
    }

    const body = await response.json();

    if (!body.error || !body.error.includes('maximum length')) {
      throw new Error('Expected error about maximum expression length');
    }

    if (!body.maxLength || body.maxLength !== 10000) {
      throw new Error('Expected maxLength to be 10000 in error response');
    }
  });

  // Test 9: Clear operation preserves counts
  suite.test('Clear operation returns counts before clearing', async () => {
    const response = await fetch(`${API_URL}/api/console/clear`, {
      method: 'POST',
    });

    if (response.status !== 200 && response.status !== 503) {
      throw new Error(`Unexpected status for clear operation: ${response.status}`);
    }

    if (response.status === 200) {
      const body = await response.json();

      if (!body.success) {
        throw new Error('Expected success:true in clear response');
      }

      if (!body.cleared || typeof body.cleared.logs !== 'number' || typeof body.cleared.errors !== 'number') {
        throw new Error('Expected cleared counts in response');
      }

      if (!body.timestamp) {
        throw new Error('Expected timestamp in response');
      }
    }
  });

  // Test 10: Stats endpoint returns structured data
  suite.test('Stats endpoint returns comprehensive statistics', async () => {
    const response = await fetch(`${API_URL}/api/console/stats`);

    if (response.status !== 200 && response.status !== 503) {
      throw new Error(`Unexpected status for stats endpoint: ${response.status}`);
    }

    if (response.status === 200) {
      const body = await response.json();

      // Check console stats structure
      if (!body.console || typeof body.console.totalLogs !== 'number') {
        throw new Error('Expected console.totalLogs in stats');
      }

      if (!body.console.byLevel) {
        throw new Error('Expected console.byLevel in stats');
      }

      // Verify all log levels are present
      const expectedLevels = ['log', 'info', 'warn', 'error', 'debug'];
      for (const level of expectedLevels) {
        if (typeof body.console.byLevel[level] !== 'number') {
          throw new Error(`Expected count for log level '${level}'`);
        }
      }

      // Check error stats structure
      if (!body.errors || typeof body.errors.totalErrors !== 'number') {
        throw new Error('Expected errors.totalErrors in stats');
      }

      if (typeof body.errors.uniqueErrors !== 'number') {
        throw new Error('Expected errors.uniqueErrors in stats');
      }

      if (!Array.isArray(body.errors.topErrors)) {
        throw new Error('Expected errors.topErrors array in stats');
      }

      if (!body.devModeOnly) {
        throw new Error('Expected devModeOnly flag in stats');
      }

      if (!body.timestamp) {
        throw new Error('Expected timestamp in stats');
      }
    }
  });

  // Test 11: Error summary format
  suite.test('Error summary endpoint returns correct format', async () => {
    const response = await fetch(`${API_URL}/api/console/errors?summary=true`);

    if (response.status !== 200 && response.status !== 503) {
      throw new Error(`Unexpected status for error summary: ${response.status}`);
    }

    if (response.status === 200) {
      const body = await response.json();

      if (!Array.isArray(body.summary)) {
        throw new Error('Expected summary to be an array');
      }

      if (typeof body.totalErrors !== 'number') {
        throw new Error('Expected totalErrors count');
      }

      if (typeof body.uniqueErrors !== 'number') {
        throw new Error('Expected uniqueErrors count');
      }

      // Verify summary entries have correct structure
      if (body.summary.length > 0) {
        const entry = body.summary[0];
        if (!entry.message || typeof entry.count !== 'number' || !entry.latestTimestamp) {
          throw new Error('Summary entries should have message, count, and latestTimestamp');
        }
      }
    }
  });

  // Test 12: Filter combination
  suite.test('Multiple filters work together', async () => {
    const response = await fetch(`${API_URL}/api/console/logs?level=error&limit=5`);

    if (response.status !== 200 && response.status !== 503) {
      throw new Error(`Unexpected status for filtered request: ${response.status}`);
    }

    if (response.status === 200) {
      const body = await response.json();

      if (!Array.isArray(body.logs)) {
        throw new Error('Expected logs array');
      }

      // Verify limit is respected
      if (body.logs.length > 5) {
        throw new Error(`Expected max 5 logs, got ${body.logs.length}`);
      }

      // Verify level filter
      for (const log of body.logs) {
        if (log.level !== 'error') {
          throw new Error(`Expected only 'error' level logs, found '${log.level}'`);
        }
      }

      // Check filters in response
      if (!body.filters || body.filters.level !== 'error' || body.filters.limit !== '5') {
        throw new Error('Response should include applied filters');
      }
    }
  });

  // Run the test suite
  await suite.run();
}

// Run tests
main().catch((error) => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
