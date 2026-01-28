/**
 * AuthPopup Demo Server
 *
 * A simple Node.js server for demonstrating GitHub OAuth flow.
 *
 * Usage:
 *   1. Set environment variables:
 *      export GITHUB_CLIENT_ID=your_client_id
 *      export GITHUB_CLIENT_SECRET=your_client_secret
 *
 *   2. Start the server:
 *      node server.js
 *
 *   3. Open http://localhost:8000/examples/
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8000;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

// MIME types
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.cjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Parse JSON body
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// Send JSON response
function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

// Exchange code for access token
async function exchangeCodeForToken(code) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  return data;
}

// Get GitHub user info
async function getGitHubUser(accessToken) {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'AuthPopup-Demo',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API failed: ${response.status}`);
  }

  return response.json();
}

// Get Feishu app_access_token
async function getFeishuAppToken() {
  const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: FEISHU_APP_ID,
      app_secret: FEISHU_APP_SECRET,
    }),
  });

  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(data.msg || 'Failed to get app_access_token');
  }

  return data.app_access_token;
}

// Exchange Feishu code for user access token
async function exchangeFeishuCodeForToken(code) {
  const appToken = await getFeishuAppToken();

  const response = await fetch('https://open.feishu.cn/open-apis/authen/v1/oidc/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${appToken}`,
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
    }),
  });

  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(data.msg || 'Failed to exchange code');
  }

  return data.data;
}

// Get Feishu user info
async function getFeishuUser(accessToken) {
  const response = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(data.msg || 'Failed to get user info');
  }

  return data.data;
}

// Exchange Google code for access token
async function exchangeGoogleCodeForToken(code, codeVerifier) {
  const params = {
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: `http://localhost:${PORT}/examples/callback-local.html`,
  };

  // Add code_verifier if using PKCE
  if (codeVerifier) {
    params.code_verifier = codeVerifier;
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error_description || errorData.error || 'Token exchange failed');
  }

  return response.json();
}

// Get Google user info
async function getGoogleUser(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error_description || errorData.error || 'Failed to get user info');
  }

  return response.json();
}

// Serve static files
function serveStatic(req, res) {
  // Parse URL to get pathname without query string
  const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = reqUrl.pathname;

  // 项目根目录
  const projectRoot = path.join(__dirname, '..');

  let filePath;
  if (pathname === '/' || pathname === '/examples' || pathname === '/examples/') {
    // 首页重定向到 example/index.html
    filePath = path.join(__dirname, 'index.html');
  } else if (pathname.startsWith('/examples/')) {
    // /examples/* 映射到 example/*
    filePath = path.join(__dirname, pathname.replace('/examples/', ''));
  } else if (pathname.startsWith('/dist/')) {
    // /dist/* 映射到项目根目录的 dist/*
    filePath = path.join(projectRoot, pathname);
  } else {
    // 其他请求从项目根目录提供
    filePath = path.join(projectRoot, pathname);
  }

  // Handle directory requests
  if (filePath.endsWith('/')) {
    filePath += 'index.html';
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        console.error(`404 Not Found: ${filePath}`);
        res.writeHead(404);
        res.end('Not Found');
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

// Create server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  // API routes
  if (url.pathname === '/api/github/token' && req.method === 'POST') {
    // Exchange code for token
    try {
      if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
        sendJson(res, 400, {
          error: 'missing_credentials',
          error_description: 'GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables are required',
        });
        return;
      }

      const body = await parseBody(req);
      const { code, code_verifier } = body;

      if (!code) {
        sendJson(res, 400, { error: 'missing_code', error_description: 'Authorization code is required' });
        return;
      }

      console.log('🔄 Exchanging code for token...');
      const tokenData = await exchangeCodeForToken(code);
      console.log('✅ Token received');

      sendJson(res, 200, {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        scope: tokenData.scope,
      });
    } catch (error) {
      console.error('❌ Token exchange error:', error.message);
      sendJson(res, 400, { error: 'token_exchange_failed', error_description: error.message });
    }
    return;
  }

  if (url.pathname === '/api/github/user' && req.method === 'GET') {
    // Get user info
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        sendJson(res, 401, { error: 'unauthorized', error_description: 'Bearer token required' });
        return;
      }

      const accessToken = authHeader.substring(7);
      console.log('🔄 Fetching GitHub user...');
      const user = await getGitHubUser(accessToken);
      console.log(`✅ User: ${user.login}`);

      sendJson(res, 200, {
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url,
        bio: user.bio,
        html_url: user.html_url,
        public_repos: user.public_repos,
        followers: user.followers,
      });
    } catch (error) {
      console.error('❌ User fetch error:', error.message);
      sendJson(res, 400, { error: 'user_fetch_failed', error_description: error.message });
    }
    return;
  }

  if (url.pathname === '/api/config' && req.method === 'GET') {
    // Return public config (client_id only, never expose secret)
    sendJson(res, 200, {
      github_client_id: GITHUB_CLIENT_ID || null,
      has_github_credentials: !!(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET),
      feishu_app_id: FEISHU_APP_ID || null,
      has_feishu_credentials: !!(FEISHU_APP_ID && FEISHU_APP_SECRET),
    });
    return;
  }

  // Feishu OAuth endpoints
  if (url.pathname === '/api/feishu/token' && req.method === 'POST') {
    try {
      if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) {
        sendJson(res, 400, {
          error: 'missing_credentials',
          error_description: 'FEISHU_APP_ID and FEISHU_APP_SECRET environment variables are required',
        });
        return;
      }

      const body = await parseBody(req);
      const { code, code_verifier } = body;

      if (!code) {
        sendJson(res, 400, { error: 'missing_code', error_description: 'Authorization code is required' });
        return;
      }

      console.log('🔄 Exchanging Feishu code for token...');
      const tokenData = await exchangeFeishuCodeForToken(code);
      console.log('✅ Feishu token received');

      sendJson(res, 200, {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        refresh_token: tokenData.refresh_token,
      });
    } catch (error) {
      console.error('❌ Feishu token exchange error:', error.message);
      sendJson(res, 400, { error: 'token_exchange_failed', error_description: error.message });
    }
    return;
  }

  if (url.pathname === '/api/feishu/user' && req.method === 'GET') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        sendJson(res, 401, { error: 'unauthorized', error_description: 'Bearer token required' });
        return;
      }

      const accessToken = authHeader.substring(7);
      console.log('🔄 Fetching Feishu user...');
      const user = await getFeishuUser(accessToken);
      console.log(`✅ Feishu User: ${user.name}`);

      sendJson(res, 200, {
        name: user.name,
        avatar_url: user.avatar_url || user.avatar_middle,
        open_id: user.open_id,
        union_id: user.union_id,
        email: user.email,
        mobile: user.mobile,
      });
    } catch (error) {
      console.error('❌ Feishu user fetch error:', error.message);
      sendJson(res, 400, { error: 'user_fetch_failed', error_description: error.message });
    }
    return;
  }
  // Google OAuth endpoints
  if (url.pathname === '/api/google/token' && req.method === 'POST') {
    try {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        sendJson(res, 400, {
          error: 'missing_credentials',
          error_description: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required',
        });
        return;
      }

      const body = await parseBody(req);
      const { code, code_verifier } = body;

      if (!code) {
        sendJson(res, 400, { error: 'missing_code', error_description: 'Authorization code is required' });
        return;
      }

      console.log('🔄 Exchanging Google code for token...');
      const tokenData = await exchangeGoogleCodeForToken(code, code_verifier);
      console.log('✅ Google token received');

      sendJson(res, 200, {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        scope: tokenData.scope,
        id_token: tokenData.id_token,
      });
    } catch (error) {
      console.error('❌ Google token exchange error:', error.message);
      sendJson(res, 400, { error: 'token_exchange_failed', error_description: error.message });
    }
    return;
  }

  if (url.pathname === '/api/google/user' && req.method === 'GET') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        sendJson(res, 401, { error: 'unauthorized', error_description: 'Bearer token required' });
        return;
      }

      const accessToken = authHeader.substring(7);
      console.log('🔄 Fetching Google user...');
      const user = await getGoogleUser(accessToken);
      console.log(`✅ Google User: ${user.name}`);

      sendJson(res, 200, {
        login: user.email,
        name: user.name,
        avatar_url: user.picture,
        email: user.email,
        verified_email: user.verified_email,
      });
    } catch (error) {
      console.error('❌ Google user fetch error:', error.message);
      sendJson(res, 400, { error: 'user_fetch_failed', error_description: error.message });
    }
    return;
  }
  // Google OAuth endpoints
  if (url.pathname === '/api/google/token' && req.method === 'POST') {
    try {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        sendJson(res, 400, {
          error: 'missing_credentials',
          error_description: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required',
        });
        return;
      }

      const body = await parseBody(req);
      const { code, code_verifier } = body;

      if (!code) {
        sendJson(res, 400, { error: 'missing_code', error_description: 'Authorization code is required' });
        return;
      }

      console.log('🔄 Exchanging Google code for token...');
      const tokenData = await exchangeGoogleCodeForToken(code, code_verifier);
      console.log('✅ Google token received');

      sendJson(res, 200, {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        scope: tokenData.scope,
        id_token: tokenData.id_token,
      });
    } catch (error) {
      console.error('❌ Google token exchange error:', error.message);
      sendJson(res, 400, { error: 'token_exchange_failed', error_description: error.message });
    }
    return;
  }

  if (url.pathname === '/api/google/user' && req.method === 'GET') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        sendJson(res, 401, { error: 'unauthorized', error_description: 'Bearer token required' });
        return;
      }

      const accessToken = authHeader.substring(7);
      console.log('🔄 Fetching Google user...');
      const user = await getGoogleUser(accessToken);
      console.log(`✅ Google User: ${user.name}`);

      sendJson(res, 200, {
        login: user.email,
        name: user.name,
        avatar_url: user.picture,
        email: user.email,
        verified_email: user.verified_email,
      });
    } catch (error) {
      console.error('❌ Google user fetch error:', error.message);
      sendJson(res, 400, { error: 'user_fetch_failed', error_description: error.message });
    }
    return;
  }

  // Serve static files
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log('');
  console.log('🚀 AuthPopup Demo Server');
  console.log('========================');
  console.log(`📍 Server running at http://localhost:${PORT}`);
  console.log(`📂 Demo page: http://localhost:${PORT}/examples/`);
  console.log('');

  if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET) {
    console.log('✅ GitHub OAuth configured');
    console.log(`   Client ID: ${GITHUB_CLIENT_ID.substring(0, 8)}...`);
  } else {
    console.log('⚠️  GitHub OAuth not configured');
  }

  if (FEISHU_APP_ID && FEISHU_APP_SECRET) {
    console.log('✅ Feishu OAuth configured');
    console.log(`   App ID: ${FEISHU_APP_ID.substring(0, 8)}...`);
  } else {
    console.log('⚠️  Feishu OAuth not configured');
  }

  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    console.log('✅ Google OAuth configured');
    console.log(`   Client ID: ${GOOGLE_CLIENT_ID.substring(0, 20)}...`);
  } else {
    console.log('⚠️  Google OAuth not configured');
  }

  if (!GITHUB_CLIENT_ID && !FEISHU_APP_ID && !GOOGLE_CLIENT_ID) {
    console.log('');
    console.log('💡 To enable real OAuth, set environment variables:');
    console.log('   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET');
    console.log('   FEISHU_APP_ID, FEISHU_APP_SECRET');
    console.log('   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET');
  }
  console.log('');
});
