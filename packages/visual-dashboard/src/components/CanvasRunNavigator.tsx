/**
 * CanvasRunNavigator — thumbnail navigator for draw.io canvas CI snapshots.
 *
 * Architecture: the CI pipeline uploads actual Playwright screenshot PNGs to S3
 * alongside a runs-index.json manifest. This component loads that manifest and
 * renders a thumbnail grid of the real screenshots — no custom SVG rendering of
 * the draw.io XML required.
 *
 * Interactive canvas viewing (zoom/pan, full diagram) is delegated to
 * viewer.diagrams.net via the "Open Interactive Canvas" link.
 *
 * Future roadmap (tracked in GitHub issue #canvas-roadmap):
 *   - Run selector UI to compare snapshots across CI runs
 *   - Side-by-side visual diff view (before/after per cell)
 *   - Diff percentage badges
 *   - Historical trend chart
 */

import { useState, useEffect } from 'react';

const S3_BASE = import.meta.env.VITE_S3_BASE_URL;
const S3_PREFIX = import.meta.env.VITE_S3_PREFIX ?? 'ojfbot-cv-builder';

interface RunScreenshot {
  name: string;
  url: string;
}

interface RunEntry {
  runNumber: number;
  timestamp: string;
  drawioUrl: string | null;
  screenshots: RunScreenshot[];
}

interface RunsIndex {
  runs: RunEntry[];
  lastUpdated: string;
}

export function CanvasRunNavigator() {
  const [latestRun, setLatestRun] = useState<RunEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!S3_BASE) {
      setError('VITE_S3_BASE_URL is not set — canvas snapshots unavailable.');
      setLoading(false);
      return;
    }

    const indexUrl = `${S3_BASE}/${S3_PREFIX}/runs-index.json`;

    (async () => {
      try {
        const res = await fetch(indexUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching runs index`);
        const data: RunsIndex = await res.json();
        setLatestRun(data.runs[0] ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load canvas snapshots');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const viewerUrl = latestRun?.drawioUrl
    ? `https://viewer.diagrams.net/?url=${encodeURIComponent(latestRun.drawioUrl)}&nav=1&title=cvBuilder.drawio.xml`
    : null;

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0 }}>Canvas Snapshots</h3>
          {latestRun && (
            <p
              style={{
                margin: '0.25rem 0 0',
                color: 'var(--color-text-secondary)',
                fontSize: '0.875rem',
              }}
            >
              Run #{latestRun.runNumber} &middot;{' '}
              {new Date(latestRun.timestamp).toLocaleString()}
            </p>
          )}
        </div>
        {viewerUrl && (
          <a
            href={viewerUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-bg)',
              borderRadius: 'var(--border-radius)',
              textDecoration: 'none',
              fontSize: '0.875rem',
              whiteSpace: 'nowrap',
            }}
          >
            Open Interactive Canvas →
          </a>
        )}
      </div>

      {loading && <div className="loading">Loading canvas snapshots…</div>}

      {!loading && error && (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{error}</p>
      )}

      {!loading && !error && !latestRun && (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          No CI runs found yet. Trigger a CI run to populate this view.
        </p>
      )}

      {!loading && !error && latestRun && latestRun.screenshots.length === 0 && (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          No screenshots captured in run #{latestRun.runNumber} yet. Re-run CI with{' '}
          <code>update_baselines: true</code> to capture baselines.
        </p>
      )}

      {!loading && !error && latestRun && latestRun.screenshots.length > 0 && (
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {latestRun.screenshots.map((shot) => (
            <div
              key={shot.name}
              style={{
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--border-radius)',
                overflow: 'hidden',
              }}
            >
              <img
                src={shot.url}
                alt={shot.name}
                loading="lazy"
                style={{
                  width: '100%',
                  height: '140px',
                  objectFit: 'cover',
                  display: 'block',
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <div
                style={{
                  padding: '0.4rem 0.5rem',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={shot.name}
              >
                {shot.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
