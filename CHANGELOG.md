# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-02-09

### Added

- **`AuthPopup.listen()` static method** — Listen for authorization callback results after catching `PopupBlockedError`. Enables custom popup/iframe/modal recovery flows.
  - Supports `timeout`, `allowedOrigins`, and `AbortSignal` options
  - Concurrent call protection: new `listen()` automatically cancels previous listener
- **`ListenOptions` type** — Configuration interface for `AuthPopup.listen()`
- **`AUTH_POPUP_CHANNEL_NAME` constant** — Exported shared BroadcastChannel name for advanced use cases
- **`PopupBlockedError.authUrl` property** — Access the original authorization URL from caught errors for easy recovery

### Changed

- Extract `CHANNEL_NAME` to shared constant `AUTH_POPUP_CHANNEL_NAME` in `types.ts`, used by both `AuthPopup` and `CallbackHandler` (prevents drift from duplicate definitions)

### Docs

- Added `AuthPopup.listen()` API reference and usage examples to README, README.zh-CN, and llms.txt
- Added `PopupBlockedError` property table to API reference
- Updated "Popup Blocked Handling" section with `listen()` recovery patterns
- Added custom popup + iframe demo (`example/custom-popup-demo.html`)
- Added fake OAuth provider page (`example/fake-auth.html`) for local testing

## [1.1.0] - 2026-02-07

### Added

- **`PopupBlockedError` class** — Custom error thrown when popup is blocked, with `isBlocked`, `redirecting` properties
- Firefox detection in `detectBrowser()` (`isFirefox` field in `BrowserInfo`)

### Fixed

- Improve popup blocking detection reliability

### Docs

- Demo video
- CDN and UMD usage examples
- LLM/Agent reference (`llms.txt`)
- Feishu OAuth PKCE example

## [1.0.0] - 2026-01-29

### Added

- **`AuthPopup.open()`** — Open authorization popup and return Promise with result
  - Configurable width, height, timeout
  - `redirectFallback` option for automatic redirect when popup is blocked
  - `allowedOrigins` for postMessage security
  - `forceClosePopup` option
- **`handleCallback()` / `CallbackHandler`** — Process OAuth callback in popup/redirect page
  - Dual communication: BroadcastChannel + postMessage
  - `autoClose` and `autoCloseDelay` options
  - `redirectUrl` option for redirect mode
  - XSS protection with input sanitization
- **Security utilities**
  - `generatePKCE()` — PKCE challenge pair generation (S256)
  - `generateState()` — Random state parameter for CSRF protection
  - `validateOrigin()` — Origin validation against allowlist
- **Browser utilities**
  - `detectBrowser()` — Browser capability detection (mobile, tablet, Safari, Chrome, Edge)
  - `isPopupBlocked()` — Popup blocking detection
  - `buildWindowFeatures()` — Centered popup window features
- Cross-platform support with automatic mobile fallback (new tab)
- TypeScript-first with full type definitions
- ES modules + UMD bundle
- Zero dependencies
