import type { BrowserInfo } from '../types';

/**
 * Detect browser capabilities
 */
export function detectBrowser(): BrowserInfo {
  const ua = navigator.userAgent.toLowerCase();

  const isMobile = /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const isTablet = /ipad|tablet|kindle|playbook|silk/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/chrome|chromium|crios/i.test(ua);
  const isChrome = /chrome|chromium|crios/i.test(ua) && !/edge|edg/i.test(ua);
  const isEdge = /edge|edg/i.test(ua);

  const hasPopupAPI = typeof window !== 'undefined' && typeof window.open === 'function';
  const supportsPopup = hasPopupAPI && !isMobile;

  return {
    isMobile,
    isTablet,
    isSafari,
    isChrome,
    isEdge,
    supportsPopup,
  };
}

/**
 * Check if popup was blocked
 */
export function isPopupBlocked(popup: Window | null): boolean {
  if (!popup) {
    return true;
  }

  try {
    if (popup.closed) {
      return true;
    }

    return !popup.window;
  } catch {
    return false;
  }
}

/**
 * Calculate centered popup position
 */
export function calculatePopupPosition(width: number, height: number): { left: number; top: number } {
  if (!Number.isFinite(width) || width <= 0) {
    throw new Error(`Invalid width: must be a positive number, got ${width}`);
  }
  if (!Number.isFinite(height) || height <= 0) {
    throw new Error(`Invalid height: must be a positive number, got ${height}`);
  }

  const screenLeft = window.screenLeft ?? window.screenX ?? 0;
  const screenTop = window.screenTop ?? window.screenY ?? 0;
  const screenWidth = window.screen?.width ?? 1024;
  const screenHeight = window.screen?.height ?? 768;

  const safeWidth = Math.min(width, screenWidth);
  const safeHeight = Math.min(height, screenHeight);

  const left = Math.max(0, screenLeft + (screenWidth - safeWidth) / 2);
  const top = Math.max(0, screenTop + (screenHeight - safeHeight) / 2);

  return { left: Math.round(left), top: Math.round(top) };
}

/**
 * Build window features string for popup
 */
export function buildWindowFeatures(width: number, height: number): string {
  const { left, top } = calculatePopupPosition(width, height);

  return [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'menubar=no',
    'toolbar=no',
    'location=no',
    'status=no',
    'resizable=yes',
    'scrollbars=yes',
  ].join(',');
}
