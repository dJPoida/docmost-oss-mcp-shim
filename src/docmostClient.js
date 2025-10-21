import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

import { log } from './logger.js';

const { DOCMOST_BASE_URL, DOCMOST_EMAIL, DOCMOST_PASSWORD } = process.env;

if (!DOCMOST_BASE_URL || !DOCMOST_EMAIL || !DOCMOST_PASSWORD) {
  throw new Error('Missing env: DOCMOST_BASE_URL, DOCMOST_EMAIL, DOCMOST_PASSWORD');
}

const baseURL = DOCMOST_BASE_URL.replace(/\/$/, '');
const jar = new CookieJar();
const client = wrapper(
  axios.create({
    baseURL,
    jar,
    withCredentials: true,
    headers: { Accept: 'application/json, */*' },
  })
);

let lastLoginAt = 0;
const LOGIN_TTL_MS = 6 * 60 * 60 * 1000; // 6h

function summarizeCookies(cs) {
  return cs.map((c) => `${c.key} (domain=${c.domain}; path=${c.path}; httpOnly=${c.httpOnly})`);
}

async function login(force = false) {
  const now = Date.now();
  if (!force && now - lastLoginAt < 60_000) return;

  // Docmost OSS: POST /api/auth/login with form or JSON
  // Postman collection shows form-url-encoded, but JSON works on recent builds.
  const resp = await client.post(
    '/api/auth/login',
    {
      email: DOCMOST_EMAIL,
      password: DOCMOST_PASSWORD,
    },
    {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
    }
  );

  if (!(resp.status === 200 || resp.status === 204)) {
    throw new Error(`Login failed: HTTP ${resp.status} — ${JSON.stringify(resp.data)}`);
  }

  // Normalize cookies to baseURL scope and extract authToken
  const setCookies = resp.headers['set-cookie'] || [];
  for (const line of setCookies) {
    await jar.setCookie(line, baseURL);
  }
  const cookies = await jar.getCookies(baseURL);
  log('Logged in. Cookies:', summarizeCookies(cookies));

  // Find authToken cookie value (Postman uses this one)
  const auth = cookies.find((c) => c.key.toLowerCase() === 'authtoken');
  if (!auth?.value) {
    log('Warning: authToken cookie not found. Backend may rely on a different cookie name.');
  }

  lastLoginAt = now;
  return { authToken: auth?.value || null };
}

async function ensureSession() {
  if (Date.now() - lastLoginAt > LOGIN_TTL_MS) {
    await login(true);
  }
}

// All Docmost endpoints we care about are POST and under /api
async function postApi(path, body = {}) {
  await ensureSession();
  // Don’t auto-follow redirects; we want to know if we got bounced to /login
  const r = await client.post(path, body, {
    headers: { 'Content-Type': 'application/json' },
    maxRedirects: 0,
    validateStatus: (s) => (s >= 200 && s < 300) || s === 302,
  });
  if (r.status === 302) {
    // session likely expired or cookie not accepted — force relogin and retry once
    await login(true);
    const r2 = await client.post(path, body, {
      headers: { 'Content-Type': 'application/json' },
      maxRedirects: 0,
      validateStatus: (s) => s >= 200 && s < 300,
    });
    return r2.data;
  }
  return r.data;
}

// Convenience wrappers that mirror Postman collection behavior
export async function listSpaces() {
  // Many Docmost builds expect POST /api/spaces (even for read)
  return postApi('/api/spaces', {});
}

export async function searchDocs({ query, spaceId }) {
  // POST /api/search
  const body = spaceId ? { query, spaceId } : { query };
  return postApi('/api/search', body);
}

export async function createPage({ spaceId, title, content, parentId }) {
  // POST /api/pages/create
  // Docmost uses TipTap editor which expects content as JSON, not markdown
  // If content is a string, wrap it in a basic TipTap document structure
  let formattedContent = content;
  if (typeof content === 'string') {
    formattedContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: content,
            },
          ],
        },
      ],
    };
  }

  const body = { spaceId, title, content: formattedContent };
  if (parentId) body.parentId = parentId;
  return postApi('/api/pages/create', body);
}

export async function updatePage({ pageId, title, content }) {
  // POST /api/pages/update
  const body = { pageId };
  if (title !== undefined) body.title = title;
  if (content !== undefined) {
    // Docmost uses TipTap editor which expects content as JSON, not markdown
    // If content is a string, wrap it in a basic TipTap document structure
    if (typeof content === 'string') {
      body.content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: content,
              },
            ],
          },
        ],
      };
    } else {
      body.content = content;
    }
  }
  return postApi('/api/pages/update', body);
}

export async function debugSession() {
  const cookies = await jar.getCookies(baseURL);
  return {
    baseURL,
    lastLoginAt,
    cookies: cookies.map((c) => ({
      key: c.key,
      domain: c.domain,
      path: c.path,
      httpOnly: c.httpOnly,
      secure: c.secure,
      expires: c.expires,
    })),
  };
}

export async function boot() {
  return login(true);
}
