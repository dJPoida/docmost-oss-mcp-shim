import express, { Request, Response, NextFunction } from 'express';

import {
  listSpaces,
  searchDocs,
  getSpacePages,
  getPageMetadata,
  getAttachment,
  getPageHistory,
  getPageBreadcrumbs,
  getComments,
  getAllPages,
  debugSession,
  healthCheck,
} from './docmostClient.js';
import type { PaginatedResponse, DocmostSearchResult } from './types.js';

export function buildRouter({
  requireShimKey,
}: {
  requireShimKey: (req: Request, res: Response, next: NextFunction) => void;
}) {
  const r = express.Router();

  // health (no auth)
  r.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

  // detailed health check (no auth)
  r.get('/health/detailed', async (_req: Request, res: Response) => {
    try {
      const health = await healthCheck();
      res.json(health);
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      });
    }
  });

  // everything else requires the shim key if set
  r.use(requireShimKey);

  r.get('/spaces', async (_req: Request, res: Response) => {
    try {
      const data = await listSpaces();
      res.set('X-Cache-Status', 'HIT'); // Will be overridden by cache middleware
      res.json(data);
    } catch (e: any) {
      res.status(e?.response?.status || 500).json({ error: e.message, detail: e?.response?.data });
    }
  });

  r.get('/spaces/:spaceId/pages', async (req: Request, res: Response) => {
    try {
      const { spaceId } = req.params;
      const data = await getSpacePages(spaceId);
      res.json(data);
    } catch (e: any) {
      res.status(e?.response?.status || 500).json({ error: e.message, detail: e?.response?.data });
    }
  });

  r.get('/pages/:pageId', async (req: Request, res: Response) => {
    try {
      const { pageId } = req.params;
      const data = await getPageMetadata(pageId);
      res.json(data);
    } catch (e: any) {
      res.status(e?.response?.status || 500).json({ error: e.message, detail: e?.response?.data });
    }
  });

  r.post('/pages', async (req: Request, res: Response) => {
    try {
      const { pageId } = req.body;
      if (!pageId) {
        return res.status(400).json({ error: 'pageId is required' });
      }
      const data = await getPageMetadata(pageId);
      res.json(data);
    } catch (e: any) {
      res.status(e?.response?.status || 500).json({ error: e.message, detail: e?.response?.data });
    }
  });

  r.post('/spaces/pages', async (req: Request, res: Response) => {
    try {
      const { spaceId } = req.body;
      if (!spaceId) {
        return res.status(400).json({ error: 'spaceId is required' });
      }
      const data = await getSpacePages(spaceId);
      res.json(data);
    } catch (e: any) {
      res.status(e?.response?.status || 500).json({ error: e.message, detail: e?.response?.data });
    }
  });

  r.get('/attachments/:attachmentId/:fileName?', async (req: Request, res: Response) => {
    try {
      const { attachmentId, fileName } = req.params;
      const data = await getAttachment(attachmentId, fileName);
      res.json(data);
    } catch (e: any) {
      res.status(e?.response?.status || 500).json({ error: e.message, detail: e?.response?.data });
    }
  });

  r.post('/pages/history', async (req: Request, res: Response) => {
    try {
      const { pageId, page = 1, limit = 20 } = req.body;
      if (!pageId) {
        return res.status(400).json({ error: 'pageId is required' });
      }
      const data = await getPageHistory(pageId, page, limit);
      res.json(data);
    } catch (e: any) {
      res.status(e?.response?.status || 500).json({ error: e.message, detail: e?.response?.data });
    }
  });

  r.post('/pages/breadcrumbs', async (req: Request, res: Response) => {
    try {
      const { pageId } = req.body;
      if (!pageId) {
        return res.status(400).json({ error: 'pageId is required' });
      }
      const data = await getPageBreadcrumbs(pageId);
      res.json(data);
    } catch (e: any) {
      res.status(e?.response?.status || 500).json({ error: e.message, detail: e?.response?.data });
    }
  });

  r.post('/comments', async (req: Request, res: Response) => {
    try {
      const { pageId, page = 1, limit = 20 } = req.body;
      if (!pageId) {
        return res.status(400).json({ error: 'pageId is required' });
      }
      const data = await getComments(pageId, page, limit);
      res.json(data);
    } catch (e: any) {
      res.status(e?.response?.status || 500).json({ error: e.message, detail: e?.response?.data });
    }
  });

  r.get('/all-pages', async (req: Request, res: Response) => {
    try {
      const data = await getAllPages();
      res.json(data);
    } catch (e: any) {
      res.status(e?.response?.status || 500).json({ error: e.message, detail: e?.response?.data });
    }
  });

  r.post('/search', async (req: Request, res: Response) => {
    try {
      const { query, spaceId, page = 1, limit = 20 } = req.body || {};

      // Validate pagination parameters
      const validPage = Math.max(1, parseInt(String(page)));
      const validLimit = Math.min(100, Math.max(1, parseInt(String(limit))));

      const data = await searchDocs({ query, spaceId, page: validPage, limit: validLimit });

      // Add pagination metadata
      const pagination = {
        page: validPage,
        limit: validLimit,
        total: data.length,
        totalPages: Math.ceil(data.length / validLimit),
        hasNext: data.length === validLimit,
        hasPrev: validPage > 1,
      };

      const response: PaginatedResponse<DocmostSearchResult> = {
        data,
        pagination,
      };

      res.set('X-Cache-Status', 'HIT'); // Will be overridden by cache middleware
      res.json(response);
    } catch (e: any) {
      res.status(e?.response?.status || 500).json({ error: e.message, detail: e?.response?.data });
    }
  });

  // debug: see cookies the shim holds
  r.get('/debug/session', async (_req: Request, res: Response) => {
    const info = await debugSession();
    res.json(info);
  });

  return r;
}
