/**
 * Draw.io XML Parser
 * Parses draw.io (.drawio) XML files and extracts diagram data for rendering
 */

export interface DrawioPage {
  id: string;
  name: string;
  cells: DrawioCell[];
  viewBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DrawioCell {
  id: string;
  value: string;
  style: string;
  vertex?: boolean;
  edge?: boolean;
  parent?: string;
  geometry?: {
    x: number;
    y: number;
    width: number;
    height: number;
    relative?: boolean;
  };
  source?: string;
  target?: string;
}

export interface DrawioDiagram {
  pages: DrawioPage[];
  metadata: {
    host: string;
    version: string;
    agent: string;
  };
}

/**
 * Parse draw.io XML content and extract diagram structure
 */
export function parseDrawioXML(xmlContent: string): DrawioDiagram {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

  // Check for parsing errors
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error(`XML parsing error: ${parserError.textContent}`);
  }

  // Extract metadata
  const mxfile = xmlDoc.querySelector('mxfile');
  if (!mxfile) {
    throw new Error('Invalid draw.io file: missing mxfile element');
  }

  const metadata = {
    host: mxfile.getAttribute('host') || '',
    version: mxfile.getAttribute('version') || '',
    agent: mxfile.getAttribute('agent') || '',
  };

  // Extract all diagram pages
  const diagrams = xmlDoc.querySelectorAll('diagram');
  const pages: DrawioPage[] = [];

  diagrams.forEach((diagram) => {
    const pageId = diagram.getAttribute('id') || '';
    const pageName = diagram.getAttribute('name') || 'Untitled';

    // Get mxGraphModel
    const graphModel = diagram.querySelector('mxGraphModel');
    if (!graphModel) {
      return;
    }

    // Extract page dimensions from mxGraphModel attributes.
    // Note: dx/dy represent the editor viewport scroll offset, not a layout
    // transform — cell x/y coordinates are already in absolute diagram space,
    // so dx/dy should NOT be added to the viewBox origin.
    const pageWidth = parseFloat(graphModel.getAttribute('pageWidth') || '850');
    const pageHeight = parseFloat(graphModel.getAttribute('pageHeight') || '1100');

    // Extract all cells
    const root = graphModel.querySelector('root');
    if (!root) {
      return;
    }

    const cellElements = root.querySelectorAll('mxCell');
    const cells: DrawioCell[] = [];

    cellElements.forEach((cellElement) => {
      const cell: DrawioCell = {
        id: cellElement.getAttribute('id') || '',
        value: cellElement.getAttribute('value') || '',
        style: cellElement.getAttribute('style') || '',
        parent: cellElement.getAttribute('parent') || undefined,
        vertex: cellElement.getAttribute('vertex') === '1',
        edge: cellElement.getAttribute('edge') === '1',
      };

      // Parse geometry
      const geometry = cellElement.querySelector('mxGeometry');
      if (geometry) {
        cell.geometry = {
          x: parseFloat(geometry.getAttribute('x') || '0'),
          y: parseFloat(geometry.getAttribute('y') || '0'),
          width: parseFloat(geometry.getAttribute('width') || '0'),
          height: parseFloat(geometry.getAttribute('height') || '0'),
          relative: geometry.getAttribute('relative') === '1',
        };
      }

      // Parse edge connections
      if (cell.edge) {
        cell.source = cellElement.getAttribute('source') || undefined;
        cell.target = cellElement.getAttribute('target') || undefined;
      }

      cells.push(cell);
    });

    // Calculate viewBox based on cell positions
    const viewBox = calculateViewBox(cells, pageWidth, pageHeight);

    pages.push({
      id: pageId,
      name: pageName,
      cells,
      viewBox,
    });
  });

  return {
    pages,
    metadata,
  };
}

/**
 * Calculate the viewBox dimensions based on cell positions
 */
function calculateViewBox(
  cells: DrawioCell[],
  pageWidth: number,
  pageHeight: number
): { x: number; y: number; width: number; height: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  cells.forEach((cell) => {
    if (cell.geometry && !cell.geometry.relative) {
      const x = cell.geometry.x;
      const y = cell.geometry.y;
      const width = cell.geometry.width;
      const height = cell.geometry.height;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    }
  });

  // Fall back to page dimensions if no cells had geometry
  if (minX === Infinity) {
    minX = 0;
    minY = 0;
    maxX = pageWidth;
    maxY = pageHeight;
  }

  // Add padding
  const padding = 50;
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

/**
 * Parse draw.io style string into CSS-compatible object
 */
export function parseDrawioStyle(style: string): Record<string, string> {
  const styleObj: Record<string, string> = {};

  if (!style) {
    return styleObj;
  }

  const pairs = style.split(';');
  pairs.forEach((pair) => {
    // Use indexOf so values containing '=' (e.g. base64 or pre-signed URLs) are not truncated
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) return;
    const key = pair.substring(0, eqIdx).trim();
    const value = pair.substring(eqIdx + 1).trim();
    if (key) {
      styleObj[key] = value;
    }
  });

  return styleObj;
}

/**
 * Allowlist regex for safe CSS color values.
 * Accepts: #rgb/#rrggbb/#rrggbbaa, rgb(...), rgba(...), named colors (letters only),
 * "none", and "transparent". Rejects url(...), expression(...), javascript:..., etc.
 */
const SAFE_COLOR_RE =
  /^(#[0-9a-fA-F]{3,8}|rgb\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*\)|rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*\)|none|transparent|[a-zA-Z]+)$/;

/**
 * Convert draw.io color format to a safe CSS color string.
 * Values that don't match the allowlist (e.g. url(javascript:...)) fall back to
 * "transparent" so a malicious or corrupted .drawio file cannot inject executable
 * payloads into SVG fill/stroke attribute values.
 */
export function drawioColorToCSS(color: string | undefined): string {
  if (!color) {
    return 'transparent';
  }

  const trimmed = color.trim();

  if (!SAFE_COLOR_RE.test(trimmed)) {
    return 'transparent';
  }

  return trimmed;
}

/**
 * Get text from HTML-encoded draw.io value
 * Uses DOMParser for secure HTML entity decoding without XSS risk
 */
export function decodeDrawioValue(value: string): string {
  if (!value) {
    return '';
  }

  // Use DOMParser for safer HTML entity decoding
  const parser = new DOMParser();
  const doc = parser.parseFromString('<!doctype html><body>' + value, 'text/html');
  return doc.body.textContent || '';
}
