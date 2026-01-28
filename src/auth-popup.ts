import type { AuthPopupOptions, AuthResult, AuthError, CallbackMessage } from './types';
import { detectBrowser, isPopupBlocked, buildWindowFeatures } from './utils/browser';
import { validateOrigin } from './utils/security';

/**
 * AuthPopup - Main class for handling OAuth popup authorization
 */
export class AuthPopup {
  private static readonly DEFAULT_WIDTH = 500;
  private static readonly DEFAULT_HEIGHT = 600;
  private static readonly DEFAULT_TIMEOUT = 120000;
  private static readonly CHANNEL_NAME = 'auth-popup-channel';

  private popup: Window | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private checkInterval: number | null = null;
  private successHandler?: (result: AuthResult) => void;
  private errorHandler?: (error: AuthError | Error) => void;
  private options: AuthPopupOptions | null = null;

  /**
   * Open authorization popup and wait for result
   */
  static async open(options: AuthPopupOptions): Promise<AuthResult> {
    const instance = new AuthPopup();
    return instance.authorize(options);
  }

  /**
   * Perform authorization flow
   */
  private async authorize(options: AuthPopupOptions): Promise<AuthResult> {
    if (!options || typeof options !== 'object') {
      throw new Error('options is required');
    }
    if (!options.authUrl || typeof options.authUrl !== 'string') {
      throw new Error('authUrl is required and must be a string');
    }

    try {
      new URL(options.authUrl);
    } catch {
      throw new Error(`Invalid authUrl format: ${options.authUrl}`);
    }

    this.options = options;

    const {
      authUrl,
      width = AuthPopup.DEFAULT_WIDTH,
      height = AuthPopup.DEFAULT_HEIGHT,
      timeout = AuthPopup.DEFAULT_TIMEOUT,
      redirectFallback = true,
      allowedOrigins = [window.location.origin],
    } = options;

    if (!Number.isFinite(width) || width <= 0) {
      throw new Error(`Invalid width: ${width}`);
    }
    if (!Number.isFinite(height) || height <= 0) {
      throw new Error(`Invalid height: ${height}`);
    }
    if (!Number.isFinite(timeout) || timeout <= 0) {
      throw new Error(`Invalid timeout: ${timeout}`);
    }
    if (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0) {
      throw new Error('allowedOrigins must be a non-empty array');
    }

    const browserInfo = detectBrowser();

    let features: string;
    let target: string;

    if (!browserInfo.supportsPopup) {
      // Mobile: open in new tab instead of popup
      features = '';
      target = '_blank';
    } else {
      // Desktop: use centered popup
      features = buildWindowFeatures(width, height);
      target = 'auth-popup';
    }

    this.popup = window.open(authUrl, target, features);

    if (isPopupBlocked(this.popup)) {
      if (redirectFallback) {
        this.redirectToAuth(authUrl);
        throw new Error('Popup blocked, redirecting to authorization page');
      } else {
        throw new Error('Popup was blocked by browser');
      }
    }

    this.setupCommunication(allowedOrigins);

    return this.waitForResult(timeout);
  }

  /**
   * Setup communication channels (BroadcastChannel and postMessage)
   */
  private setupCommunication(allowedOrigins: string[]): void {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel(AuthPopup.CHANNEL_NAME);
      } catch (error) {
        console.warn('BroadcastChannel not available:', error);
      }
    }

    this.messageHandler = (event: MessageEvent) => {
      if (!validateOrigin(event.origin, allowedOrigins)) {
        console.warn('Message from unauthorized origin:', event.origin);
        return;
      }

      this.handleMessage(event.data);
    };

    window.addEventListener('message', this.messageHandler);
  }

  /**
   * Wait for authorization result with timeout
   */
  private waitForResult(timeout: number): Promise<AuthResult> {
    return new Promise((resolve, reject) => {
      let timeoutId: number | null = null;
      let isSettled = false;

      const cleanup = (forceClose = false) => {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (this.checkInterval) {
          window.clearInterval(this.checkInterval);
          this.checkInterval = null;
        }
        if (this.messageHandler) {
          window.removeEventListener('message', this.messageHandler);
          this.messageHandler = null;
        }
        if (this.broadcastChannel) {
          try {
            this.broadcastChannel.close();
          } catch (error) {
            console.warn('Failed to close BroadcastChannel:', error);
          }
          this.broadcastChannel = null;
        }
        if ((forceClose || this.options?.forceClosePopup) && this.popup && !this.popup.closed) {
          try {
            this.popup.close();
          } catch (error) {
            console.warn('Failed to close popup:', error);
          }
          this.popup = null;
        }
      };

      const handleSuccess = (result: AuthResult) => {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        resolve(result);
      };

      const handleError = (error: AuthError | Error, forceClose = false) => {
        if (isSettled) return;
        isSettled = true;
        cleanup(forceClose);
        if (error instanceof Error) {
          reject(error);
        } else {
          reject(new Error(error.error_description || error.error));
        }
      };

      if (this.broadcastChannel) {
        this.broadcastChannel.onmessage = (event: MessageEvent) => {
          this.handleMessage(event.data, handleSuccess, handleError);
        };
      }

      this.successHandler = handleSuccess;
      this.errorHandler = handleError;

      this.checkInterval = window.setInterval(() => {
        try {
          if (this.popup && this.popup.closed) {
            handleError(new Error('Authorization popup was closed'));
          }
        } catch (error) {
          console.debug('Cannot access popup.closed (COOP policy):', error);
        }
      }, 500);

      timeoutId = window.setTimeout(() => {
        handleError(new Error('Authorization timeout'), true);
      }, timeout);
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(
    data: unknown,
    onSuccess?: (result: AuthResult) => void,
    onError?: (error: AuthError | Error) => void
  ): void {
    if (!data || typeof data !== 'object') {
      return;
    }

    const message = data as CallbackMessage;

    const successHandler = onSuccess || this.successHandler;
    const errorHandler = onError || this.errorHandler;

    if (message.type === 'auth-success') {
      const result = message.data as AuthResult;
      if (result.code && successHandler) {
        successHandler(result);
      }
    } else if (message.type === 'auth-error') {
      const error = message.data as AuthError;
      if (errorHandler) {
        errorHandler(error);
      }
    }
  }

  /**
   * Redirect to authorization URL (fallback)
   */
  private redirectToAuth(authUrl: string): void {
    window.location.href = authUrl;
  }
}
