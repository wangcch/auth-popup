# AuthPopup Examples

This directory contains demo examples for the `auth-popup` library.

## Quick Start

### 1. Build the library

```bash
npm run build
```

### 2. Start the demo server

```bash
node example/server.js
```

### 3. Open the demo page

Visit [http://localhost:8000/examples/](http://localhost:8000/examples/)

## OAuth Configuration

To enable real OAuth authentication, set the following environment variables:

### GitHub OAuth

```bash
export GITHUB_CLIENT_ID=your_client_id
export GITHUB_CLIENT_SECRET=your_client_secret
```

### Feishu (Lark) OAuth

```bash
export FEISHU_APP_ID=your_app_id
export FEISHU_APP_SECRET=your_app_secret
```

### Google OAuth

```bash
export GOOGLE_CLIENT_ID=your_client_id
export GOOGLE_CLIENT_SECRET=your_client_secret
```

## Files

| File                  | Description                            |
| --------------------- | -------------------------------------- |
| `index.html`          | Main demo page with OAuth buttons      |
| `callback-local.html` | OAuth callback handler page            |
| `server.js`           | Node.js demo server with API endpoints |

## API Endpoints

The demo server provides the following API endpoints:

| Endpoint            | Method | Description                           |
| ------------------- | ------ | ------------------------------------- |
| `/api/config`       | GET    | Get OAuth configuration status        |
| `/api/github/token` | POST   | Exchange GitHub code for access token |
| `/api/github/user`  | GET    | Get GitHub user info                  |
| `/api/feishu/token` | POST   | Exchange Feishu code for access token |
| `/api/feishu/user`  | GET    | Get Feishu user info                  |
| `/api/google/token` | POST   | Exchange Google code for access token |
| `/api/google/user`  | GET    | Get Google user info                  |

## Notes

- The demo server runs on port `8000` by default (configurable via `PORT` env var)
- Without OAuth credentials, the demo will show simulated login results
- Callback URLs must be configured in your OAuth provider settings:
  - GitHub: `http://localhost:8000/examples/callback-local.html`
  - Google: `http://localhost:8000/examples/callback-local.html`
  - Feishu: `http://localhost:8000/examples/callback-local.html`
