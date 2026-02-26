/**
 * CanvasRunNavigator — visual regression thumbnail navigator for CI snapshots.
 *
 * Architecture: the CI pipeline uploads Playwright screenshots (baseline + actual
 * capture from this run) to S3 alongside a runs-index.json manifest. This component
 * loads that manifest and renders a side-by-side comparison grid:
 *   LEFT   — baseline (last approved state)
 *   MIDDLE — actual capture from the latest CI run
 *   RIGHT  — pixel diff (shown on failure only, toggleable)
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

import { useState, useEffect, memo } from 'react';
import { z } from 'zod';

const S3_BASE = import.meta.env.VITE_S3_BASE_URL;
const S3_PREFIX = import.meta.env.VITE_S3_PREFIX ?? 'ojfbot-cv-builder';

// ---------------------------------------------------------------------------
// Runtime schema — Zod validates the untrusted S3 JSON so TypeScript type
// errors surface as caught ZodErrors rather than cryptic runtime crashes.
// ---------------------------------------------------------------------------

const RunScreenshotSchema = z.object({
  name: z.string(),
  url: z.string(),
  baselineUrl: z.string().optional(),
  actualUrl: z.string().optional(),
  diffUrl: z.string().optional(),
  passed: z.boolean().optional(),
  diffPercent: z.number().optional(),
});

const RunEntrySchema = z.object({
  runNumber: z.number(),
  timestamp: z.string(),
  drawioUrl: z.string().nullable(),
  screenshots: z.array(RunScreenshotSchema),
});

const RunsIndexSchema = z.object({
  runs: z.array(RunEntrySchema),
  lastUpdated: z.string(),
});

type RunEntry = z.infer<typeof RunEntrySchema>;
type RunScreenshot = z.infer<typeof RunScreenshotSchema>;

/**
 * Parse the origin of a URL string, returning null on invalid input.
 * Used instead of startsWith to prevent subdomain-prefix bypass
 * (e.g. 'https://s3.amazonaws.com.attacker.com' starts with 'https://s3.amazonaws.com').
 */
function urlOrigin(href: string): string | null {
  try { return new URL(href).origin; } catch { return null; }
}

const S3_ORIGIN = S3_BASE ? urlOrigin(S3_BASE) : null;

/** Returns url if its origin matches S3_BASE's origin, otherwise fallback. */
function safeS3Url(url: string | undefined, fallback: string): string;
function safeS3Url(url: string | undefined, fallback?: undefined): string | undefined;
function safeS3Url(url: string | undefined, fallback?: string): string | undefined {
  if (url && S3_ORIGIN && urlOrigin(url) === S3_ORIGIN) return url;
  return fallback;
}

export function CanvasRunNavigator() {
  const [runs, setRuns] = useState<RunEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    // Primary: same-origin Pages URL (no S3 CORS required).
    // Baked in by the deploy job from the runs-index artifact.
    // Fallback: direct S3 fetch (works locally when VITE_S3_BASE_URL is set).
    const pagesUrl = `${import.meta.env.BASE_URL}data/runs-index.json`;
    const s3Url = S3_BASE ? `${S3_BASE}/${S3_PREFIX}/runs-index.json` : null;

    const tryFetch = async (url: string) => {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return RunsIndexSchema.parse(await res.json());
    };

    (async () => {
      try {
        let data: ReturnType<typeof RunsIndexSchema.parse>;
        try {
          data = await tryFetch(pagesUrl);
        } catch (pagesErr) {
          if (pagesErr instanceof Error && pagesErr.name === 'AbortError') return;
          if (!s3Url) throw pagesErr;
          // Pages URL failed (e.g. local dev, 404) — try S3 directly
          data = await tryFetch(s3Url);
        }
        const sorted = [...data.runs].sort((a, b) => b.runNumber - a.runNumber);
        setRuns(sorted);
        setSelectedIndex(0);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load canvas snapshots');
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  const selectedRun = runs[selectedIndex] ?? null;

  // Only pass a drawioUrl to the external viewer when it is from our own S3 origin.
  const safeDrawioUrl =
    selectedRun?.drawioUrl && S3_ORIGIN && urlOrigin(selectedRun.drawioUrl) === S3_ORIGIN
      ? selectedRun.drawioUrl
      : null;
  const viewerUrl = safeDrawioUrl
    ? `https://viewer.diagrams.net/?url=${encodeURIComponent(safeDrawioUrl)}&nav=1&title=cvBuilder.drawio.xml`
    : null;

  // Screenshots filtered to our S3 origin for security.
  // Deduped by name — duplicate names would cause React key warnings and missed re-renders.
  const safeScreenshots = (() => {
    const seen = new Set<string>();
    return (
      selectedRun?.screenshots.filter((shot) => {
        if (!S3_ORIGIN || urlOrigin(shot.url) !== S3_ORIGIN) return false;
        if (seen.has(shot.name)) return false;
        seen.add(shot.name);
        return true;
      }) ?? []
    );
  })();

  // Pass/fail summary
  const passCount = safeScreenshots.filter((s) => s.passed === true).length;
  const failCount = safeScreenshots.filter((s) => s.passed === false).length;
  const hasResults = passCount + failCount > 0;

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0 }}>Canvas Snapshots</h3>
          {selectedRun && (
            <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* Run selector — Phase 1 of issue #94 */}
              {runs.length > 1 ? (
                <select
                  value={selectedIndex}
                  onChange={(e) => setSelectedIndex(Number(e.target.value))}
                  style={{
                    fontSize: '0.875rem',
                    padding: '2px 6px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--border-radius)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                  }}
                >
                  {runs.map((r, i) => (
                    <option key={r.runNumber} value={i}>
                      Run #{r.runNumber} &middot; {new Date(r.timestamp).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              ) : (
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                  Run #{selectedRun.runNumber} &middot; {new Date(selectedRun.timestamp).toLocaleString()}
                </span>
              )}
              {hasResults && (
                <span style={{ fontSize: '0.875rem' }}>
                  <span style={{ color: '#00A550' }}>✅ {passCount}</span>
                  {failCount > 0 && (
                    <span style={{ color: '#FF3B30', marginLeft: '0.4rem' }}>❌ {failCount}</span>
                  )}
                </span>
              )}
            </div>
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

      {!loading && !error && runs.length === 0 && (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          No CI runs found yet. Trigger a CI run to populate this view.
        </p>
      )}

      {!loading && !error && selectedRun && safeScreenshots.length === 0 && (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          No screenshots captured in run #{selectedRun.runNumber} yet. Re-run CI with{' '}
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
          {safeScreenshots.map((shot) => (
            <ScreenshotCard key={shot.name} shot={shot} />
          ))}
        </div>
      )}
    </div>
  );
}

/** One image panel within a ScreenshotCard — tracks its own broken-URL state. */
function Img({ src, alt }: { src: string; alt: string }) {
  const [broken, setBroken] = useState(false);
  const imgStyle: React.CSSProperties = { width: '100%', height: '120px', objectFit: 'cover', display: 'block' };
  const placeholderStyle: React.CSSProperties = {
    width: '100%', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.7rem', color: 'var(--color-text-secondary)', background: 'var(--color-bg-secondary, #f4f4f4)',
  };
  if (broken) return <div style={placeholderStyle}>Image unavailable</div>;
  return <img src={src} alt={alt} loading="lazy" style={imgStyle} onError={() => setBroken(true)} />;
}

const ScreenshotCard = memo(function ScreenshotCard({ shot }: { shot: RunScreenshot }) {
  const [showDiff, setShowDiff] = useState(false);

  const borderColor =
    shot.passed === true
      ? '#00A550'
      : shot.passed === false
        ? '#FF3B30'
        : 'var(--color-border)';

  // All URLs validated against S3 origin before use.
  // safeBaselineUrl falls back to shot.url (which is already origin-checked by
  // the parent's safeScreenshots filter) when baselineUrl fails the check.
  const safeBaselineUrl = safeS3Url(shot.baselineUrl, shot.url);
  const safeActualUrl = safeS3Url(shot.actualUrl);
  const safeDiffUrl = safeS3Url(shot.diffUrl);

  const hasDiff = shot.passed === false && safeDiffUrl;

  return (
    <div
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
          <Img src={safeBaselineUrl} alt={`${shot.name} baseline`} />
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

        {/* MIDDLE: actual capture from this run */}
        {safeActualUrl && (
          <div
            style={{
              flex: 1,
              borderRight: hasDiff ? '1px solid var(--color-border)' : undefined,
            }}
          >
            <Img src={safeActualUrl} alt={`${shot.name} actual`} />
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

        {/* RIGHT: pixel diff — shown on failure when toggled on */}
        {hasDiff && showDiff && (
          <div style={{ flex: 1 }}>
            <Img src={safeDiffUrl} alt={`${shot.name} diff`} />
            <div
              style={{
                fontSize: '0.65rem',
                color: 'var(--color-text-secondary)',
                textAlign: 'center',
                padding: '2px 0',
              }}
            >
              diff
            </div>
          </div>
        )}
      </div>

      {/* Footer: name + pass/fail badge + diff toggle */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
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
          {hasDiff && (
            <button
              onClick={() => setShowDiff((v) => !v)}
              style={{
                fontSize: '0.65rem',
                padding: '1px 5px',
                border: '1px solid var(--color-border)',
                borderRadius: '3px',
                background: showDiff ? 'var(--color-primary)' : 'transparent',
                color: showDiff ? 'var(--color-bg)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              diff
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
