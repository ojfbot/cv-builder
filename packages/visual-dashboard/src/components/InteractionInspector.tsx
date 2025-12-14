/**
 * InteractionInspector component for detailed inspection of test interactions
 */

import { useState } from 'react';
import type { InteractionResult, ScreenshotMetadata } from '../types';
import { getScreenshotUrl } from '../utils/dataLoader';

interface InteractionInspectorProps {
  interaction: InteractionResult;
  index: number;
  manifestPath?: string;
  onScreenshotClick?: (screenshots: ScreenshotMetadata[]) => void;
}

export function InteractionInspector({
  interaction,
  index: _index,
  manifestPath,
  onScreenshotClick,
}: InteractionInspectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: 0 }}>
            Step {interaction.stepNumber}: {interaction.node.label}
          </h4>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            Node ID: <code style={{ backgroundColor: 'var(--color-surface)', padding: '0.125rem 0.25rem' }}>{interaction.node.id}</code>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className={`badge ${interaction.success ? 'success' : 'error'}`}>
            {interaction.success ? 'PASSED' : 'FAILED'}
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              backgroundColor: 'var(--color-surface-hover)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--border-radius)',
              cursor: 'pointer',
            }}
          >
            {isExpanded ? '▼' : '▶'} Details
          </button>
        </div>
      </div>

      <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
        <div>Duration: {interaction.duration}ms</div>
        {interaction.error && (
          <div
            style={{
              color: 'var(--color-error)',
              backgroundColor: '#520408',
              padding: '0.5rem',
              borderRadius: 'var(--border-radius)',
              marginTop: '0.5rem',
              border: '1px solid var(--color-error)',
            }}
          >
            <strong>Error:</strong> {interaction.error}
          </div>
        )}
      </div>

      {/* Screenshot Thumbnails */}
      {interaction.screenshots.length > 0 && !isExpanded && (
        <div>
          <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            Screenshots ({interaction.screenshots.length}):
          </strong>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem' }}>
            {interaction.screenshots.map((screenshot, idx) => (
              <div
                key={idx}
                onClick={() => onScreenshotClick?.(interaction.screenshots)}
                style={{
                  cursor: 'pointer',
                  border: `2px solid ${screenshot.passed ? 'var(--color-success)' : 'var(--color-error)'}`,
                  borderRadius: 'var(--border-radius)',
                  overflow: 'hidden',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <img
                  src={manifestPath ? getScreenshotUrl(screenshot.screenshotPath, manifestPath) : screenshot.screenshotPath}
                  alt={`Screenshot ${idx + 1}`}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                />
                <div
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    backgroundColor: screenshot.passed ? '#044317' : '#520408',
                    textAlign: 'center',
                    color: screenshot.passed ? 'var(--color-success)' : 'var(--color-error)',
                  }}
                >
                  {screenshot.captureAt}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isExpanded && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--border-radius)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h5 style={{ marginTop: 0 }}>Node Metadata</h5>
          <pre
            style={{
              fontSize: '0.75rem',
              overflow: 'auto',
              backgroundColor: 'var(--color-bg)',
              padding: '0.75rem',
              borderRadius: 'var(--border-radius)',
              border: '1px solid var(--color-border)',
            }}
          >
            {JSON.stringify(interaction.node, null, 2)}
          </pre>

          {interaction.screenshots.length > 0 && (
            <>
              <h5>Screenshot Details</h5>
              {interaction.screenshots.map((screenshot, idx) => (
                <div
                  key={idx}
                  style={{
                    marginBottom: '0.5rem',
                    padding: '0.5rem',
                    backgroundColor: 'var(--color-bg)',
                    borderRadius: 'var(--border-radius)',
                    fontSize: '0.75rem',
                  }}
                >
                  <div>
                    <strong>Capture:</strong> {screenshot.captureAt}
                  </div>
                  <div>
                    <strong>Path:</strong> <code>{screenshot.screenshotPath}</code>
                  </div>
                  <div>
                    <strong>Viewport:</strong> {screenshot.viewport.width}x{screenshot.viewport.height} @
                    {screenshot.viewport.deviceScaleFactor}x
                  </div>
                  <div>
                    <strong>Timestamp:</strong> {new Date(screenshot.timestamp).toLocaleString()}
                  </div>
                  {screenshot.diffPercentage !== undefined && (
                    <div>
                      <strong>Diff:</strong> {screenshot.diffPercentage.toFixed(2)}%
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
