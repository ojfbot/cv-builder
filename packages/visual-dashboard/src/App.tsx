/**
 * Main App component
 */

import { useState } from 'react';
import type { TestRun } from './types';
import { TestList } from './components/TestList';
import { TestRunDetail } from './components/TestRunDetail';

export function App() {
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          padding: '1rem 0',
          marginBottom: '2rem',
        }}
      >
        <div className="container">
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 600 }}>
            Visual Regression Dashboard
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            CV Builder - Test Results
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container">
        {selectedRun ? (
          <TestRunDetail run={selectedRun} onBack={() => setSelectedRun(null)} />
        ) : (
          <TestList onSelectRun={setSelectedRun} />
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          marginTop: '4rem',
          padding: '2rem 0',
          borderTop: '1px solid var(--color-border)',
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
          fontSize: '0.875rem',
        }}
      >
        <div className="container">
          <p>
            Powered by{' '}
            <a href="https://github.com/ojfbot/cv-builder" target="_blank" rel="noopener noreferrer">
              CV Builder
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
