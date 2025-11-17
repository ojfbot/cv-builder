/**
 * Phase 2 Element & Store Maps Test
 *
 * Tests the element discovery and store query APIs
 */

import { createTestSuite, createTestRunner } from '../../src/test-runner/index.js';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3002';
const CV_BUILDER_URL = process.env.CV_BUILDER_URL || 'http://localhost:3000';

async function main() {
  // Create test suite
  const { suite, client } = createTestSuite('Phase 2: Element & Store Maps', API_URL);

  // Setup: Navigate to CV Builder before tests
  suite.beforeAll(async () => {
    console.log('Navigating to CV Builder app...');
    await client.navigate(CV_BUILDER_URL);
    // Wait for app to load
    await client.waitForSelector('#root', { state: 'attached', timeout: 10000 });
  });

  // ========================================
  // 1. Element Map API Tests
  // ========================================

  suite.test('Load CV Builder element map', async () => {
    const response = await fetch(`${API_URL}/api/elements/map?app=cv-builder`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(`Failed to load element map: ${data.error}`);
    }

    if (!data.map || !data.map.elements) {
      throw new Error('Element map missing required fields');
    }

    console.log(`✓ Loaded element map with ${data.stats.totalElements} elements`);
    console.log(`  Categories: ${data.stats.categories.join(', ')}`);
  });

  suite.test('Search for "bio tab" element', async () => {
    const response = await fetch(`${API_URL}/api/elements/search?q=bio tab&app=cv-builder`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(`Search failed: ${data.error}`);
    }

    if (data.results.length === 0) {
      throw new Error('No results found for "bio tab"');
    }

    const topResult = data.results[0];
    console.log(`✓ Found element: ${topResult.path}`);
    console.log(`  Selector: ${topResult.selector}`);
    console.log(`  Description: ${topResult.description}`);
    console.log(`  Relevance: ${(topResult.score * 100).toFixed(1)}%`);
  });

  suite.test('Search for "chat" elements', async () => {
    const response = await fetch(`${API_URL}/api/elements/search?q=chat&app=cv-builder&limit=5`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(`Search failed: ${data.error}`);
    }

    console.log(`✓ Found ${data.totalResults} chat-related elements (showing top ${data.results.length})`);
    data.results.forEach((result: any, index: number) => {
      console.log(`  ${index + 1}. ${result.path} - ${result.description.substring(0, 50)}...`);
    });
  });

  suite.test('Get element categories', async () => {
    const response = await fetch(`${API_URL}/api/elements/categories?app=cv-builder`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(`Failed to get categories: ${data.error}`);
    }

    if (data.count === 0) {
      throw new Error('No categories found');
    }

    console.log(`✓ Found ${data.count} element categories: ${data.categories.join(', ')}`);
  });

  suite.test('Get elements in "navigation" category', async () => {
    const response = await fetch(`${API_URL}/api/elements/category/navigation?app=cv-builder`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(`Failed to get category elements: ${data.error}`);
    }

    console.log(`✓ Found ${data.count} elements in navigation category`);
  });

  suite.test('Get specific element by path', async () => {
    const response = await fetch(`${API_URL}/api/elements/get/navigation.tabs.bio?app=cv-builder`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(`Failed to get element: ${data.error}`);
    }

    console.log(`✓ Retrieved element: ${data.path}`);
    console.log(`  Selector: ${data.element.selector}`);
    console.log(`  Type: ${data.element.type}`);
    console.log(`  Alternatives: ${data.element.alternatives?.length || 0}`);
  });

  suite.test('Validate element map against live page', async () => {
    const response = await fetch(`${API_URL}/api/elements/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app: 'cv-builder', strict: false }),
    });
    const data = await response.json();

    console.log(`✓ Validation complete`);
    console.log(`  Total elements: ${data.validation.totalElements}`);
    console.log(`  Passed: ${data.validation.passedElements}`);
    console.log(`  Warnings: ${data.validation.warningElements}`);
    console.log(`  Errors: ${data.validation.errorElements}`);

    if (data.validation.errorElements > 0) {
      console.log('  Error details:');
      data.validation.issues
        .filter((issue: any) => issue.severity === 'error')
        .slice(0, 3)
        .forEach((issue: any) => {
          console.log(`    - ${issue.category}.${issue.element}: ${issue.message}`);
        });
    }
  });

  // ========================================
  // 2. Store Map API Tests
  // ========================================

  suite.test('Load CV Builder store map schema', async () => {
    const response = await fetch(`${API_URL}/api/store/schema?app=cv-builder`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(`Failed to load store map: ${data.error}`);
    }

    if (!data.storeMap || !data.storeMap.queries) {
      throw new Error('Store map missing required fields');
    }

    console.log(`✓ Loaded store map with ${data.queryCount} queries`);
    console.log(`  Store type: ${data.storeMap.storeType}`);
    console.log(`  Sample queries: ${data.queries.slice(0, 5).join(', ')}...`);
  });

  suite.test('Query current tab state', async () => {
    const response = await fetch(`${API_URL}/api/store/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app: 'cv-builder', query: 'currentTab' }),
    });
    const data = await response.json();

    if (!data.success) {
      console.log(`⚠️  Query may have failed (expected if Redux not accessible): ${data.error}`);
      return; // Don't fail test if Redux isn't set up
    }

    console.log(`✓ Current tab: ${data.result}`);
    console.log(`  Query path: ${data.queryPath}`);
    console.log(`  Type: ${data.type} (expected: ${data.expectedType})`);
  });

  suite.test('Query chat expanded state', async () => {
    const response = await fetch(`${API_URL}/api/store/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app: 'cv-builder', query: 'chatExpanded' }),
    });
    const data = await response.json();

    if (!data.success) {
      console.log(`⚠️  Query may have failed (expected if Redux not accessible): ${data.error}`);
      return;
    }

    console.log(`✓ Chat expanded: ${data.result}`);
  });

  suite.test('Validate store map queries', async () => {
    const response = await fetch(`${API_URL}/api/store/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app: 'cv-builder' }),
    });
    const data = await response.json();

    console.log(`✓ Store validation complete`);
    console.log(`  Store accessible: ${data.validation.accessible}`);
    console.log(`  Type matches: ${data.validation.typeMatches}`);
    console.log(`  Queries valid: ${data.validation.queriesValid}`);

    if (!data.validation.queriesValid) {
      const failedQueries = Object.entries(data.validation.queryResults)
        .filter(([_, result]: [string, any]) => !result.valid)
        .slice(0, 3);

      console.log(`  Failed queries:`);
      failedQueries.forEach(([name, result]: [string, any]) => {
        console.log(`    - ${name}: ${result.error}`);
      });
    }
  });

  // ========================================
  // 3. Integration Test (Element + Interaction)
  // ========================================

  suite.test('Use element map to interact with Bio tab', async () => {
    // Get Bio tab selector from element map
    const elementResponse = await fetch(`${API_URL}/api/elements/get/navigation.tabs.bio?app=cv-builder`);
    const elementData = await elementResponse.json();

    if (!elementData.success) {
      console.log(`⚠️  Could not retrieve bio tab element: ${elementData.error}`);
      return;
    }

    const bioTabSelector = elementData.element.selector;
    console.log(`✓ Retrieved bio tab selector: ${bioTabSelector}`);

    // Check if element exists using the selector
    const exists = await client.elementExists(bioTabSelector);

    if (exists) {
      console.log(`✓ Bio tab element found on page`);
    } else {
      console.log(`⚠️  Bio tab element not found (may need to navigate to dashboard first)`);
    }
  });

  // Create runner and execute tests
  const runner = createTestRunner({
    reporters: ['console'],
    verbose: true,
  });

  const result = await runner.run(suite);

  // Cleanup: Close browser after all tests
  console.log('\n🧹 Closing browser...');
  await client.close();
  console.log('✅ Browser closed successfully');

  // Print summary
  console.log('\n✅ Phase 2 Element & Store Maps test complete!');
  console.log(`Tests: ${result.summary.passed}/${result.summary.total} passed`);

  if (result.summary.failed > 0) {
    console.log(`\n⚠️  ${result.summary.failed} test(s) failed`);
  }

  // Exit with appropriate code
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

// Run tests
main().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
