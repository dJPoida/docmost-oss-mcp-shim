import 'dotenv/config';
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import express from 'express';
import { CookieJar } from 'tough-cookie';

const {
  DOCMOST_BASE_URL,
  DOCMOST_EMAIL,
  DOCMOST_PASSWORD,
  PORT = 3888,
  HOST = '127.0.0.1',
  SHIM_API_KEY,
} = process.env;

if (!DOCMOST_BASE_URL || !DOCMOST_EMAIL || !DOCMOST_PASSWORD) {
  console.error('Missing env: DOCMOST_BASE_URL, DOCMOST_EMAIL, DOCMOST_PASSWORD');
  process.exit(1);
}

const baseURL = DOCMOST_BASE_URL.replace(/\/$/, '');

const jar = new CookieJar();
const client = wrapper(
  axios.create({
    baseURL,
    jar,
    withCredentials: true,
  })
);

const app = express();
app.use(express.json({ limit: '1mb' }));

const requireShimKey = (req, res, next) => {
  if (!SHIM_API_KEY) return next();
  const key = req.header('X-SHIM-KEY');
  if (key === SHIM_API_KEY) return next();
  return res.status(401).json({ error: 'Unauthorized (missing/invalid X-SHIM-KEY)' });
};

// ---- Session (fixed to /api/auth/login) ----
let lastLoginAt = 0;
const LOGIN_TTL_MS = 6 * 60 * 60 * 1000; // 6h

async function login(force = false) {
  const now = Date.now();
  if (!force && now - lastLoginAt < 60_000) return;
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
  lastLoginAt = now;
}

async function ensureSession() {
  if (Date.now() - lastLoginAt > LOGIN_TTL_MS) {
    await login(true);
  }
}

async function withSession(fn) {
  try {
    await ensureSession();
    return await fn();
  } catch (err) {
    if (err?.response?.status === 401) {
      await login(true);
      return await fn();
    }
    throw err;
  }
}

// ---- Routes ----
app.get('/health', (_req, res) => res.json({ ok: true }));

app.use(requireShimKey);

// GET spaces -> /api/spaces
app.get('/spaces', async (_req, res) => {
  try {
    const data = await withSession(async () => {
      const r = await client.get('/api/spaces');
      return r.data;
    });
    res.json(data);
  } catch (e) {
    res.status(e?.response?.status || 500).json({ error: e.message, detail: e?.response?.data });
  }
});

// POST search -> /api/search   body: { query, spaceId? }
app.post('/search', async (req, res) => {
  try {
    const data = await withSession(async () => {
      const r = await client.post('/api/search', req.body, {
        headers: { 'Content-Type': 'application/json' },
      });
      return r.data;
    });
    res.json(data);
  } catch (e) {
    res.status(e?.response?.status || 500).json({ error: e.message, detail: e?.response?.data });
  }
});

// POST create page -> /api/pages/create   body: { spaceId, title, content, parentId? }
app.post('/pages', async (req, res) => {
  try {
    const data = await withSession(async () => {
      const r = await client.post('/api/pages/create', req.body, {
        headers: { 'Content-Type': 'application/json' },
      });
      return r.data;
    });
    res.json(data);
  } catch (e) {
    res.status(e?.response?.status || 500).json({ error: e.message, detail: e?.response?.data });
  }
});

// PUT update page -> /api/pages/update   body: { pageId, title?, content? }
app.put('/pages', async (req, res) => {
  try {
    const data = await withSession(async () => {
      const r = await client.post('/api/pages/update', req.body, {
        headers: { 'Content-Type': 'application/json' },
      });
      return r.data;
    });
    res.json(data);
  } catch (e) {
    res.status(e?.response?.status || 500).json({ error: e.message, detail: e?.response?.data });
  }
});

// ---- Boot ----
login(true)
  .then(() => {
    app.listen(Number(PORT), HOST, () => {
      console.log(`Docmost shim listening on http://${HOST}:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Initial login failed:', err?.message);
    process.exit(1);
  });
