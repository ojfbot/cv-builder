/**
 * ScreenshotGallery component for displaying screenshots with lightbox
 */

import { useState } from 'react';
import type { ScreenshotMetadata } from '../types';
import { getScreenshotUrl } from '../utils/dataLoader';

interface ScreenshotGalleryProps {
  screenshots: ScreenshotMetadata[];
  manifestPath: string;
  onClose: () => void;
}

export function ScreenshotGallery({ screenshots, manifestPath, onClose }: ScreenshotGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showMode, setShowMode] = useState<'before' | 'after' | 'diff'>('after');

  const currentScreenshot = screenshots[selectedIndex];

  const getImageUrl = (screenshot: ScreenshotMetadata, mode: 'before' | 'after' | 'diff'): string | null => {
    if (mode === 'before' && screenshot.baselinePath) {
      return getScreenshotUrl(screenshot.baselinePath, manifestPath);
    }
    if (mode === 'after') {
      return getScreenshotUrl(screenshot.screenshotPath, manifestPath);
    }
    if (mode === 'diff' && screenshot.diffPath) {
      return getScreenshotUrl(screenshot.diffPath, manifestPath);
    }
    return null;
  };

  const currentUrl = getImageUrl(currentScreenshot, showMode);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={onClose}
    >
      {/* Header */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 style={{ margin: 0, marginBottom: '0.25rem' }}>
            Step {currentScreenshot.stepNumber} - {currentScreenshot.interactionType}
          </h3>
          <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
            {currentScreenshot.passed ? (
              <span style={{ color: 'var(--color-success)' }}>✓ Passed</span>
            ) : (
              <span style={{ color: 'var(--color-error)' }}>
                ✗ Failed ({currentScreenshot.diffPercentage?.toFixed(2)}% difference)
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            color: '#fff',
            fontSize: '2rem',
            padding: '0 1rem',
          }}
        >
          ×
        </button>
      </div>

      {/* Image Modes */}
      <div
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {currentScreenshot.baselinePath && (
          <button
            onClick={() => setShowMode('before')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: showMode === 'before' ? '#fff' : 'transparent',
              color: showMode === 'before' ? '#000' : '#fff',
              border: '1px solid #fff',
              borderRadius: '4px',
            }}
          >
            Before
          </button>
        )}
        <button
          onClick={() => setShowMode('after')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: showMode === 'after' ? '#fff' : 'transparent',
            color: showMode === 'after' ? '#000' : '#fff',
            border: '1px solid #fff',
            borderRadius: '4px',
          }}
        >
          After
        </button>
        {currentScreenshot.diffPath && (
          <button
            onClick={() => setShowMode('diff')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: showMode === 'diff' ? '#fff' : 'transparent',
              color: showMode === 'diff' ? '#000' : '#fff',
              border: '1px solid #fff',
              borderRadius: '4px',
            }}
          >
            Diff
          </button>
        )}
      </div>

      {/* Main Image */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={`${showMode} screenshot`}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: '4px',
            }}
          />
        ) : (
          <div style={{ color: '#fff', opacity: 0.6 }}>No {showMode} image available</div>
        )}
      </div>

      {/* Navigation */}
      {screenshots.length > 1 && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            gap: '0.5rem',
            alignItems: 'center',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))}
            disabled={selectedIndex === 0}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            ← Previous
          </button>
          <span style={{ color: '#fff' }}>
            {selectedIndex + 1} / {screenshots.length}
          </span>
          <button
            onClick={() => setSelectedIndex((i) => Math.min(screenshots.length - 1, i + 1))}
            disabled={selectedIndex === screenshots.length - 1}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
