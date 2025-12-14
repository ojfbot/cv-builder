/**
 * DiagramViewer component for displaying Draw.io diagrams
 */

import { useState } from 'react';

interface DiagramViewerProps {
  diagramUrl: string;
  diagramName: string;
}

export function DiagramViewer({ diagramUrl, diagramName }: DiagramViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
        <div
          style={{
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--border-radius)',
            padding: '1rem',
            backgroundColor: '#ffffff',
          }}
        >
          <div
            style={{
              color: 'var(--color-text-secondary)',
              textAlign: 'center',
              padding: '2rem',
            }}
          >
            <p>
              Draw.io diagram visualization coming soon.
              <br />
              For now, download the file and open it in{' '}
              <a href="https://app.diagrams.net/" target="_blank" rel="noopener noreferrer">
                diagrams.net
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
