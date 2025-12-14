/**
 * Hook for loading and managing test runs
 */

import { useState, useEffect } from 'react';
import type { TestRun, TestIndex } from '../types';
import { loadTestIndex } from '../utils/dataLoader';

export function useTestRuns() {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadTestIndex()
      .then((index: TestIndex) => {
        setRuns(index.runs);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, []);

  return { runs, loading, error };
}
