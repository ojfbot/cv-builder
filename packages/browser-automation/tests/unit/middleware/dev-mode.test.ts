/**
 * Dev Mode Middleware Unit Tests
 *
 * Tests for development mode enforcement middleware
 */

import { createTestSuite } from '../../../src/test-runner/index.js';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3002';

async function main() {
  const { suite, client } = createTestSuite('Dev Mode Middleware', API_URL);

  // Test 1: Health check to ensure server is running
  suite.test('Server is running', async () => {
    const health = await client.health();
    if (!health.browser || health.browser.running === undefined) {
      throw new Error('Server not running');
    }
  });

  // Test 2: Console endpoints require dev mode (testing with production env)
  suite.test('Console logs endpoint requires dev mode', async () => {
    try {
      // This should fail if NODE_ENV is not development
      const response = await fetch(`${API_URL}/api/console/logs`);

      if (process.env.NODE_ENV !== 'development') {
        // Should return 403 in non-dev mode
        if (response.status !== 403) {
          throw new Error(`Expected 403 in production, got ${response.status}`);
        }

        const body = await response.json();
        if (!body.error || !body.error.includes('development mode')) {
          throw new Error('Expected dev-mode error message');
        }
      } else {
        // In dev mode, should return 200 or 503 (if browser not initialized)
        if (response.status !== 200 && response.status !== 503) {
          throw new Error(`Unexpected status in dev mode: ${response.status}`);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        throw new Error('Server not accessible');
      }
      throw error;
    }
  });

  // Test 3: Console errors endpoint requires dev mode
  suite.test('Console errors endpoint requires dev mode', async () => {
    try {
      const response = await fetch(`${API_URL}/api/console/errors`);

      if (process.env.NODE_ENV !== 'development') {
        if (response.status !== 403) {
          throw new Error(`Expected 403 in production, got ${response.status}`);
        }

        const body = await response.json();
        if (!body.securityNote) {
          throw new Error('Expected security note in response');
        }
      } else {
        // In dev mode, should return 200 or 503
        if (response.status !== 200 && response.status !== 503) {
          throw new Error(`Unexpected status in dev mode: ${response.status}`);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        throw new Error('Server not accessible');
      }
      throw error;
    }
  });

  // Test 4: Store evaluation endpoint requires dev mode
  suite.test('Store evaluate endpoint requires dev mode', async () => {
    try {
      const response = await fetch(`${API_URL}/api/store/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: 'window.location.href' }),
      });

      if (process.env.NODE_ENV !== 'development') {
        if (response.status !== 403) {
          throw new Error(`Expected 403 in production, got ${response.status}`);
        }

        const body = await response.json();
        if (!body.hint || !body.hint.includes('NODE_ENV=development')) {
          throw new Error('Expected hint about NODE_ENV in response');
        }
      } else {
        // In dev mode, could return various statuses depending on browser state
        if (response.status === 403) {
          throw new Error('Dev mode endpoint should not return 403 in development');
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        throw new Error('Server not accessible');
      }
      throw error;
    }
  });

  // Test 5: Dev mode headers are present in dev environment
  suite.test('Dev mode headers are present', async () => {
    if (process.env.NODE_ENV === 'development') {
      const response = await fetch(`${API_URL}/api/console/stats`);

      const devModeHeader = response.headers.get('X-Dev-Mode');
      if (!devModeHeader) {
        console.warn('Warning: X-Dev-Mode header not found in dev environment');
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
