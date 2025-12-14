/**
 * TestRunDetail component for displaying detailed test run results
 */

import { useState } from 'react';
import type { TestRun, ScreenshotMetadata } from '../types';
import { useManifest } from '../hooks/useManifest';
import { ScreenshotGallery } from './ScreenshotGallery';
import { getScreenshotUrl } from '../utils/dataLoader';

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

      {/* Interactions */}
      <h3>Test Interactions</h3>
      {manifest.interactions.map((interaction, index) => (
        <div key={index} className="card">
          <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
            <h4 style={{ margin: 0 }}>
              Step {interaction.stepNumber}: {interaction.node.label}
            </h4>
            <span className={`badge ${interaction.success ? 'success' : 'error'}`}>
              {interaction.success ? 'PASSED' : 'FAILED'}
            </span>
          </div>

          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            <div>Duration: {interaction.duration}ms</div>
            {interaction.error && <div style={{ color: 'var(--color-error)' }}>Error: {interaction.error}</div>}
          </div>

          {/* Screenshots */}
          {interaction.screenshots.length > 0 && (
            <div>
              <strong style={{ display: 'block', marginBottom: '0.5rem' }}>
                Screenshots ({interaction.screenshots.length}):
              </strong>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                {interaction.screenshots.map((screenshot, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleScreenshotClick(interaction.screenshots)}
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
                      src={getScreenshotUrl(screenshot.screenshotPath, run.manifestPath)}
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
                        backgroundColor: screenshot.passed ? '#d1f1dc' : '#ffd7d9',
                        textAlign: 'center',
                      }}
                    >
                      {screenshot.captureAt} - {screenshot.passed ? 'OK' : `${screenshot.diffPercentage?.toFixed(2)}%`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
