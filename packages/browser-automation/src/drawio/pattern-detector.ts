/**
 * Pattern Detection Heuristics
 *
 * Detects common UI interaction patterns from Draw.io nodes
 * using heuristic rules and natural language processing.
 */

import {
  DrawioNode,
  DrawioEdge,
  DrawioUISchema,
  DetectedPattern,
  InteractionType,
  ScreenshotConfig,
  StateAssertion,
  VIEWPORT_PRESETS,
} from './schema.js';

/**
 * Pattern confidence thresholds
 */
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,      // Clear pattern match
  MEDIUM: 0.6,    // Probable match
  LOW: 0.4,       // Possible match
  MIN: 0.3,       // Minimum to include
};

/**
 * Pattern detection rules
 */
interface PatternRule {
  type: DetectedPattern['type'];
  keywords: string[];
  confidence: number;
}

const PATTERN_RULES: PatternRule[] = [
  // Navigation patterns
  {
    type: 'navigation',
    keywords: ['navigate', 'go to', 'open', 'switch to', 'route to', 'redirect'],
    confidence: CONFIDENCE_THRESHOLDS.HIGH,
  },

  // Click interactions
  {
    type: 'interaction',
    keywords: ['click', 'press', 'tap', 'select', 'choose'],
    confidence: CONFIDENCE_THRESHOLDS.HIGH,
  },

  // Type/input interactions
  {
    type: 'interaction',
    keywords: ['type', 'enter', 'input', 'fill', 'write'],
    confidence: CONFIDENCE_THRESHOLDS.HIGH,
  },

  // State changes
  {
    type: 'state-change',
    keywords: ['expand', 'collapse', 'toggle', 'show', 'hide', 'enable', 'disable', 'open', 'close'],
    confidence: CONFIDENCE_THRESHOLDS.MEDIUM,
  },

  // Screenshot markers
  {
    type: 'screenshot-point',
    keywords: ['screenshot', 'capture', 'viewport', 'desktop', 'mobile', 'tablet'],
    confidence: CONFIDENCE_THRESHOLDS.HIGH,
  },
];

/**
 * Pattern Detector
 */
export class PatternDetector {
  private schema: DrawioUISchema;
  private detectedPatterns: DetectedPattern[] = [];

  constructor(schema: DrawioUISchema) {
    this.schema = schema;
  }

  /**
   * Detect all patterns in the schema
   */
  detectPatterns(): DetectedPattern[] {
    this.detectedPatterns = [];

    // Detect patterns from action nodes
    this.detectNavigationPatterns();
    this.detectInteractionPatterns();
    this.detectStateChangePatterns();
    this.detectScreenshotPoints();

    // Filter by minimum confidence
    const filtered = this.detectedPatterns.filter(
      (p) => p.confidence >= CONFIDENCE_THRESHOLDS.MIN
    );

    // Sort by confidence (highest first)
    filtered.sort((a, b) => b.confidence - a.confidence);

    return filtered;
  }

  /**
   * Detect navigation patterns
   */
  private detectNavigationPatterns(): void {
    const actionNodes = this.schema.nodes.filter((n) => n.type === 'action');

    for (const node of actionNodes) {
      const pattern = this.matchNavigationPattern(node);
      if (pattern) {
        this.detectedPatterns.push(pattern);

        // Enrich node with interaction config
        node.interaction = {
          type: 'navigation',
          description: node.label,
          ...pattern.data,
        };
        node.confidence = pattern.confidence;
      }
    }
  }

  /**
   * Match navigation pattern in node
   */
  private matchNavigationPattern(node: DrawioNode): DetectedPattern | null {
    const label = node.label.toLowerCase();

    // Check for navigation keywords
    const navRule = PATTERN_RULES.find(
      (r) => r.type === 'navigation' && r.keywords.some((kw) => label.includes(kw))
    );

    if (!navRule) return null;

    // Extract target page/route
    const target = this.extractNavigationTarget(node.label);

    return {
      type: 'navigation',
      nodes: [node.id],
      confidence: navRule.confidence,
      data: {
        interactionType: 'navigation',
        target,
      },
      reasoning: `Matched navigation keywords: ${navRule.keywords.join(', ')}`,
    };
  }

  /**
   * Extract navigation target from label
   */
  private extractNavigationTarget(label: string): string | undefined {
    // Pattern: "user navigates to [target]"
    const toMatch = label.match(/(?:to|from)\s+([a-z0-9\s-]+)/i);
    if (toMatch) return toMatch[1].trim();

    // Pattern: "navigate [target]"
    const directMatch = label.match(/navigate\s+([a-z0-9\s-]+)/i);
    if (directMatch) return directMatch[1].trim();

    return undefined;
  }

  /**
   * Detect interaction patterns (click, type, etc.)
   */
  private detectInteractionPatterns(): void {
    const actionNodes = this.schema.nodes.filter((n) => n.type === 'action');

    for (const node of actionNodes) {
      const pattern = this.matchInteractionPattern(node);
      if (pattern) {
        this.detectedPatterns.push(pattern);

        // Enrich node with interaction config
        node.interaction = {
          type: pattern.data.interactionType!,
          target: pattern.data.target as string | undefined,
          value: pattern.data.value as string | undefined,
          description: node.label,
        };
        node.confidence = pattern.confidence;
      }
    }
  }

  /**
   * Match interaction pattern in node
   */
  private matchInteractionPattern(node: DrawioNode): DetectedPattern | null {
    const label = node.label.toLowerCase();

    // Check for click interactions
    if (label.includes('click') || label.includes('tap') || label.includes('press')) {
      const target = this.extractInteractionTarget(node.label, 'click');
      return {
        type: 'interaction',
        nodes: [node.id],
        confidence: CONFIDENCE_THRESHOLDS.HIGH,
        data: {
          interactionType: 'click',
          target,
        },
        reasoning: 'Matched click interaction keywords',
      };
    }

    // Check for type interactions
    if (label.includes('type') || label.includes('enter') || label.includes('input')) {
      const target = this.extractInteractionTarget(node.label, 'type');
      const value = this.extractTypeValue(node.label);
      return {
        type: 'interaction',
        nodes: [node.id],
        confidence: CONFIDENCE_THRESHOLDS.HIGH,
        data: {
          interactionType: 'type',
          target,
          value,
        },
        reasoning: 'Matched type interaction keywords',
      };
    }

    // Check for hover interactions
    if (label.includes('hover') || label.includes('mouse over')) {
      const target = this.extractInteractionTarget(node.label, 'hover');
      return {
        type: 'interaction',
        nodes: [node.id],
        confidence: CONFIDENCE_THRESHOLDS.MEDIUM,
        data: {
          interactionType: 'hover',
          target,
        },
        reasoning: 'Matched hover interaction keywords',
      };
    }

    return null;
  }

  /**
   * Extract interaction target from label
   */
  private extractInteractionTarget(label: string, interactionType: string): string | undefined {
    // Pattern: "user clicks [target] button"
    const patterns = [
      new RegExp(`${interactionType}s?\\s+(?:on\\s+)?(?:the\\s+)?([a-z0-9\\s-]+?)(?:\\s+button|\\s+link|\\s+field|\\s+tab|$)`, 'i'),
      new RegExp(`${interactionType}s?\\s+([a-z0-9\\s-]+)`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = label.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Extract value for type interactions
   */
  private extractTypeValue(label: string): string | undefined {
    // Pattern: "type '[value]'" or "enter '[value]'"
    const match = label.match(/(?:type|enter)\s+['"]([^'"]+)['"]/i);

    if (!match) {
      // Check if this looks like a type action but is missing quotes
      const hasTypeKeyword = /(?:type|enter)\s+/i.test(label);
      if (hasTypeKeyword) {
        console.warn(
          `⚠️  Type action missing quoted value in label: "${label}"\n` +
          `   Expected format: type 'value' into target\n` +
          `   Example: type 'John Doe' into name field\n` +
          `   See DRAWIO_SYNTAX.md for details`
        );
      }
    }

    return match ? match[1] : undefined;
  }

  /**
   * Detect state change patterns
   */
  private detectStateChangePatterns(): void {
    const stateNodes = this.schema.nodes.filter((n) => n.type === 'state' || n.type === 'action');

    for (const node of stateNodes) {
      const pattern = this.matchStateChangePattern(node);
      if (pattern) {
        this.detectedPatterns.push(pattern);

        // Enrich node with assertions
        node.assertions = pattern.data.assertions as StateAssertion[] | undefined;
        node.confidence = pattern.confidence;
      }
    }
  }

  /**
   * Match state change pattern in node
   */
  private matchStateChangePattern(node: DrawioNode): DetectedPattern | null {
    const label = node.label.toLowerCase();

    const stateRule = PATTERN_RULES.find(
      (r) => r.type === 'state-change' && r.keywords.some((kw) => label.includes(kw))
    );

    if (!stateRule) return null;

    // Extract component being changed
    const component = this.extractComponentName(node.label);

    // Infer state assertion
    const assertion: StateAssertion | undefined = component
      ? {
          selector: `[data-testid="${this.kebabCase(component)}"]`,
          expected: {
            visible: this.inferVisibility(label),
          },
          description: node.label,
        }
      : undefined;

    return {
      type: 'state-change',
      nodes: [node.id],
      confidence: stateRule.confidence,
      data: {
        assertions: assertion ? [assertion] : [],
      },
      reasoning: `Matched state change keywords: ${stateRule.keywords.join(', ')}`,
    };
  }

  /**
   * Extract component name from label
   */
  private extractComponentName(label: string): string | undefined {
    // Pattern: "user expands [component]"
    const match = label.match(/(?:expands?|collapses?|toggles?|shows?|hides?)\s+([a-z0-9\s-]+)/i);
    return match ? match[1].trim() : undefined;
  }

  /**
   * Infer visibility from label
   */
  private inferVisibility(label: string): boolean {
    const showKeywords = ['expand', 'show', 'open', 'enable'];
    const hideKeywords = ['collapse', 'hide', 'close', 'disable'];

    const lower = label.toLowerCase();
    if (showKeywords.some((kw) => lower.includes(kw))) return true;
    if (hideKeywords.some((kw) => lower.includes(kw))) return false;

    return true; // Default
  }

  /**
   * Detect screenshot points
   */
  private detectScreenshotPoints(): void {
    const componentNodes = this.schema.nodes.filter(
      (n) => n.type === 'component' || n.type === 'screenshot'
    );

    for (const node of componentNodes) {
      const pattern = this.matchScreenshotPoint(node);
      if (pattern) {
        this.detectedPatterns.push(pattern);

        // Enrich node with screenshot config
        node.screenshotConfig = pattern.data.screenshotConfig as ScreenshotConfig;
        node.confidence = pattern.confidence;
      }
    }
  }

  /**
   * Match screenshot point in node
   */
  private matchScreenshotPoint(node: DrawioNode): DetectedPattern | null {
    const label = node.label.toLowerCase();

    // Explicit screenshot markers
    if (label.includes('screenshot') || label.includes('capture')) {
      const viewport = this.extractViewport(label);
      const config: ScreenshotConfig = {
        viewport: viewport || 'desktop',
        captureAt: 'both',
      };

      return {
        type: 'screenshot-point',
        nodes: [node.id],
        confidence: CONFIDENCE_THRESHOLDS.HIGH,
        data: {
          screenshotConfig: config,
        },
        reasoning: 'Explicit screenshot marker detected',
      };
    }

    // Component containers (implicit screenshot points)
    if (node.type === 'component' && this.isVisuallySizable(node)) {
      const config: ScreenshotConfig = {
        viewport: 'desktop',
        captureAt: 'after',
        selector: this.generateSelector(node),
      };

      return {
        type: 'screenshot-point',
        nodes: [node.id],
        confidence: CONFIDENCE_THRESHOLDS.MEDIUM,
        data: {
          screenshotConfig: config,
        },
        reasoning: 'Component suitable for screenshot capture',
      };
    }

    return null;
  }

  /**
   * Extract viewport from label
   */
  private extractViewport(label: string): 'desktop' | 'mobile' | 'tablet' | 'wide' | undefined {
    if (label.includes('mobile')) return 'mobile';
    if (label.includes('tablet')) return 'tablet';
    if (label.includes('desktop')) return 'desktop';
    if (label.includes('wide') || label.includes('4k')) return 'wide';
    return undefined;
  }

  /**
   * Check if node is visually sizable (has meaningful dimensions)
   */
  private isVisuallySizable(node: DrawioNode): boolean {
    const geom = node.metadata.geometry;
    if (!geom) return false;

    // Minimum size threshold (e.g., 50x50)
    return geom.width >= 50 && geom.height >= 50;
  }

  /**
   * Generate CSS selector for node
   */
  private generateSelector(node: DrawioNode): string {
    const kebab = this.kebabCase(node.label);
    return `[data-testid="${kebab}"], .${kebab}, #${kebab}`;
  }

  /**
   * Convert string to kebab-case
   */
  private kebabCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Generate confidence scores for patterns
   */
  generateConfidenceScores(patterns: DetectedPattern[]): DetectedPattern[] {
    return patterns.map((pattern) => ({
      ...pattern,
      confidence: this.calculateConfidence(pattern),
    }));
  }

  /**
   * Calculate confidence score for a pattern
   */
  private calculateConfidence(pattern: DetectedPattern): number {
    let confidence = pattern.confidence;

    // Boost confidence if pattern has rich data
    if (pattern.data.target) confidence += 0.1;
    if (pattern.data.assertions && pattern.data.assertions.length > 0) confidence += 0.1;
    if (pattern.data.screenshotConfig) confidence += 0.05;

    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }
}

/**
 * Utility function to detect patterns in a schema
 */
export function detectPatterns(schema: DrawioUISchema): DetectedPattern[] {
  const detector = new PatternDetector(schema);
  const patterns = detector.detectPatterns();
  return detector.generateConfidenceScores(patterns);
}
