import type { BrowserInfo } from '../types';

/**
 * Detect browser capabilities
 */
export function detectBrowser(): BrowserInfo {
  if (typeof navigator === 'undefined' || !navigator.userAgent) {
    return {
      isMobile: false,
      isTablet: false,
      isSafari: false,
      isChrome: false,
      isFirefox: false,
      isEdge: false,
      supportsPopup: false,
    };
  }

  const ua = navigator.userAgent.toLowerCase();

  const isTablet = /ipad|tablet|kindle|playbook|silk/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua));
  const isMobile =
    /mobile|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua) || (/android/i.test(ua) && /mobile/i.test(ua));
  const isSafari = /safari/i.test(ua) && !/chrome|chromium|crios/i.test(ua);
  const isChrome = /chrome|chromium|crios/i.test(ua) && !/edge|edg/i.test(ua);
  const isFirefox = /firefox|fxios/i.test(ua);
  const isEdge = /edge|edg/i.test(ua);

  const hasPopupAPI = typeof window !== 'undefined' && typeof window.open === 'function';
  const supportsPopup = hasPopupAPI && !isMobile;

  return {
    isMobile,
    isTablet,
    isSafari,
    isChrome,
    isFirefox,
    isEdge,
    supportsPopup,
  };
}

/**
 * Check if popup was blocked
 */
export function isPopupBlocked(popup: Window | null): boolean {
  if (!popup || popup.closed) {
    return true;
  }

  try {
    return popup.innerHeight === 0 && popup.innerWidth === 0;
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

  const windowWidth = window.outerWidth ?? window.innerWidth ?? 1024;
  const windowHeight = window.outerHeight ?? window.innerHeight ?? 768;
  const windowLeft = window.screenLeft ?? window.screenX ?? 0;
  const windowTop = window.screenTop ?? window.screenY ?? 0;

  const screenWidth = window.screen?.width ?? 1920;
  const screenHeight = window.screen?.height ?? 1080;
  const safeWidth = Math.min(width, screenWidth, windowWidth);
  const safeHeight = Math.min(height, screenHeight, windowHeight);

  const left = Math.max(0, windowLeft + (windowWidth - safeWidth) / 2);
  const top = Math.max(0, windowTop + (windowHeight - safeHeight) / 2);

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
