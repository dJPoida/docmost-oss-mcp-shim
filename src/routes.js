import express from 'express';

import { listSpaces, searchDocs, createPage, updatePage, debugSession } from './docmostClient.js';

export function buildRouter({ requireShimKey }) {
  const r = express.Router();

  // health (no auth)
  r.get('/health', (_req, res) => res.json({ ok: true }));

  // everything else requires the shim key if set
  r.use(requireShimKey);

  r.get('/spaces', async (_req, res) => {
    try {
      const data = await listSpaces();
      res.json(data);
    } catch (e) {
      res.status(e?.response?.status || 500).json({ error: e.message, detail: e?.response?.data });
    }
  });

  r.post('/search', async (req, res) => {
    try {
      const data = await searchDocs(req.body || {});
      res.json(data);
    } catch (e) {
      res.status(e?.response?.status || 500).json({ error: e.message, detail: e?.response?.data });
    }
  });

  r.post('/pages', async (req, res) => {
    try {
      const data = await createPage(req.body || {});
      res.json(data);
    } catch (e) {
      res.status(e?.response?.status || 500).json({ error: e.message, detail: e?.response?.data });
    }
  });

  r.put('/pages', async (req, res) => {
    try {
      const data = await updatePage(req.body || {});
      res.json(data);
    } catch (e) {
      res.status(e?.response?.status || 500).json({ error: e.message, detail: e?.response?.data });
    }
  });

  // debug: see cookies the shim holds
  r.get('/debug/session', async (_req, res) => {
    const info = await debugSession();
    res.json(info);
  });

  return r;
}
