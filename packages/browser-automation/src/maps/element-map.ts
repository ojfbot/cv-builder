/**
 * Element Map Schema
 *
 * Provides semantic mapping from human-readable element names to CSS selectors.
 * Enables LLM agents to discover and interact with UI elements using natural language.
 */

/**
 * Element type categories for classification
 */
export type ElementType =
  | 'button'
  | 'link'
  | 'input'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'tab'
  | 'panel'
  | 'modal'
  | 'form'
  | 'container'
  | 'text'
  | 'image';

/**
 * State-specific selectors for elements that have multiple states
 */
export interface ElementStates {
  active?: string;
  disabled?: string;
  expanded?: string;
  collapsed?: string;
  selected?: string;
  visible?: string;
  hidden?: string;
}

/**
 * Descriptor for a single UI element
 */
export interface ElementDescriptor {
  /** Primary CSS selector */
  selector: string;
  /** Fallback selectors if primary fails */
  alternatives?: string[];
  /** Human-readable description for LLM context */
  description: string;
  /** Element type classification */
  type: ElementType;
  /** ARIA role attribute (if applicable) */
  role?: string;
  /** State-specific selectors */
  states?: ElementStates;
  /** Nested child elements */
  children?: ElementGroup;
  /** Data test ID (if available) */
  testId?: string;
}

/**
 * Group of related elements
 */
export interface ElementGroup {
  [elementName: string]: ElementDescriptor;
}

/**
 * Category of elements (navigation, forms, chat, etc.)
 */
export interface ElementCategory {
  [categoryName: string]: ElementGroup;
}

/**
 * Complete element map for an application
 */
export interface ElementMap {
  /** Application identifier */
  app: string;
  /** Map version (semantic versioning) */
  version: string;
  /** Last update timestamp (ISO 8601) */
  updated: string;
  /** Organized element mappings */
  elements: ElementCategory;
}

/**
 * Element search result with relevance scoring
 */
export interface ElementSearchResult {
  /** Dot-notation path to element (e.g., "navigation.tabs.bio") */
  path: string;
  /** Primary selector */
  selector: string;
  /** Element description */
  description: string;
  /** Element type */
  type: ElementType;
  /** Relevance score (0-1, higher is better) */
  score: number;
  /** Alternative selectors */
  alternatives?: string[];
}

/**
 * Flattened element for searching
 */
export interface FlatElement {
  path: string;
  name: string;
  selector: string;
  alternatives?: string[];
  description: string;
  type: ElementType;
  role?: string;
  testId?: string;
}

/**
 * Validation issue severity
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Issue found during element map validation
 */
export interface ValidationIssue {
  severity: ValidationSeverity;
  category: string;
  element: string;
  message: string;
  selector?: string;
}

/**
 * Element map validation result
 */
export interface ValidationResult {
  /** True if no errors found (warnings are acceptable) */
  valid: boolean;
  /** List of all issues found */
  issues: ValidationIssue[];
  /** Total elements validated */
  totalElements: number;
  /** Elements that passed validation */
  passedElements: number;
  /** Elements with warnings */
  warningElements: number;
  /** Elements with errors */
  errorElements: number;
}

/**
 * Options for element map loading
 */
export interface ElementMapLoadOptions {
  /** Validate selectors against live page */
  validate?: boolean;
  /** Fail if validation errors are found */
  strict?: boolean;
}

/**
 * Element map update request
 */
export interface ElementMapUpdate {
  /** Dot-notation path to element (e.g., "navigation.tabs.settings") */
  path: string;
  /** New or updated element descriptor */
  element: ElementDescriptor;
}
