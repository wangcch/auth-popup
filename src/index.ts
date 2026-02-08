export { AuthPopup } from './auth-popup';
export { CallbackHandler, handleCallback } from './callback-handler';
export { PopupBlockedError, AUTH_POPUP_CHANNEL_NAME } from './types';

export { generatePKCE, generateState, validateOrigin } from './utils/security';
export { detectBrowser, isPopupBlocked } from './utils/browser';

export type {
  AuthPopupOptions,
  AuthResult,
  AuthError,
  CallbackOptions,
  CallbackMessage,
  ListenOptions,
  BrowserInfo,
  PKCEChallenge,
} from './types';
