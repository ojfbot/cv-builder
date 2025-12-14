/**
 * Draw.io XML Parser
 *
 * Parses Draw.io XML files and extracts nodes, edges, and metadata
 * for visual regression testing schema generation.
 */

import { DOMParser } from '@xmldom/xmldom';
import {
  DrawioUISchema,
  DrawioNode,
  DrawioEdge,
  DrawioNodeType,
  NodeMetadata,
  ParseResult,
  SCHEMA_VERSION,
} from './schema.js';

/**
 * Raw mxCell data from XML
 */
interface RawMxCell {
  id: string;
  value: string;
  style?: string;
  vertex?: string;
  edge?: string;
  parent?: string;
  source?: string;
  target?: string;
  geometry?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
}

/**
 * Draw.io XML Parser
 */
export class DrawioParser {
  private parser: DOMParser;
  private warnings: string[] = [];
  private errors: string[] = [];

  constructor() {
    this.parser = new DOMParser();
  }

  /**
   * Parse Draw.io XML file
   */
  parse(xml: string, sourceFile?: string): ParseResult {
    this.warnings = [];
    this.errors = [];

    try {
      const doc = this.parser.parseFromString(xml, 'text/xml');

      // Check for parse errors
      const parseError = doc.getElementsByTagName('parsererror')[0];
      if (parseError) {
        this.errors.push(`XML parse error: ${parseError.textContent}`);
        return this.createErrorResult();
      }

      // Extract mxCells
      const rawCells = this.extractMxCells(doc);

      // Separate nodes and edges
      const { nodes, edges } = this.classifyCells(rawCells);

      // Build schema
      const schema: DrawioUISchema = {
        version: SCHEMA_VERSION,
        nodes,
        edges,
        metadata: {
          version: SCHEMA_VERSION,
          createdAt: new Date().toISOString(),
          sourceFile,
        },
      };

      // Calculate statistics
      const stats = this.calculateStats(schema);

      return {
        schema,
        warnings: this.warnings,
        errors: this.errors,
        stats,
      };
    } catch (error) {
      this.errors.push(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
      return this.createErrorResult();
    }
  }

  /**
   * Extract all mxCell elements from XML
   */
  private extractMxCells(doc: Document): RawMxCell[] {
    const cells: RawMxCell[] = [];
    const mxCells = doc.getElementsByTagName('mxCell');

    for (let i = 0; i < mxCells.length; i++) {
      const cell = mxCells[i];
      const rawCell = this.parseMxCell(cell);
      if (rawCell) {
        cells.push(rawCell);
      }
    }

    return cells;
  }

  /**
   * Parse a single mxCell element
   */
  private parseMxCell(cell: Element): RawMxCell | null {
    const id = cell.getAttribute('id');
    if (!id) {
      this.warnings.push('Found mxCell without id, skipping');
      return null;
    }

    const rawCell: RawMxCell = {
      id,
      value: cell.getAttribute('value') || '',
      style: cell.getAttribute('style') || undefined,
      vertex: cell.getAttribute('vertex') || undefined,
      edge: cell.getAttribute('edge') || undefined,
      parent: cell.getAttribute('parent') || undefined,
      source: cell.getAttribute('source') || undefined,
      target: cell.getAttribute('target') || undefined,
    };

    // Parse geometry if present
    const geometryEl = cell.getElementsByTagName('mxGeometry')[0];
    if (geometryEl) {
      rawCell.geometry = {
        x: parseFloat(geometryEl.getAttribute('x') || '0'),
        y: parseFloat(geometryEl.getAttribute('y') || '0'),
        width: parseFloat(geometryEl.getAttribute('width') || '0'),
        height: parseFloat(geometryEl.getAttribute('height') || '0'),
      };
    }

    return rawCell;
  }

  /**
   * Classify cells into nodes and edges
   */
  private classifyCells(rawCells: RawMxCell[]): { nodes: DrawioNode[]; edges: DrawioEdge[] } {
    const nodes: DrawioNode[] = [];
    const edges: DrawioEdge[] = [];

    for (const rawCell of rawCells) {
      // Skip root cells (id 0, 1)
      if (rawCell.id === '0' || rawCell.id === '1') {
        continue;
      }

      // Edges have source and target
      if (rawCell.source && rawCell.target) {
        edges.push(this.createEdge(rawCell));
      }
      // Vertices are nodes
      else if (rawCell.vertex) {
        const node = this.createNode(rawCell);
        if (node) {
          nodes.push(node);
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * Create a DrawioNode from raw mxCell
   */
  private createNode(rawCell: RawMxCell): DrawioNode | null {
    const label = this.decodeLabel(rawCell.value);
    const type = this.classifyNodeType(label, rawCell.style);

    const metadata: NodeMetadata = {
      style: rawCell.style,
      parentId: rawCell.parent,
      geometry: rawCell.geometry,
    };

    return {
      id: rawCell.id,
      type,
      label,
      rawLabel: rawCell.value,
      metadata,
    };
  }

  /**
   * Create a DrawioEdge from raw mxCell
   */
  private createEdge(rawCell: RawMxCell): DrawioEdge {
    const label = this.decodeLabel(rawCell.value);

    return {
      id: rawCell.id,
      source: rawCell.source!,
      target: rawCell.target!,
      label,
      metadata: {
        style: rawCell.style,
      },
    };
  }

  /**
   * Decode HTML entities in label
   */
  private decodeLabel(value: string): string {
    if (!value) return '';

    // Remove HTML tags but keep content
    let label = value.replace(/<[^>]*>/g, ' ');

    // Decode common HTML entities
    label = label
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');

    // Clean up whitespace
    label = label.replace(/\s+/g, ' ').trim();

    return label;
  }

  /**
   * Classify node type based on label and style
   */
  private classifyNodeType(label: string, style?: string): DrawioNodeType {
    const lowerLabel = label.toLowerCase();

    // Container types (swimlane)
    if (style?.includes('swimlane')) {
      return 'container';
    }

    // Page containers
    if (lowerLabel.includes('page') && !lowerLabel.includes('button')) {
      return 'page';
    }

    // Components (UI elements)
    if (
      lowerLabel.includes('header') ||
      lowerLabel.includes('sidebar') ||
      lowerLabel.includes('modal') ||
      lowerLabel.includes('button') ||
      lowerLabel.includes('tab') ||
      lowerLabel.includes('panel') ||
      lowerLabel.includes('dashboard')
    ) {
      return 'component';
    }

    // User actions (interaction patterns)
    if (
      lowerLabel.startsWith('user ') ||
      lowerLabel.includes('click') ||
      lowerLabel.includes('navigate') ||
      lowerLabel.includes('type') ||
      lowerLabel.includes('select')
    ) {
      return 'action';
    }

    // State changes
    if (
      lowerLabel.includes('expand') ||
      lowerLabel.includes('collapse') ||
      lowerLabel.includes('show') ||
      lowerLabel.includes('hide') ||
      lowerLabel.includes('enable') ||
      lowerLabel.includes('disable')
    ) {
      return 'state';
    }

    // Screenshot markers
    if (
      lowerLabel.includes('screenshot') ||
      lowerLabel.includes('capture') ||
      lowerLabel.includes('viewport')
    ) {
      return 'screenshot';
    }

    // Annotations
    if (
      lowerLabel.includes('note') ||
      lowerLabel.includes('comment') ||
      lowerLabel.includes('annotation')
    ) {
      return 'annotation';
    }

    // Default to component for UI elements
    return 'component';
  }

  /**
   * Calculate statistics
   */
  private calculateStats(schema: DrawioUISchema) {
    const nodesByType: Record<DrawioNodeType, number> = {
      page: 0,
      component: 0,
      action: 0,
      state: 0,
      screenshot: 0,
      annotation: 0,
      container: 0,
    };

    schema.nodes.forEach((node) => {
      nodesByType[node.type]++;
    });

    return {
      totalNodes: schema.nodes.length,
      totalEdges: schema.edges.length,
      nodesByType,
      patternsDetected: schema.patterns?.length || 0,
    };
  }

  /**
   * Create error result
   */
  private createErrorResult(): ParseResult {
    return {
      schema: {
        version: SCHEMA_VERSION,
        nodes: [],
        edges: [],
        metadata: {
          version: SCHEMA_VERSION,
          createdAt: new Date().toISOString(),
        },
      },
      warnings: this.warnings,
      errors: this.errors,
      stats: {
        totalNodes: 0,
        totalEdges: 0,
        nodesByType: {
          page: 0,
          component: 0,
          action: 0,
          state: 0,
          screenshot: 0,
          annotation: 0,
          container: 0,
        },
        patternsDetected: 0,
      },
    };
  }
}

/**
 * Utility function to parse Draw.io XML file
 */
export function parseDrawioXML(xml: string, sourceFile?: string): ParseResult {
  const parser = new DrawioParser();
  return parser.parse(xml, sourceFile);
}
