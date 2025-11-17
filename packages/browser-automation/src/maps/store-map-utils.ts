/**
 * Store Map Utilities
 *
 * Helper functions for querying application state and waiting for state changes.
 */

import fs from 'fs/promises';
import path from 'path';
import type { Page } from 'playwright';
import type {
  StoreMap,
  StoreQuery,
  StoreWaitResponse,
  StoreValidationResult,
} from './store-map.js';

/**
 * Load store map from JSON file
 */
export async function loadStoreMap(appName: string): Promise<StoreMap> {
  const mapPath = path.join(process.cwd(), 'tests', 'store-maps', `${appName}.json`);

  try {
    const content = await fs.readFile(mapPath, 'utf-8');
    const map: StoreMap = JSON.parse(content);
    return map;
  } catch (error) {
    throw new Error(`Failed to load store map for app "${appName}": ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Save store map to JSON file
 */
export async function saveStoreMap(map: StoreMap): Promise<void> {
  const mapPath = path.join(process.cwd(), 'tests', 'store-maps', `${map.app}.json`);

  try {
    await fs.writeFile(mapPath, JSON.stringify(map, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to save store map: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Query store state by query name
 */
export async function queryStore(page: Page, storeMap: StoreMap, query: StoreQuery): Promise<any> {
  const accessPath = storeMap.accessPath;
  const queryPath = query.path;

  try {
    const result = await page.evaluate(
      ({ accessPath, queryPath }) => {
        // Access the store
        const store = eval(accessPath);

        // Get state (handle both Redux and other store types)
        let state = store;
        if (typeof store.getState === 'function') {
          state = store.getState();
        }

        // Navigate the query path
        const parts = queryPath.split('.');
        let value = state;

        for (const part of parts) {
          if (part === 'state') continue; // Skip root 'state' keyword
          if (value === null || value === undefined) break;
          value = value[part];
        }

        return value;
      },
      { accessPath, queryPath }
    );

    return result;
  } catch (error) {
    throw new Error(`Failed to query store: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Wait for store state to match expected value
 */
export async function waitForStoreState(
  page: Page,
  storeMap: StoreMap,
  query: StoreQuery,
  expectedValue: any,
  timeout: number = 30000,
  pollInterval: number = 100
): Promise<StoreWaitResponse> {
  const startTime = Date.now();
  let actualValue: any;
  let success = false;

  while (Date.now() - startTime < timeout) {
    actualValue = await queryStore(page, storeMap, query);

    if (deepEqual(actualValue, expectedValue)) {
      success = true;
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  const elapsed = Date.now() - startTime;

  return {
    success,
    query: query.path,
    value: expectedValue,
    actualValue: success ? undefined : actualValue,
    timestamp: new Date().toISOString(),
    elapsed,
  };
}

/**
 * Get full store snapshot
 */
export async function getStoreSnapshot(page: Page, storeMap: StoreMap): Promise<any> {
  const accessPath = storeMap.accessPath;

  try {
    const snapshot = await page.evaluate((accessPath) => {
      const store = eval(accessPath);

      // Handle Redux
      if (typeof store.getState === 'function') {
        return store.getState();
      }

      // Handle other stores
      return store;
    }, accessPath);

    return snapshot;
  } catch (error) {
    throw new Error(`Failed to get store snapshot: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Validate store map against live page
 */
export async function validateStoreMap(page: Page, storeMap: StoreMap): Promise<StoreValidationResult> {
  const queryResults: StoreValidationResult['queryResults'] = {};
  let accessible = false;
  let typeMatches = false;

  // Check if store is accessible
  try {
    const storeExists = await page.evaluate((accessPath) => {
      try {
        const store = eval(accessPath);
        return store !== undefined && store !== null;
      } catch {
        return false;
      }
    }, storeMap.accessPath);

    accessible = storeExists;
  } catch {
    accessible = false;
  }

  // Check store type
  if (accessible) {
    try {
      const actualStoreType = await page.evaluate((accessPath) => {
        const store = eval(accessPath);

        // Detect Redux
        if (typeof store.getState === 'function' && typeof store.dispatch === 'function') {
          return 'redux';
        }

        // For other types, we'd need more detection logic
        return 'custom';
      }, storeMap.accessPath);

      typeMatches = actualStoreType === storeMap.storeType || storeMap.storeType === 'custom';
    } catch {
      typeMatches = false;
    }
  }

  // Validate each query
  let allQueriesValid = true;

  for (const [queryName, query] of Object.entries(storeMap.queries)) {
    try {
      const result = await queryStore(page, storeMap, query);
      const actualType = getValueType(result);
      const expectedType = query.type;

      const valid = actualType === expectedType || expectedType === 'null' || expectedType === 'undefined';

      queryResults[queryName] = {
        valid,
        actualType,
        expectedType,
        error: valid ? undefined : `Type mismatch: expected ${expectedType}, got ${actualType}`,
      };

      if (!valid) {
        allQueriesValid = false;
      }
    } catch (error) {
      queryResults[queryName] = {
        valid: false,
        actualType: 'error',
        expectedType: query.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      allQueriesValid = false;
    }
  }

  return {
    accessible,
    typeMatches,
    queriesValid: allQueriesValid,
    queryResults,
  };
}

/**
 * Deep equality comparison
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

/**
 * Get JavaScript type of value
 */
function getValueType(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}
