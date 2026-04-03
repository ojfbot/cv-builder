/**
 * Draw.io XML Manipulator
 *
 * Provides utilities for safely manipulating Draw.io XML structure
 * while maintaining compatibility with Draw.io desktop/web editors.
 */

import { DOMParser, XMLSerializer, Document, Element } from '@xmldom/xmldom';

/**
 * Position for new elements
 */
export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Image cell configuration
 */
export interface ImageCellConfig {
  id: string;
  base64Data: string;
  position: Position;
  label?: string;
  parentId?: string;
}

/**
 * XML Manipulator for Draw.io files
 */
export class DrawioXMLManipulator {
  private parser: DOMParser;
  private serializer: XMLSerializer;

  constructor() {
    this.parser = new DOMParser();
    this.serializer = new XMLSerializer();
  }

  /**
   * Parse Draw.io XML
   */
  parse(xml: string): Document {
    return this.parser.parseFromString(xml, 'text/xml');
  }

  /**
   * Serialize Document back to XML string
   */
  serialize(doc: Document): string {
    return this.serializer.serializeToString(doc);
  }

  /**
   * Find mxCell by ID
   */
  findCell(doc: Document, cellId: string): Element | null {
    const cells = doc.getElementsByTagName('mxCell');
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (cell.getAttribute('id') === cellId) {
        return cell as Element;
      }
    }
    return null;
  }

  /**
   * Get cell position
   */
  getCellPosition(cell: Element): Position | null {
    const geometry = cell.getElementsByTagName('mxGeometry')[0];
    if (!geometry) return null;

    return {
      x: parseFloat(geometry.getAttribute('x') || '0'),
      y: parseFloat(geometry.getAttribute('y') || '0'),
      width: parseFloat(geometry.getAttribute('width') || '100'),
      height: parseFloat(geometry.getAttribute('height') || '100'),
    };
  }

  /**
   * Calculate position for screenshot image near a cell
   */
  calculateImagePosition(originalCell: Element, offset: 'right' | 'below' = 'right'): Position | null {
    const pos = this.getCellPosition(originalCell);
    if (!pos) return null;

    const imageWidth = 400;  // Standard screenshot width
    const imageHeight = 300; // Standard screenshot height
    const margin = 50;       // Margin between cells

    if (offset === 'right') {
      return {
        x: pos.x + pos.width + margin,
        y: pos.y,
        width: imageWidth,
        height: imageHeight,
      };
    } else {
      return {
        x: pos.x,
        y: pos.y + pos.height + margin,
        width: imageWidth,
        height: imageHeight,
      };
    }
  }

  /**
   * Create image cell element
   */
  createImageCell(doc: Document, config: ImageCellConfig): Element {
    const cell = doc.createElement('mxCell');

    // Set attributes
    cell.setAttribute('id', config.id);
    cell.setAttribute('vertex', '1');
    cell.setAttribute('parent', config.parentId || '1');

    // Create style with base64 image
    const style = [
      'shape=image',
      `image=data:image/png;base64,${config.base64Data}`,
      'imageAspect=1',
      'aspect=fixed',
    ].join(';');
    cell.setAttribute('style', style);

    // Set label if provided
    if (config.label) {
      cell.setAttribute('value', config.label);
    }

    // Create geometry element
    const geometry = doc.createElement('mxGeometry');
    geometry.setAttribute('x', String(config.position.x));
    geometry.setAttribute('y', String(config.position.y));
    geometry.setAttribute('width', String(config.position.width));
    geometry.setAttribute('height', String(config.position.height));
    geometry.setAttribute('as', 'geometry');

    cell.appendChild(geometry);

    return cell;
  }

  /**
   * Insert cell into diagram
   */
  insertCell(doc: Document, cell: Element): void {
    const root = this.getRoot(doc);
    if (!root) {
      throw new Error('Could not find <root> element in Draw.io diagram');
    }

    root.appendChild(cell);
  }

  /**
   * Get root element
   */
  private getRoot(doc: Document): Element | null {
    const roots = doc.getElementsByTagName('root');
    return roots.length > 0 ? (roots[0] as Element) : null;
  }

  /**
   * Update mxfile metadata
   */
  updateMetadata(doc: Document, updates: { modified?: string; version?: string }): void {
    const mxfile = doc.getElementsByTagName('mxfile')[0];
    if (!mxfile) return;

    if (updates.modified) {
      mxfile.setAttribute('modified', updates.modified);
    }

    if (updates.version) {
      mxfile.setAttribute('version', updates.version);
    }
  }

  /**
   * Create annotation cell (text box for metadata)
   */
  createAnnotationCell(
    doc: Document,
    id: string,
    text: string,
    position: Position
  ): Element {
    const cell = doc.createElement('mxCell');

    cell.setAttribute('id', id);
    cell.setAttribute('value', text);
    cell.setAttribute('vertex', '1');
    cell.setAttribute('parent', '1');

    // Style for annotation
    const style = [
      'text',
      'html=1',
      'strokeColor=none',
      'fillColor=none',
      'align=left',
      'verticalAlign=top',
      'whiteSpace=wrap',
      'rounded=0',
      'fontSize=10',
      'fontColor=#666666',
    ].join(';');
    cell.setAttribute('style', style);

    // Create geometry
    const geometry = doc.createElement('mxGeometry');
    geometry.setAttribute('x', String(position.x));
    geometry.setAttribute('y', String(position.y));
    geometry.setAttribute('width', String(position.width));
    geometry.setAttribute('height', String(position.height));
    geometry.setAttribute('as', 'geometry');

    cell.appendChild(geometry);

    return cell;
  }

  /**
   * Validate Draw.io XML structure
   */
  validate(doc: Document): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for mxfile root
    const mxfile = doc.getElementsByTagName('mxfile');
    if (mxfile.length === 0) {
      errors.push('Missing <mxfile> root element');
    }

    // Check for diagram
    const diagram = doc.getElementsByTagName('diagram');
    if (diagram.length === 0) {
      errors.push('Missing <diagram> element');
    }

    // Check for mxGraphModel
    const model = doc.getElementsByTagName('mxGraphModel');
    if (model.length === 0) {
      errors.push('Missing <mxGraphModel> element');
    }

    // Check for root
    const root = doc.getElementsByTagName('root');
    if (root.length === 0) {
      errors.push('Missing <root> element');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Clone document for safe manipulation
   */
  cloneDocument(doc: Document): Document {
    const xml = this.serialize(doc);
    return this.parse(xml);
  }

  /**
   * Get all cells in diagram
   */
  getAllCells(doc: Document): Element[] {
    const cells = doc.getElementsByTagName('mxCell');
    const result: Element[] = [];

    for (let i = 0; i < cells.length; i++) {
      result.push(cells[i] as Element);
    }

    return result;
  }

  /**
   * Get cell by label (for debugging)
   */
  findCellByLabel(doc: Document, label: string): Element | null {
    const cells = this.getAllCells(doc);

    for (const cell of cells) {
      const value = cell.getAttribute('value');
      if (value && value.includes(label)) {
        return cell;
      }
    }

    return null;
  }

  /**
   * Generate unique cell ID
   */
  generateCellId(doc: Document, prefix: string = 'cell'): string {
    let counter = 1;
    let id = `${prefix}-${counter}`;

    while (this.findCell(doc, id)) {
      counter++;
      id = `${prefix}-${counter}`;
    }

    return id;
  }

  /**
   * Format XML with proper indentation (for debugging)
   */
  formatXML(xml: string): string {
    // Simple formatting - add newlines and indentation
    // Note: This is basic formatting for readability
    let formatted = '';
    let indent = 0;
    const tab = '  ';

    xml.split(/>\s*</).forEach((node) => {
      if (node.match(/^\/\w/)) indent--; // Closing tag
      formatted += tab.repeat(indent) + '<' + node + '>\n';
      if (node.match(/^<?\w[^>]*[^\/]$/)) indent++; // Opening tag
    });

    return formatted.substring(1, formatted.length - 2);
  }
}

/**
 * Utility function to create manipulator
 */
export function createManipulator(): DrawioXMLManipulator {
  return new DrawioXMLManipulator();
}
