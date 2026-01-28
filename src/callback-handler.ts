import type { CallbackOptions, CallbackMessage, AuthResult, AuthError } from './types';

/**
 * Callback Handler for authorization callback page
 */
export class CallbackHandler {
  private static readonly CHANNEL_NAME = 'auth-popup-channel';

  static init(options: CallbackOptions): { success: boolean; data: AuthResult | AuthError } {
    const handler = new CallbackHandler(options);
    return handler.process();
  }

  constructor(private options: CallbackOptions) {
    if (!options.allowedOrigins || !Array.isArray(options.allowedOrigins) || options.allowedOrigins.length === 0) {
      throw new Error('allowedOrigins is required and must be a non-empty array');
    }
  }

  private sanitizeParam(value: string | null): string | null {
    if (value === null || value === '') {
      return null;
    }
    const sanitized = value.replace(/[<>"'`\x00-\x1f\x7f]/g, '');
    return sanitized.substring(0, 2048);
  }

  /**
   * Process callback and send result to opener
   */
  private process(): { success: boolean; data: AuthResult | AuthError } {
    try {
      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.substring(1));

      const code = this.sanitizeParam(params.get('code') || hash.get('code'));
      const state = this.sanitizeParam(params.get('state') || hash.get('state'));

      const error = this.sanitizeParam(params.get('error') || hash.get('error'));
      const errorDescription = this.sanitizeParam(params.get('error_description') || hash.get('error_description'));

      if (error) {
        const errorData: AuthError = {
          error,
          error_description: errorDescription || undefined,
        };
        this.sendError(errorData);
        return { success: false, data: errorData };
      } else if (code) {
        const resultData: AuthResult = {
          code,
          state: state || undefined,
        };
        this.sendSuccess(resultData);
        return { success: true, data: resultData };
      } else {
        const errorData: AuthError = {
          error: 'invalid_callback',
          error_description: 'No authorization code or error found in callback URL',
        };
        this.sendError(errorData);
        return { success: false, data: errorData };
      }
    } catch (err) {
      const errorData: AuthError = {
        error: 'callback_error',
        error_description: err instanceof Error ? err.message : 'Unknown error',
      };
      this.sendError(errorData);
      return { success: false, data: errorData };
    }
  }

  private sendSuccess(result: AuthResult): void {
    const message: CallbackMessage = {
      type: 'auth-success',
      data: result,
    };

    this.sendMessage(message);
    this.autoClose();
  }

  private sendError(error: AuthError): void {
    const message: CallbackMessage = {
      type: 'auth-error',
      data: error,
    };

    this.sendMessage(message);
    this.autoClose();
  }

  /**
   * Send message to opener via multiple channels
   */
  private sendMessage(message: CallbackMessage): void {
    this.sendViaBroadcastChannel(message);
    this.sendViaPostMessage(message);
  }

  /**
   * Send via BroadcastChannel
   */
  private sendViaBroadcastChannel(message: CallbackMessage): void {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel(CallbackHandler.CHANNEL_NAME);
        channel.postMessage(message);
        channel.close();
      } catch (error) {
        console.warn('Failed to send via BroadcastChannel:', error);
      }
    }
  }

  /**
   * Send via postMessage to opener
   */
  private sendViaPostMessage(message: CallbackMessage): void {
    if (!window.opener || window.opener.closed) {
      console.warn('No window.opener available or opener is closed');
      return;
    }

    try {
      const targetOrigin = this.options.allowedOrigins.includes('*') ? '*' : this.options.allowedOrigins[0];

      if (targetOrigin === '*') {
        console.warn('Security Warning: Sending message with wildcard origin "*"');
      }

      window.opener.postMessage(message, targetOrigin);
    } catch (error) {
      console.warn('Failed to send via postMessage:', error);
    }
  }

  /**
   * Auto close popup if enabled, or redirect in redirect mode
   */
  private autoClose(): void {
    if (this.options.autoClose === false) {
      return;
    }

    const delay = this.options.autoCloseDelay ?? 100;
    const safeDelay = Number.isFinite(delay) && delay >= 0 ? delay : 100;

    const isRedirectMode = !window.opener || window.opener.closed;

    setTimeout(() => {
      if (isRedirectMode && this.options.redirectUrl) {
        window.location.href = this.options.redirectUrl;
      } else {
        try {
          window.close();
        } catch {
          // ignore
        }
      }
    }, safeDelay);
  }
}

/**
 * Convenience function to initialize callback handler
 * @returns Object with success flag and data (AuthResult or AuthError)
 */
export function handleCallback(options: CallbackOptions): { success: boolean; data: AuthResult | AuthError } {
  return CallbackHandler.init(options);
}
