export { AuthPopup } from './auth-popup';
export { CallbackHandler, handleCallback } from './callback-handler';

export { generatePKCE, generateState, validateOrigin } from './utils/security';
export { detectBrowser, isPopupBlocked } from './utils/browser';

export type {
  AuthPopupOptions,
  AuthResult,
  AuthError,
  CallbackOptions,
  CallbackMessage,
  BrowserInfo,
  PKCEChallenge,
} from './types';
