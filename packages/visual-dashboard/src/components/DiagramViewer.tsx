/**
 * DiagramViewer component for displaying Draw.io diagrams
 */

import { useState, useEffect } from 'react';
import { DrawioCanvas } from './DrawioCanvas';
import { parseDrawioXML } from '../utils/drawioParser';
import type { DrawioDiagram } from '../utils/drawioParser';

interface DiagramViewerProps {
  diagramUrl: string;
  diagramName: string;
}

export function DiagramViewer({ diagramUrl, diagramName }: DiagramViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [diagram, setDiagram] = useState<DrawioDiagram | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isExpanded && !diagram && !loading) {
      loadDiagram();
    }
  }, [isExpanded, diagram, loading]);

  const loadDiagram = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(diagramUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch diagram: ${response.statusText}`);
      }

      const xmlContent = await response.text();
      const parsedDiagram = parseDrawioXML(xmlContent);
      setDiagram(parsedDiagram);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to load diagram:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Test Flow Diagram</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-bg)',
            border: 'none',
            borderRadius: 'var(--border-radius)',
            cursor: 'pointer',
          }}
        >
          {isExpanded ? 'Collapse' : 'Expand'} Diagram
        </button>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <strong>Source:</strong> {diagramName}
        <br />
        <a
          href={diagramUrl}
          download={diagramName}
          style={{ color: 'var(--color-primary)', fontSize: '0.875rem' }}
        >
          Download .drawio file
        </a>
      </div>

      {isExpanded && (
        <div>
          {loading && (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              Loading diagram...
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#520408',
                border: '2px solid var(--color-error)',
                borderRadius: 'var(--border-radius)',
                color: 'var(--color-error)',
              }}
            >
              <strong>Error:</strong> {error}
            </div>
          )}

          {diagram && !loading && !error && (
            <DrawioCanvas pages={diagram.pages} />
          )}
        </div>
      )}
    </div>
  );
}
