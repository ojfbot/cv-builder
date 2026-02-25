/**
 * CanvasRunNavigator — visual regression thumbnail navigator for CI snapshots.
 *
 * Architecture: the CI pipeline uploads Playwright screenshots (baseline + actual
 * capture from this run) to S3 alongside a runs-index.json manifest. This component
 * loads that manifest and renders a side-by-side comparison grid:
 *   LEFT  — baseline (last approved state)
 *   RIGHT — actual capture from the latest CI run
 *
 * Each card has a GREEN border when the visual diff passed (≤10% delta) or a RED
 * border when it failed. Cards with no actual capture (baseline-only runs) use a
 * neutral border.
 *
 * Interactive canvas viewing (zoom/pan, full diagram) is delegated to
 * viewer.diagrams.net via the "Open Interactive Canvas" link.
 *
 * Future roadmap (tracked in GitHub issue #canvas-roadmap):
 *   - Run selector UI to compare snapshots across CI runs
 *   - Historical trend chart
 */

import { useState, useEffect } from 'react';

const S3_BASE = import.meta.env.VITE_S3_BASE_URL;
const S3_PREFIX = import.meta.env.VITE_S3_PREFIX ?? 'ojfbot-cv-builder';

interface RunScreenshot {
  name: string;
  /** Baseline URL — backward-compatible primary URL */
  url: string;
  baselineUrl?: string;
  actualUrl?: string;
  diffUrl?: string;
  passed?: boolean;
  diffPercent?: number;
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

    const controller = new AbortController();
    const indexUrl = `${S3_BASE}/${S3_PREFIX}/runs-index.json`;

    (async () => {
      try {
        const res = await fetch(indexUrl, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching runs index`);
        const data: RunsIndex = await res.json();
        // Sort descending so index [0] is always the highest run number
        const sorted = [...data.runs].sort((a, b) => b.runNumber - a.runNumber);
        setLatestRun(sorted[0] ?? null);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load canvas snapshots');
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  // Only pass a drawioUrl to the external viewer when it is from our own S3 origin.
  const safeDrawioUrl =
    latestRun?.drawioUrl && S3_BASE && latestRun.drawioUrl.startsWith(S3_BASE)
      ? latestRun.drawioUrl
      : null;
  const viewerUrl = safeDrawioUrl
    ? `https://viewer.diagrams.net/?url=${encodeURIComponent(safeDrawioUrl)}&nav=1&title=cvBuilder.drawio.xml`
    : null;

  // Screenshots filtered to our S3 origin for security
  const safeScreenshots =
    latestRun?.screenshots.filter((shot) => S3_BASE && shot.url.startsWith(S3_BASE)) ?? [];

  // Pass/fail summary
  const passCount = safeScreenshots.filter((s) => s.passed === true).length;
  const failCount = safeScreenshots.filter((s) => s.passed === false).length;
  const hasResults = passCount + failCount > 0;

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
              {hasResults && (
                <span style={{ marginLeft: '0.75rem' }}>
                  <span style={{ color: '#00A550' }}>✅ {passCount}</span>
                  {failCount > 0 && (
                    <span style={{ color: '#FF3B30', marginLeft: '0.4rem' }}>❌ {failCount}</span>
                  )}
                </span>
              )}
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

      {!loading && !error && latestRun && safeScreenshots.length === 0 && (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          No screenshots captured in run #{latestRun.runNumber} yet. Re-run CI with{' '}
          <code>update_baselines: true</code> to capture baselines.
        </p>
      )}

      {!loading && !error && safeScreenshots.length > 0 && (
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {safeScreenshots.map((shot) => {
            const borderColor =
              shot.passed === true
                ? '#00A550'
                : shot.passed === false
                  ? '#FF3B30'
                  : 'var(--color-border)';

            const imgStyle: React.CSSProperties = {
              width: '100%',
              height: '120px',
              objectFit: 'cover',
              display: 'block',
            };

            const hideOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            };

            const safeActualUrl =
              shot.actualUrl && S3_BASE && shot.actualUrl.startsWith(S3_BASE)
                ? shot.actualUrl
                : undefined;

            return (
              <div
                key={shot.name}
                style={{
                  border: `3px solid ${borderColor}`,
                  borderRadius: 'var(--border-radius)',
                  overflow: 'hidden',
                  backgroundColor: 'var(--color-bg)',
                }}
              >
                {/* Side-by-side image panels */}
                <div style={{ display: 'flex' }}>
                  {/* LEFT: baseline */}
                  <div
                    style={{
                      flex: 1,
                      borderRight: safeActualUrl ? '1px solid var(--color-border)' : undefined,
                    }}
                  >
                    <img
                      src={shot.baselineUrl ?? shot.url}
                      alt={`${shot.name} baseline`}
                      loading="lazy"
                      style={imgStyle}
                      onError={hideOnError}
                    />
                    <div
                      style={{
                        fontSize: '0.65rem',
                        color: 'var(--color-text-secondary)',
                        textAlign: 'center',
                        padding: '2px 0',
                      }}
                    >
                      baseline
                    </div>
                  </div>

                  {/* RIGHT: actual capture from this run */}
                  {safeActualUrl && (
                    <div style={{ flex: 1 }}>
                      <img
                        src={safeActualUrl}
                        alt={`${shot.name} actual`}
                        loading="lazy"
                        style={imgStyle}
                        onError={hideOnError}
                      />
                      <div
                        style={{
                          fontSize: '0.65rem',
                          color: 'var(--color-text-secondary)',
                          textAlign: 'center',
                          padding: '2px 0',
                        }}
                      >
                        actual
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer: name + pass/fail badge */}
                <div
                  style={{
                    padding: '0.4rem 0.5rem',
                    fontSize: '0.75rem',
                    color: 'var(--color-text-secondary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <span
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={shot.name}
                  >
                    {shot.name}
                  </span>
                  {shot.passed !== undefined && (
                    <span
                      style={{
                        color: shot.passed ? '#00A550' : '#FF3B30',
                        whiteSpace: 'nowrap',
                        fontWeight: 500,
                      }}
                    >
                      {shot.passed
                        ? '✅'
                        : `❌ ${shot.diffPercent !== undefined ? shot.diffPercent.toFixed(1) + '%' : '?'}`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
