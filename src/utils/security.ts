import type { PKCEChallenge } from '../types';

/**
 * Generate random string for code verifier
 */
function generateRandomString(length: number): string {
  if (!Number.isInteger(length) || length <= 0 || length > 1024) {
    throw new Error(`Invalid length: must be a positive integer <= 1024, got ${length}`);
  }

  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
    throw new Error('crypto.getRandomValues is not available in this environment');
  }

  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  return Array.from(randomValues)
    .map((x) => charset[x % charset.length])
    .join('');
}

/**
 * Base64 URL encode
 */
function base64URLEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * SHA-256 hash
 */
async function sha256(plain: string): Promise<ArrayBuffer> {
  if (typeof plain !== 'string') {
    throw new Error('Input must be a string');
  }

  if (typeof crypto === 'undefined' || typeof crypto.subtle === 'undefined') {
    throw new Error('crypto.subtle is not available in this environment');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest('SHA-256', data);
}

/**
 * Generate PKCE challenge pair
 */
export async function generatePKCE(): Promise<PKCEChallenge> {
  const codeVerifier = generateRandomString(128);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64URLEncode(hashed);

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256',
  };
}

/**
 * Generate random state parameter
 */
export function generateState(): string {
  return generateRandomString(32);
}

/**
 * Validate origin against allowed list
 */
export function validateOrigin(origin: string, allowedOrigins: string[]): boolean {
  if (typeof origin !== 'string' || !origin) {
    return false;
  }

  if (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0) {
    return false;
  }

  if (allowedOrigins.includes('*')) {
    console.warn('Security Warning: Using wildcard "*" for origin validation is not recommended in production');
    return true;
  }

  try {
    new URL(origin);
  } catch {
    return false;
  }

  return allowedOrigins.includes(origin);
}
