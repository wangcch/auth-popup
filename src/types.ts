/**
 * AuthPopup Configuration Options
 */
export interface AuthPopupOptions {
  /** The authorization URL to open in the popup */
  authUrl: string;
  /** Popup window width in pixels (default: 500) */
  width?: number;
  /** Popup window height in pixels (default: 600) */
  height?: number;
  /** Timeout in milliseconds (default: 120000 - 2 minutes) */
  timeout?: number;
  /** Whether to fallback to redirect if popup is blocked (default: true) */
  redirectFallback?: boolean;
  /** Allowed origins for postMessage communication */
  allowedOrigins?: string[];
  /** Whether parent page should force close popup immediately (default: false, let callback page handle via autoCloseDelay) */
  forceClosePopup?: boolean;
}

/**
 * Authorization Result
 */
export interface AuthResult {
  /** Authorization code received from OAuth provider */
  code: string;
  /** State parameter for CSRF protection */
  state?: string;
}

/**
 * Authorization Error
 */
export interface AuthError {
  error: string;
  error_description?: string;
}

/**
 * Callback Message Structure
 */
export interface CallbackMessage {
  type: 'auth-success' | 'auth-error';
  data: AuthResult | AuthError;
}

/**
 * Callback Options
 */
export interface CallbackOptions {
  /** Allowed parent origins for security */
  allowedOrigins: string[];
  /** Whether to automatically close the popup after callback */
  autoClose?: boolean;
  /** Delay in milliseconds before auto-closing (default: 100) */
  autoCloseDelay?: number;
  /**
   * URL to redirect to after successful callback in redirect mode (when popup is blocked).
   * If not provided and no window.opener exists, the page will stay open showing a success message.
   */
  redirectUrl?: string;
}

/**
 * Browser Detection Result
 */
export interface BrowserInfo {
  isMobile: boolean;
  isTablet: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isEdge: boolean;
  supportsPopup: boolean;
}

/**
 * PKCE Challenge
 */
export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}
