/**
 * TestRunCard component for displaying individual test run
 */

import type { TestRun } from '../types';

interface TestRunCardProps {
  run: TestRun;
  onClick: () => void;
}

export function TestRunCard({ run, onClick }: TestRunCardProps) {
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

  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--box-shadow)';
      }}
    >
      <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>{run.branch}</h3>
        <span className={`badge ${run.passed ? 'success' : 'error'}`}>
          {run.passed ? 'PASSED' : 'FAILED'}
        </span>
      </div>

      <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
        <div style={{ marginBottom: '0.25rem' }}>
          <strong>Commit:</strong> {run.commit.substring(0, 7)}
        </div>
        <div style={{ marginBottom: '0.25rem' }}>
          <strong>Date:</strong> {formatDate(run.timestamp)}
        </div>
        {run.pr && (
          <div style={{ marginBottom: '0.25rem' }}>
            <strong>PR:</strong> #{run.pr}
          </div>
        )}
      </div>

      <div className="flex" style={{ gap: '1rem', fontSize: '0.875rem', marginTop: '0.75rem' }}>
        <div>
          <strong>Steps:</strong> {run.totalSteps}
        </div>
        <div style={{ color: run.failedSteps > 0 ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
          <strong>Failed:</strong> {run.failedSteps}
        </div>
        <div>
          <strong>Diagrams:</strong> {run.diagrams.length}
        </div>
      </div>
    </div>
  );
}
