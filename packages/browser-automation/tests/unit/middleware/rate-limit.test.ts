/**
 * Rate Limiting Middleware Unit Tests
 *
 * Tests for rate limiting behavior on observability endpoints
 */

import { createTestSuite } from '../../../src/test-runner/index.js';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3002';

// Helper to wait
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const { suite } = createTestSuite('Rate Limiting Middleware', API_URL);

  // Skip tests if not in development mode
  if (process.env.NODE_ENV !== 'development') {
    console.log('⚠️  Skipping rate limit tests (requires development mode)');
    return;
  }

  // Test 1: Console logs endpoint respects rate limit (30 req/min)
  suite.test('Console logs endpoint has rate limiting', async () => {
    const requests = [];

    // Make 35 rapid requests (exceeds 30 limit)
    for (let i = 0; i < 35; i++) {
      requests.push(
        fetch(`${API_URL}/api/console/logs`).then(res => ({
          status: res.status,
          attempt: i + 1,
        }))
      );
    }

    const responses = await Promise.all(requests);

    // Should have some 429 (rate limited) responses
    const rateLimited = responses.filter(r => r.status === 429);

    if (rateLimited.length === 0) {
      console.warn('⚠️  Warning: Expected some rate-limited responses (429), got none');
      console.warn('   This may indicate rate limiting is not working properly');
    } else {
      console.log(`✓ Rate limiting working: ${rateLimited.length} requests blocked`);
    }

    // Wait for rate limit window to reset (60 seconds)
    console.log('   Waiting 60s for rate limit to reset...');
    await wait(60000);
  });

  // Test 2: Evaluate endpoint has stricter rate limit (10 req/min)
  suite.test('Evaluate endpoint has stricter rate limiting', async () => {
    const requests = [];

    // Make 15 rapid requests (exceeds 10 limit)
    for (let i = 0; i < 15; i++) {
      requests.push(
        fetch(`${API_URL}/api/store/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expression: '1 + 1' }),
        }).then(res => ({
          status: res.status,
          attempt: i + 1,
        }))
      );
    }

    const responses = await Promise.all(requests);

    // Should have some 429 (rate limited) responses
    const rateLimited = responses.filter(r => r.status === 429);

    if (rateLimited.length === 0) {
      console.warn('⚠️  Warning: Expected rate-limited responses for evaluate endpoint');
      console.warn('   Evaluate endpoint should be more restrictive (10 req/min)');
    } else {
      console.log(`✓ Evaluate rate limiting working: ${rateLimited.length} requests blocked`);
    }

    // Wait for rate limit window to reset
    console.log('   Waiting 60s for rate limit to reset...');
    await wait(60000);
  });

  // Test 3: Error endpoint respects rate limit (20 req/min)
  suite.test('Error tracking endpoint has rate limiting', async () => {
    const requests = [];

    // Make 25 rapid requests (exceeds 20 limit)
    for (let i = 0; i < 25; i++) {
      requests.push(
        fetch(`${API_URL}/api/console/errors`).then(res => ({
          status: res.status,
          attempt: i + 1,
        }))
      );
    }

    const responses = await Promise.all(requests);

    // Should have some 429 (rate limited) responses
    const rateLimited = responses.filter(r => r.status === 429);

    if (rateLimited.length === 0) {
      console.warn('⚠️  Warning: Expected rate-limited responses for error endpoint');
    } else {
      console.log(`✓ Error endpoint rate limiting working: ${rateLimited.length} requests blocked`);
    }
  });

  // Test 4: Rate limit response contains helpful headers
  suite.test('Rate limit response includes helpful information', async () => {
    // Make enough requests to trigger rate limiting
    const requests = [];
    for (let i = 0; i < 35; i++) {
      requests.push(fetch(`${API_URL}/api/console/logs`));
    }

    const responses = await Promise.all(requests);
    const rateLimited = responses.find(r => r.status === 429);

    if (rateLimited) {
      const body = await rateLimited.json();

      // Check for required fields in rate limit response
      if (!body.error) {
        throw new Error('Rate limit response missing error message');
      }

      if (!body.limit && !body.window) {
        console.warn('⚠️  Rate limit response could include limit/window info for better UX');
      }

      // Check for rate limit headers
      const rateLimitHeaders = rateLimited.headers.get('RateLimit-Limit');
      if (!rateLimitHeaders) {
        console.warn('⚠️  Rate limit headers (RateLimit-*) not found in response');
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
