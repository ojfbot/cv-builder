/**
 * Draw.io Schema for UI State Documentation and Visual Regression Testing
 *
 * This schema defines the structure for documenting UI states, user interactions,
 * and screenshot points in Draw.io diagrams. It serves as the single source of truth
 * for automated visual regression testing.
 *
 * Version: 1.0.0
 * @see docs/DRAWIO_SCHEMA.md for detailed documentation
 */

/**
 * Viewport configurations for responsive screenshots
 */
export type ViewportPreset = 'desktop' | 'mobile' | 'tablet' | 'wide';

export interface ViewportConfig {
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
  isLandscape?: boolean;
}

/**
 * Standard viewport configurations
 */
export const VIEWPORT_PRESETS: Record<ViewportPreset, ViewportConfig> = {
  mobile: {
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  tablet: {
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  desktop: {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
  },
  wide: {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  },
};

/**
 * Node type classification
 */
export type DrawioNodeType =
  | 'page'           // Top-level page container
  | 'component'      // UI component (header, sidebar, modal, etc.)
  | 'action'         // User action (click, type, navigate)
  | 'state'          // UI state change (expand, collapse, show, hide)
  | 'screenshot'     // Explicit screenshot marker
  | 'annotation'     // Documentation/notes
  | 'container';     // Generic container (swimlane, group)

/**
 * Interaction types for user actions
 */
export type InteractionType =
  | 'navigation'     // Navigate to page, change route
  | 'click'          // Click button, link, checkbox
  | 'type'           // Type text into input field
  | 'hover'          // Hover over element
  | 'focus'          // Focus on element
  | 'scroll'         // Scroll page or element
  | 'drag'           // Drag and drop
  | 'state-change';  // Generic state mutation

/**
 * Screenshot capture timing
 */
export type CaptureTimingType = 'before' | 'after' | 'both';

/**
 * Screenshot configuration embedded in Draw.io nodes
 */
export interface ScreenshotConfig {
  /**
   * Viewport preset or custom dimensions
   */
  viewport: ViewportPreset | ViewportConfig;

  /**
   * CSS selector for element to screenshot (null = full page)
   */
  selector?: string | null;

  /**
   * Wait condition before capturing
   */
  waitFor?: {
    type: 'selector' | 'timeout' | 'networkIdle' | 'load';
    value: string | number;
  };

  /**
   * When to capture screenshot relative to action
   */
  captureAt: CaptureTimingType;

  /**
   * Optional comparison threshold (0-1, default 0.001 = 0.1%)
   */
  threshold?: number;

  /**
   * Whether to mask dynamic content (timestamps, user data)
   */
  maskDynamic?: boolean;
}

/**
 * State assertion for verification
 */
export interface StateAssertion {
  /**
   * Element selector to verify
   */
  selector: string;

  /**
   * Expected state properties
   */
  expected: {
    visible?: boolean;
    text?: string;
    attribute?: Record<string, string>;
    style?: Record<string, string>;
    count?: number;
  };

  /**
   * Assertion description
   */
  description?: string;
}

/**
 * Metadata extracted from Draw.io node
 */
export interface NodeMetadata {
  /**
   * Original Draw.io style string
   */
  style?: string;

  /**
   * Parent node ID
   */
  parentId?: string;

  /**
   * Child node IDs
   */
  children?: string[];

  /**
   * Geometry (position and size)
   */
  geometry?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  /**
   * Custom data attributes (parsed from style or value)
   */
  customData?: Record<string, unknown>;
}

/**
 * Draw.io node representing a UI element, action, or state
 */
export interface DrawioNode {
  /**
   * Unique node identifier (mxCell id)
   */
  id: string;

  /**
   * Classified node type
   */
  type: DrawioNodeType;

  /**
   * Node label/text
   */
  label: string;

  /**
   * Raw label (before parsing)
   */
  rawLabel?: string;

  /**
   * Metadata extracted from Draw.io
   */
  metadata: NodeMetadata;

  /**
   * Screenshot configuration (if this is a screenshot point)
   */
  screenshotConfig?: ScreenshotConfig;

  /**
   * Interaction configuration (if this is an action)
   */
  interaction?: {
    type: InteractionType;
    target?: string;          // CSS selector or element description
    value?: string;           // Input value for type actions
    description?: string;
  };

  /**
   * State assertions (if this is a state node)
   */
  assertions?: StateAssertion[];

  /**
   * Confidence score from pattern detection (0-1)
   */
  confidence?: number;
}

/**
 * Edge connecting two nodes (represents flow)
 */
export interface DrawioEdge {
  /**
   * Edge ID
   */
  id: string;

  /**
   * Source node ID
   */
  source: string;

  /**
   * Target node ID
   */
  target: string;

  /**
   * Edge label (describes transition)
   */
  label?: string;

  /**
   * Edge metadata
   */
  metadata?: {
    style?: string;
    [key: string]: unknown;
  };
}

/**
 * Pattern detected by heuristics
 */
export interface DetectedPattern {
  /**
   * Pattern type
   */
  type: 'navigation' | 'interaction' | 'state-change' | 'screenshot-point';

  /**
   * Nodes involved in this pattern
   */
  nodes: string[];

  /**
   * Confidence score (0-1)
   */
  confidence: number;

  /**
   * Pattern-specific data
   */
  data: {
    interactionType?: InteractionType;
    screenshotConfig?: Partial<ScreenshotConfig>;
    assertions?: StateAssertion[];
    [key: string]: unknown;
  };

  /**
   * Reasoning for detection (for debugging)
   */
  reasoning?: string;
}

/**
 * Schema metadata
 */
export interface SchemaMetadata {
  /**
   * Schema version
   */
  version: string;

  /**
   * When this schema was created
   */
  createdAt: string;

  /**
   * Source Draw.io file
   */
  sourceFile?: string;

  /**
   * Git commit hash (for traceability)
   */
  gitCommit?: string;

  /**
   * Custom metadata
   */
  [key: string]: unknown;
}

/**
 * Complete Draw.io UI schema
 */
export interface DrawioUISchema {
  /**
   * Schema version
   */
  version: string;

  /**
   * All nodes in the diagram
   */
  nodes: DrawioNode[];

  /**
   * All edges in the diagram
   */
  edges: DrawioEdge[];

  /**
   * Detected patterns
   */
  patterns?: DetectedPattern[];

  /**
   * Schema metadata
   */
  metadata: SchemaMetadata;
}

/**
 * Parse result from Draw.io XML
 */
export interface ParseResult {
  /**
   * Parsed schema
   */
  schema: DrawioUISchema;

  /**
   * Parse warnings (non-fatal issues)
   */
  warnings: string[];

  /**
   * Parse errors (fatal issues)
   */
  errors: string[];

  /**
   * Statistics
   */
  stats: {
    totalNodes: number;
    totalEdges: number;
    nodesByType: Record<DrawioNodeType, number>;
    patternsDetected: number;
  };
}

/**
 * Template metadata
 */
export interface TemplateMetadata {
  /**
   * Template name
   */
  name: string;

  /**
   * Template description
   */
  description: string;

  /**
   * Template category
   */
  category: 'navigation' | 'form' | 'modal' | 'general';

  /**
   * Expected screenshot count
   */
  expectedScreenshots: number;

  /**
   * Template tags
   */
  tags: string[];

  /**
   * Usage examples
   */
  examples?: string[];
}

/**
 * Draw.io template
 */
export interface DrawioTemplate {
  /**
   * Template metadata
   */
  metadata: TemplateMetadata;

  /**
   * Template schema
   */
  schema: DrawioUISchema;

  /**
   * Raw Draw.io XML
   */
  xml: string;

  /**
   * Few-shot prompting examples
   */
  fewShotExamples?: {
    input: string;
    output: string;
    explanation: string;
  }[];
}

/**
 * Schema version for migrations
 */
export const SCHEMA_VERSION = '1.0.0';

/**
 * Validate a DrawioUISchema
 */
export function validateSchema(schema: DrawioUISchema): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Version check
  if (!schema.version) {
    errors.push('Schema version is required');
  }

  // Nodes validation
  if (!Array.isArray(schema.nodes)) {
    errors.push('Schema nodes must be an array');
  } else {
    schema.nodes.forEach((node, idx) => {
      if (!node.id) errors.push(`Node at index ${idx} missing id`);
      if (!node.type) errors.push(`Node ${node.id} missing type`);
      if (!node.label && node.label !== '') errors.push(`Node ${node.id} missing label`);
    });
  }

  // Edges validation
  if (!Array.isArray(schema.edges)) {
    errors.push('Schema edges must be an array');
  } else {
    schema.edges.forEach((edge, idx) => {
      if (!edge.id) errors.push(`Edge at index ${idx} missing id`);
      if (!edge.source) errors.push(`Edge ${edge.id} missing source`);
      if (!edge.target) errors.push(`Edge ${edge.id} missing target`);
    });
  }

  // Metadata validation
  if (!schema.metadata) {
    errors.push('Schema metadata is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
