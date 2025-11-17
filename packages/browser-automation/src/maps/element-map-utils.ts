/**
 * Element Map Utilities
 *
 * Helper functions for loading, searching, and validating element maps.
 */

import fs from 'fs/promises';
import path from 'path';
import Fuse from 'fuse.js';
import type { Page } from 'playwright';
import type {
  ElementMap,
  ElementDescriptor,
  ElementSearchResult,
  FlatElement,
  ValidationResult,
  ValidationIssue,
  ElementMapLoadOptions,
  ElementMapUpdate,
} from './element-map.js';

/**
 * Load element map from JSON file
 */
export async function loadElementMap(appName: string, _options: ElementMapLoadOptions = {}): Promise<ElementMap> {
  const mapPath = path.join(process.cwd(), 'tests', 'element-maps', `${appName}.json`);

  try {
    const content = await fs.readFile(mapPath, 'utf-8');
    const map: ElementMap = JSON.parse(content);

    return map;
  } catch (error) {
    throw new Error(`Failed to load element map for app "${appName}": ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Save element map to JSON file
 */
export async function saveElementMap(map: ElementMap): Promise<void> {
  const mapPath = path.join(process.cwd(), 'tests', 'element-maps', `${map.app}.json`);

  try {
    await fs.writeFile(mapPath, JSON.stringify(map, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to save element map: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Flatten element map for searching
 */
export function flattenElementMap(map: ElementMap): FlatElement[] {
  const flattened: FlatElement[] = [];

  function traverse(category: string, group: any, parentPath: string = '') {
    for (const [key, value] of Object.entries(group)) {
      const currentPath = parentPath ? `${parentPath}.${key}` : `${category}.${key}`;

      if (isElementDescriptor(value)) {
        flattened.push({
          path: currentPath,
          name: key,
          selector: value.selector,
          alternatives: value.alternatives,
          description: value.description,
          type: value.type,
          role: value.role,
          testId: value.testId,
        });

        // Traverse children if they exist
        if (value.children) {
          traverse(category, value.children, currentPath);
        }
      } else {
        // This is a nested group
        traverse(category, value, currentPath);
      }
    }
  }

  for (const [category, group] of Object.entries(map.elements)) {
    traverse(category, group);
  }

  return flattened;
}

/**
 * Type guard for ElementDescriptor
 */
function isElementDescriptor(obj: any): obj is ElementDescriptor {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.selector === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.type === 'string'
  );
}

/**
 * Search element map using fuzzy matching
 */
export function searchElements(map: ElementMap, query: string): ElementSearchResult[] {
  const flatElements = flattenElementMap(map);

  const fuse = new Fuse(flatElements, {
    keys: [
      { name: 'name', weight: 0.4 },
      { name: 'description', weight: 0.3 },
      { name: 'path', weight: 0.2 },
      { name: 'type', weight: 0.1 },
    ],
    threshold: 0.4, // 0 = perfect match, 1 = match anything
    includeScore: true,
    ignoreLocation: true,
  });

  const results = fuse.search(query);

  return results.map((result) => ({
    path: result.item.path,
    selector: result.item.selector,
    description: result.item.description,
    type: result.item.type,
    score: 1 - (result.score || 0), // Invert score (higher = better)
    alternatives: result.item.alternatives,
  }));
}

/**
 * Get element by path
 */
export function getElementByPath(map: ElementMap, elementPath: string): ElementDescriptor | null {
  const parts = elementPath.split('.');
  let current: any = map.elements;

  for (const part of parts) {
    if (!current[part]) {
      return null;
    }
    current = current[part];
  }

  return isElementDescriptor(current) ? current : null;
}

/**
 * Validate element map against live page
 */
export async function validateElementMap(map: ElementMap, page: Page): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  const flatElements = flattenElementMap(map);
  let passedCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  for (const element of flatElements) {
    const pathParts = element.path.split('.');
    const category = pathParts[0];
    const elementName = pathParts[pathParts.length - 1];

    try {
      // Check primary selector
      const count = await page.locator(element.selector).count();

      if (count === 0) {
        // Try alternatives
        let alternativeFound = false;
        let workingAlternative = '';

        if (element.alternatives) {
          for (const alt of element.alternatives) {
            const altCount = await page.locator(alt).count();
            if (altCount > 0) {
              alternativeFound = true;
              workingAlternative = alt;
              break;
            }
          }
        }

        if (alternativeFound) {
          issues.push({
            severity: 'warning',
            category,
            element: elementName,
            message: `Primary selector not found, but alternative works: ${workingAlternative}`,
            selector: element.selector,
          });
          warningCount++;
        } else {
          issues.push({
            severity: 'error',
            category,
            element: elementName,
            message: `Element not found with any selector`,
            selector: element.selector,
          });
          errorCount++;
        }
      } else if (count > 1) {
        issues.push({
          severity: 'warning',
          category,
          element: elementName,
          message: `Selector matches ${count} elements (expected 1)`,
          selector: element.selector,
        });
        warningCount++;
      } else {
        passedCount++;
      }
    } catch (error) {
      issues.push({
        severity: 'error',
        category,
        element: elementName,
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        selector: element.selector,
      });
      errorCount++;
    }
  }

  return {
    valid: errorCount === 0,
    issues,
    totalElements: flatElements.length,
    passedElements: passedCount,
    warningElements: warningCount,
    errorElements: errorCount,
  };
}

/**
 * Update element in map
 */
export async function updateElementMap(appName: string, update: ElementMapUpdate): Promise<void> {
  const map = await loadElementMap(appName);
  const parts = update.path.split('.');

  let current: any = map.elements;

  // Navigate to parent
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }

  // Update or create element
  const lastPart = parts[parts.length - 1];
  current[lastPart] = update.element;

  // Update timestamp
  map.updated = new Date().toISOString();

  // Save updated map
  await saveElementMap(map);
}

/**
 * Count total elements in map
 */
export function countElements(map: ElementMap): number {
  return flattenElementMap(map).length;
}

/**
 * Get all element categories
 */
export function getCategories(map: ElementMap): string[] {
  return Object.keys(map.elements);
}

/**
 * Get all elements in a category
 */
export function getElementsInCategory(map: ElementMap, category: string): FlatElement[] {
  const allElements = flattenElementMap(map);
  return allElements.filter((el) => el.path.startsWith(`${category}.`));
}
