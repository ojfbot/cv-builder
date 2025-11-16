/**
 * Viewport Management for Browser Automation
 *
 * Provides viewport presets and management for multi-device screenshot capture
 */

export interface ViewportSize {
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
}

export type ViewportPreset = 'desktop' | 'tablet' | 'mobile' | 'mobile-landscape';

export const VIEWPORT_PRESETS: Record<ViewportPreset, ViewportSize> = {
  desktop: {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  tablet: {
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  mobile: {
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  'mobile-landscape': {
    width: 667,
    height: 375,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
};

/**
 * Get viewport configuration by preset name or custom size
 */
export function getViewport(
  preset?: ViewportPreset | ViewportSize
): ViewportSize {
  if (!preset) {
    return VIEWPORT_PRESETS.desktop;
  }

  if (typeof preset === 'string') {
    return VIEWPORT_PRESETS[preset] || VIEWPORT_PRESETS.desktop;
  }

  return preset;
}

/**
 * Generate filename suffix for viewport
 */
export function getViewportSuffix(preset?: ViewportPreset | ViewportSize): string {
  if (!preset) {
    return '';
  }

  if (typeof preset === 'string') {
    return `-${preset}`;
  }

  // Custom viewport - use dimensions
  return `-${preset.width}x${preset.height}`;
}

/**
 * Get all available viewport presets
 */
export function getAvailableViewports(): Array<{ name: ViewportPreset; config: ViewportSize }> {
  return Object.entries(VIEWPORT_PRESETS).map(([name, config]) => ({
    name: name as ViewportPreset,
    config,
  }));
}

/**
 * Validate viewport configuration
 */
export function validateViewport(viewport: ViewportSize): boolean {
  if (!viewport.width || !viewport.height) {
    return false;
  }

  if (viewport.width < 320 || viewport.width > 3840) {
    return false;
  }

  if (viewport.height < 240 || viewport.height > 2160) {
    return false;
  }

  return true;
}
