/**
 * TestRunDetail component for displaying detailed test run results
 */

import { useState } from 'react';
import type { TestRun, ScreenshotMetadata } from '../types';
import { useManifest } from '../hooks/useManifest';
import { ScreenshotGallery } from './ScreenshotGallery';
import { DiagramViewer } from './DiagramViewer';
import { InteractionInspector } from './InteractionInspector';
import { getDiagramUrl } from '../utils/dataLoader';

interface TestRunDetailProps {
  run: TestRun;
  onBack: () => void;
}

export function TestRunDetail({ run, onBack }: TestRunDetailProps) {
  const { manifest, loading, error } = useManifest(run.manifestPath);
  const [galleryScreenshots, setGalleryScreenshots] = useState<ScreenshotMetadata[] | null>(null);

  if (loading) {
    return (
      <div>
        <button onClick={onBack} style={{ marginBottom: '1rem', padding: '0.5rem 1rem' }}>
          ← Back to List
        </button>
        <div className="loading">Loading test details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <button onClick={onBack} style={{ marginBottom: '1rem', padding: '0.5rem 1rem' }}>
          ← Back to List
        </button>
        <div className="error-message">Failed to load test details: {error.message}</div>
      </div>
    );
  }

  if (!manifest) {
    return null;
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleScreenshotClick = (screenshots: ScreenshotMetadata[]) => {
    setGalleryScreenshots(screenshots);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={onBack}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--border-radius)',
          }}
        >
          ← Back to List
        </button>
        <span className={`badge ${run.passed ? 'success' : 'error'}`} style={{ fontSize: '1rem' }}>
          {run.passed ? 'PASSED' : 'FAILED'}
        </span>
      </div>

      {/* Summary Card */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{run.branch}</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div>
            <strong>Commit:</strong> {run.commit.substring(0, 7)}
          </div>
          <div>
            <strong>Date:</strong> {formatDate(run.timestamp)}
          </div>
          {run.pr && (
            <div>
              <strong>PR:</strong> #{run.pr}
            </div>
          )}
          <div>
            <strong>Duration:</strong> {(manifest.duration / 1000).toFixed(2)}s
          </div>
          <div>
            <strong>Total Steps:</strong> {manifest.totalSteps}
          </div>
          <div>
            <strong>Screenshots:</strong> {manifest.screenshotsCaptured}
          </div>
          <div>
            <strong>Passed:</strong> {manifest.summary.totalPassed}
          </div>
          <div>
            <strong>Failed:</strong> {manifest.summary.totalFailed}
          </div>
          <div>
            <strong>Avg Diff:</strong> {manifest.summary.averageDiffPercentage.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Diagram Viewer */}
      {run.diagrams && run.diagrams.length > 0 && (
        <DiagramViewer
          diagramUrl={getDiagramUrl(run.diagrams[0], run.manifestPath)}
          diagramName={run.diagrams[0]}
        />
      )}

      {/* Test Analysis */}
      {manifest.summary.totalFailed > 0 && (
        <div
          className="card"
          style={{
            border: '2px solid var(--color-error)',
            backgroundColor: '#520408',
          }}
        >
          <h3 style={{ marginTop: 0, color: 'var(--color-error)' }}>
            ⚠️ Test Failures Detected
          </h3>
          <p style={{ marginBottom: '0.5rem' }}>
            This test run shows <strong>{manifest.summary.totalFailed}</strong> failing interaction(s).
            These failures indicate that the interactions defined in the Draw.io diagram could not execute
            successfully.
          </p>
          <details style={{ marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
              Common Causes & Next Steps
            </summary>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
              <li>Missing values in interaction nodes (e.g., type actions without input values)</li>
              <li>Incorrect CSS selectors or element locators</li>
              <li>Target elements not present in the UI</li>
              <li>Network timeouts or slow page loads</li>
            </ul>
            <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
              💡 <strong>Tip:</strong> Expand each interaction below to see detailed error messages and node metadata.
            </p>
          </details>
        </div>
      )}

      {/* Interactions */}
      <h3>Test Interactions ({manifest.interactions.length})</h3>
      {manifest.interactions.map((interaction, index) => (
        <InteractionInspector
          key={index}
          interaction={interaction}
          index={index}
          manifestPath={run.manifestPath}
          onScreenshotClick={handleScreenshotClick}
        />
      ))}

      {/* Screenshot Gallery */}
      {galleryScreenshots && (
        <ScreenshotGallery
          screenshots={galleryScreenshots}
          manifestPath={run.manifestPath}
          onClose={() => setGalleryScreenshots(null)}
        />
      )}
    </div>
  );
}
