/**
 * FilterBar component for search and filtering
 */

import type { StatusFilter } from '../types';

interface FilterBarProps {
  filter: string;
  onFilterChange: (filter: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
}

export function FilterBar({
  filter,
  onFilterChange,
  statusFilter,
  onStatusFilterChange,
}: FilterBarProps) {
  return (
    <div className="filter-bar" style={{ marginBottom: '1.5rem' }}>
      <div className="flex" style={{ gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by branch or commit..."
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '0.5rem 1rem',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--border-radius)',
            fontSize: '0.875rem',
          }}
        />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => onStatusFilterChange('all')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: statusFilter === 'all' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: statusFilter === 'all' ? '#fff' : 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--border-radius)',
              fontSize: '0.875rem',
            }}
          >
            All
          </button>
          <button
            onClick={() => onStatusFilterChange('passed')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: statusFilter === 'passed' ? 'var(--color-success)' : 'var(--color-surface)',
              color: statusFilter === 'passed' ? '#fff' : 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--border-radius)',
              fontSize: '0.875rem',
            }}
          >
            Passed
          </button>
          <button
            onClick={() => onStatusFilterChange('failed')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: statusFilter === 'failed' ? 'var(--color-error)' : 'var(--color-surface)',
              color: statusFilter === 'failed' ? '#fff' : 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--border-radius)',
              fontSize: '0.875rem',
            }}
          >
            Failed
          </button>
        </div>
      </div>
    </div>
  );
}
