/**
 * Hook for loading test manifest
 */

import { useState, useEffect } from 'react';
import type { TestManifest } from '../types';
import { loadManifest } from '../utils/dataLoader';

export function useManifest(manifestPath: string | null) {
  const [manifest, setManifest] = useState<TestManifest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!manifestPath) {
      setManifest(null);
      return;
    }

    setLoading(true);
    setError(null);

    loadManifest(manifestPath)
      .then((data) => {
        setManifest(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [manifestPath]);

  return { manifest, loading, error };
}
