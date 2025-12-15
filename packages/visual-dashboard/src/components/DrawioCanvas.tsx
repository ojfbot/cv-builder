/**
 * DrawioCanvas component - Interactive SVG canvas for draw.io diagrams
 */

import { useState, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { DrawioPage, DrawioCell } from '../utils/drawioParser';
import { parseDrawioStyle, drawioColorToCSS, decodeDrawioValue } from '../utils/drawioParser';
import './DrawioCanvas.css';

interface DrawioCanvasProps {
  pages: DrawioPage[];
  activePage?: number;
  onPageChange?: (pageIndex: number) => void;
}

export function DrawioCanvas({ pages, activePage = 0, onPageChange }: DrawioCanvasProps) {
  const [currentPage, setCurrentPage] = useState(activePage);

  useEffect(() => {
    setCurrentPage(activePage);
  }, [activePage]);

  const handlePageChange = (pageIndex: number) => {
    setCurrentPage(pageIndex);
    onPageChange?.(pageIndex);
  };

  if (pages.length === 0) {
    return (
      <div className="drawio-canvas-empty">
        <p>No diagram pages found</p>
      </div>
    );
  }

  const page = pages[currentPage];
  if (!page) {
    return null;
  }

  return (
    <div className="drawio-canvas-container">
      {/* Page tabs for multi-page diagrams */}
      {pages.length > 1 && (
        <div className="drawio-page-tabs">
          {pages.map((p, index) => (
            <button
              key={p.id}
              className={`drawio-page-tab ${index === currentPage ? 'active' : ''}`}
              onClick={() => handlePageChange(index)}
              aria-label={`View page ${p.name}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Zoom/Pan wrapper */}
      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={5}
        centerOnInit={true}
        wheel={{ step: 0.1 }}
        doubleClick={{ mode: 'reset' }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Zoom controls */}
            <div className="drawio-zoom-controls">
              <button
                onClick={() => zoomIn()}
                aria-label="Zoom in"
                title="Zoom in"
              >
                +
              </button>
              <button
                onClick={() => zoomOut()}
                aria-label="Zoom out"
                title="Zoom out"
              >
                -
              </button>
              <button
                onClick={() => resetTransform()}
                aria-label="Reset zoom"
                title="Reset zoom"
              >
                ⟲
              </button>
            </div>

            {/* SVG Canvas */}
            <TransformComponent
              wrapperClass="drawio-transform-wrapper"
              contentClass="drawio-transform-content"
            >
              <svg
                className="drawio-svg"
                viewBox={`${page.viewBox.x} ${page.viewBox.y} ${page.viewBox.width} ${page.viewBox.height}`}
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Arrow marker definitions - define once per unique color */}
                <defs>
                  {getUniqueEdgeColors(page.cells).map((color) => (
                    <marker
                      key={`arrowhead-${color}`}
                      id={`arrowhead-${color}`}
                      markerWidth="10"
                      markerHeight="10"
                      refX="9"
                      refY="3"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3, 0 6" fill={color} />
                    </marker>
                  ))}
                </defs>

                <g className="drawio-cells">
                  {page.cells.map((cell) => renderCell(cell, page.cells))}
                </g>
              </svg>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}

// Constants for shape rendering
const CYLINDER_TOP_HEIGHT = 10;
const CYLINDER_BOTTOM_HEIGHT = 10;
const ROUNDED_CORNER_RADIUS = 10;
const DEFAULT_FONT_SIZE = 12;

/**
 * Get unique edge colors from all cells to create marker definitions
 */
function getUniqueEdgeColors(cells: DrawioCell[]): string[] {
  const colors = new Set<string>();
  cells.forEach((cell) => {
    if (cell.edge) {
      const style = parseDrawioStyle(cell.style);
      const strokeColor = drawioColorToCSS(style.strokeColor);
      colors.add(strokeColor);
    }
  });
  return Array.from(colors);
}

/**
 * Render a single draw.io cell as SVG
 */
function renderCell(cell: DrawioCell, allCells: DrawioCell[]): JSX.Element | null {
  // Skip root cells (id 0 and 1)
  if (cell.id === '0' || cell.id === '1') {
    return null;
  }

  const style = parseDrawioStyle(cell.style);
  const value = decodeDrawioValue(cell.value);

  // Render vertex (shape/box)
  if (cell.vertex && cell.geometry) {
    const { x, y, width, height } = cell.geometry;

    // Determine shape type from style
    const shape = style.shape || 'rectangle';
    const fillColor = drawioColorToCSS(style.fillColor);
    const strokeColor = drawioColorToCSS(style.strokeColor);
    const strokeWidth = parseFloat(style.strokeWidth || '1');
    const fontSize = parseFloat(style.fontSize || '12');
    const fontColor = drawioColorToCSS(style.fontColor);
    const rounded = style.rounded === '1';

    return (
      <g key={cell.id} className="drawio-vertex">
        {/* Shape background */}
        {renderShape(shape, x, y, width, height, {
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth,
          rounded,
        })}

        {/* Text label */}
        {value && (
          <text
            x={x + width / 2}
            y={y + height / 2}
            dominantBaseline="middle"
            textAnchor="middle"
            fontSize={fontSize}
            fill={fontColor}
            className="drawio-text"
          >
            {value.split('<br>').map((line, i) => (
              <tspan key={i} x={x + width / 2} dy={i === 0 ? 0 : fontSize * 1.2}>
                {line}
              </tspan>
            ))}
          </text>
        )}
      </g>
    );
  }

  // Render edge (connector/arrow)
  if (cell.edge && cell.source && cell.target) {
    const sourceCell = allCells.find((c) => c.id === cell.source);
    const targetCell = allCells.find((c) => c.id === cell.target);

    if (!sourceCell?.geometry || !targetCell?.geometry) {
      return null;
    }

    const strokeColor = drawioColorToCSS(style.strokeColor);
    const strokeWidth = parseFloat(style.strokeWidth || '1');

    // Calculate connector line (simplified - straight line between centers)
    const x1 = sourceCell.geometry.x + sourceCell.geometry.width / 2;
    const y1 = sourceCell.geometry.y + sourceCell.geometry.height / 2;
    const x2 = targetCell.geometry.x + targetCell.geometry.width / 2;
    const y2 = targetCell.geometry.y + targetCell.geometry.height / 2;

    return (
      <g key={cell.id} className="drawio-edge">
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          markerEnd={`url(#arrowhead-${strokeColor})`}
        />

        {/* Edge label */}
        {value && (
          <text
            x={(x1 + x2) / 2}
            y={(y1 + y2) / 2}
            dominantBaseline="middle"
            textAnchor="middle"
            fontSize={DEFAULT_FONT_SIZE}
            fill={strokeColor}
            className="drawio-edge-label"
          >
            {value}
          </text>
        )}
      </g>
    );
  }

  return null;
}

/**
 * Render different shape types
 */
function renderShape(
  shape: string,
  x: number,
  y: number,
  width: number,
  height: number,
  style: {
    fill: string;
    stroke: string;
    strokeWidth: number;
    rounded: boolean;
  }
): JSX.Element {
  const { fill, stroke, strokeWidth, rounded } = style;

  switch (shape) {
    case 'ellipse':
      return (
        <ellipse
          cx={x + width / 2}
          cy={y + height / 2}
          rx={width / 2}
          ry={height / 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );

    case 'rhombus':
      const points = `${x + width / 2},${y} ${x + width},${y + height / 2} ${x + width / 2},${y + height} ${x},${y + height / 2}`;
      return (
        <polygon
          points={points}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );

    case 'triangle':
      const trianglePoints = `${x + width / 2},${y} ${x + width},${y + height} ${x},${y + height}`;
      return (
        <polygon
          points={trianglePoints}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );

    case 'hexagon':
      const hexPoints = `${x + width * 0.25},${y} ${x + width * 0.75},${y} ${x + width},${y + height / 2} ${x + width * 0.75},${y + height} ${x + width * 0.25},${y + height} ${x},${y + height / 2}`;
      return (
        <polygon
          points={hexPoints}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );

    case 'cylinder':
      return (
        <g>
          <ellipse
            cx={x + width / 2}
            cy={y + CYLINDER_TOP_HEIGHT}
            rx={width / 2}
            ry={CYLINDER_TOP_HEIGHT}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <rect
            x={x}
            y={y + CYLINDER_TOP_HEIGHT}
            width={width}
            height={height - CYLINDER_TOP_HEIGHT - CYLINDER_BOTTOM_HEIGHT}
            fill={fill}
            stroke="none"
          />
          <line
            x1={x}
            y1={y + CYLINDER_TOP_HEIGHT}
            x2={x}
            y2={y + height - CYLINDER_BOTTOM_HEIGHT}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <line
            x1={x + width}
            y1={y + CYLINDER_TOP_HEIGHT}
            x2={x + width}
            y2={y + height - CYLINDER_BOTTOM_HEIGHT}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <ellipse
            cx={x + width / 2}
            cy={y + height - CYLINDER_BOTTOM_HEIGHT}
            rx={width / 2}
            ry={CYLINDER_BOTTOM_HEIGHT}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </g>
      );

    case 'rectangle':
    default:
      return (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={rounded ? ROUNDED_CORNER_RADIUS : 0}
          ry={rounded ? ROUNDED_CORNER_RADIUS : 0}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
  }
}
