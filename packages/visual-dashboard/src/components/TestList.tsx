/**
 * TestList component for displaying all test runs with filtering
 */

import { useState } from 'react';
import type { TestRun, StatusFilter } from '../types';
import { FilterBar } from './FilterBar';
import { TestRunCard } from './TestRunCard';
import { useTestRuns } from '../hooks/useTestRuns';

interface TestListProps {
  onSelectRun: (run: TestRun) => void;
}

export function TestList({ onSelectRun }: TestListProps) {
  const { runs, loading, error } = useTestRuns();
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  if (loading) {
    return <div className="loading">Loading test runs...</div>;
  }

  if (error) {
    return <div className="error-message">Failed to load test runs: {error.message}</div>;
  }

  const filteredRuns = runs.filter((run) => {
    if (statusFilter !== 'all' && run.passed !== (statusFilter === 'passed')) {
      return false;
    }
    if (filter) {
      const searchLower = filter.toLowerCase();
      return (
        run.branch.toLowerCase().includes(searchLower) ||
        run.commit.toLowerCase().includes(searchLower) ||
        (run.pr && run.pr.toString().includes(filter))
      );
    }
    return true;
  });

  return (
    <div className="test-list">
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Test Runs ({filteredRuns.length})</h2>
      </div>

      <FilterBar
        filter={filter}
        onFilterChange={setFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {filteredRuns.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          No test runs found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-2">
          {filteredRuns.map((run) => (
            <TestRunCard key={run.id} run={run} onClick={() => onSelectRun(run)} />
          ))}
        </div>
      )}
    </div>
  );
}
