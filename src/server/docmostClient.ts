import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import pRetry from 'p-retry';
import { CookieJar } from 'tough-cookie';

import { cache } from './cache.js';
import { log } from './logger.js';
import type {
  DocmostSpace,
  DocmostPage,
  DocmostSearchResult,
  HealthStatus,
  CreatePageRequest,
  UpdatePageRequest,
  SearchRequest,
  RetryConfig,
} from './types.js';

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

const retryConfig: RetryConfig = {
  retries: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3'),
  minTimeout: parseInt(process.env.RETRY_MIN_TIMEOUT || '1000'),
  maxTimeout: parseInt(process.env.RETRY_MAX_TIMEOUT || '30000'),
  factor: 2,
};

function summarizeCookies(cs: any[]): string[] {
  return cs.map(
    (c: any) => `${c.key} (domain=${c.domain}; path=${c.path}; httpOnly=${c.httpOnly})`
  );
}

async function login(force = false): Promise<{ authToken: string | null }> {
  const now = Date.now();
  if (!force && now - lastLoginAt < 60_000) return { authToken: null };

  const loginAttempt = async (): Promise<{ authToken: string | null }> => {
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
  };

  try {
    return await pRetry(loginAttempt, {
      retries: retryConfig.retries,
      minTimeout: retryConfig.minTimeout,
      maxTimeout: retryConfig.maxTimeout,
      factor: retryConfig.factor,
      onFailedAttempt: (error) => {
        log(
          `Login attempt ${error.attemptNumber} failed: ${error.message}. ${error.retriesLeft} retries left.`
        );
      },
    });
  } catch (error) {
    log('All login attempts failed:', error);
    throw error;
  }
}

async function ensureSession(): Promise<void> {
  if (Date.now() - lastLoginAt > LOGIN_TTL_MS) {
    await login(true);
  }
}

// All Docmost endpoints we care about are POST and under /api
async function postApi(path: string, body: any = {}): Promise<any> {
  await ensureSession();

  const apiCall = async (): Promise<any> => {
    // Don't auto-follow redirects; we want to know if we got bounced to /login
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
  };

  try {
    return await pRetry(apiCall, {
      retries: retryConfig.retries,
      minTimeout: retryConfig.minTimeout,
      maxTimeout: retryConfig.maxTimeout,
      factor: retryConfig.factor,
      onFailedAttempt: (error) => {
        log(
          `API call attempt ${error.attemptNumber} failed: ${error.message}. ${error.retriesLeft} retries left.`
        );
      },
    });
  } catch (error) {
    log('All API call attempts failed:', error);
    throw error;
  }
}

// Convenience wrappers that mirror Postman collection behavior
export async function listSpaces(): Promise<DocmostSpace[]> {
  // Check cache first
  const cached = cache.getSpaces();
  if (cached) {
    log('Spaces cache HIT');
    return cached;
  }

  log('Spaces cache MISS');
  // Many Docmost builds expect POST /api/spaces (even for read)
  const result = await postApi('/api/spaces', {});
  cache.setSpaces(result);
  return result;
}

export async function searchDocs({
  query,
  spaceId,
  page = 1,
  limit = 20,
}: SearchRequest): Promise<DocmostSearchResult[]> {
  // Check cache first
  const cached = cache.getSearch(query, spaceId);
  if (cached) {
    log('Search cache HIT');
    return cached;
  }

  log('Search cache MISS');
  // POST /api/search
  const body = spaceId ? { query, spaceId, page, limit } : { query, page, limit };
  const result = await postApi('/api/search', body);
  cache.setSearch(query, spaceId, result);
  return result;
}

export async function createPage({
  spaceId,
  title,
  content,
  parentId,
}: CreatePageRequest): Promise<DocmostPage> {
  // Invalidate caches since we're creating new content
  cache.invalidateSpaces();
  cache.invalidateSearch();

  // POST /api/pages/create
  // Docmost uses TipTap editor which expects content as JSON, not markdown
  // If content is a string, wrap it in a basic TipTap document structure
  let formattedContent: any = content;
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

  const body: any = { spaceId, title, content: formattedContent };
  if (parentId) body.parentId = parentId;
  return postApi('/api/pages/create', body);
}

export async function updatePage({
  pageId,
  title,
  content,
}: UpdatePageRequest): Promise<DocmostPage> {
  // Invalidate caches since we're updating content
  cache.invalidateSearch();

  // POST /api/pages/update
  const body: any = { pageId };
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

export async function getSpacePages(spaceId: string): Promise<DocmostPage[]> {
  return postApi('/api/pages/sidebar-pages', { spaceId });
}

export async function getPageMetadata(pageId: string): Promise<DocmostPage> {
  return postApi('/api/pages/info', { pageId });
}

export async function getAttachment(
  attachmentId: string,
  fileName: string = 'diagram.drawio.svg'
): Promise<any> {
  // Use the correct Docmost API endpoint for file downloads
  const response = await client.get(`/api/files/${attachmentId}/${fileName}`, {
    headers: { 'Content-Type': 'application/json' },
    maxRedirects: 0,
    validateStatus: (s) => (s >= 200 && s < 300) || s === 302,
  });

  if (response.status === 302) {
    await login(true);
    const response2 = await client.get(`/api/files/${attachmentId}/${fileName}`, {
      headers: { 'Content-Type': 'application/json' },
      maxRedirects: 0,
      validateStatus: (s) => s >= 200 && s < 300,
    });
    return response2.data;
  }
  return response.data;
}

export async function getPageHistory(
  pageId: string,
  page: number = 1,
  limit: number = 20
): Promise<any> {
  return postApi('/api/pages/history', { pageId, page, limit });
}

export async function getPageBreadcrumbs(pageId: string): Promise<any> {
  return postApi('/api/pages/breadcrumbs', { pageId });
}

export async function getComments(
  pageId: string,
  page: number = 1,
  limit: number = 20
): Promise<any> {
  return postApi('/api/comments/', { pageId, page, limit });
}

export async function getAllPages(): Promise<any> {
  // Check cache first
  const cached = cache.getAllPages();
  if (cached) {
    return cached;
  }

  // Get all spaces first
  const spacesResponse = await listSpaces();
  // Handle both direct array response and nested response structure
  const spaces = Array.isArray(spacesResponse)
    ? spacesResponse
    : (spacesResponse as any).data?.items || [];

  // Get all pages from all spaces
  const allPages = [];
  for (const space of spaces) {
    try {
      const spacePagesResponse = await getSpacePages(space.id);
      // Handle both direct array response and nested response structure
      const spacePages = Array.isArray(spacePagesResponse)
        ? spacePagesResponse
        : (spacePagesResponse as any).data?.items || [];

      // Add space metadata to each page
      const pagesWithSpace = spacePages.map((page: any) => ({
        ...page,
        spaceName: space.name,
        spaceSlug: (space as any).slug || space.name.toLowerCase().replace(/\s+/g, '-'),
      }));
      allPages.push(...pagesWithSpace);
    } catch (error) {
      log(`Error fetching pages for space ${space.name}:`, error);
      // Continue with other spaces even if one fails
    }
  }

  const result = {
    pages: allPages,
    totalCount: allPages.length,
    lastUpdated: new Date().toISOString(),
  };

  // Cache the result
  cache.setAllPages(result);
  return result;
}

export async function healthCheck(): Promise<HealthStatus> {
  const timestamp = Date.now();

  try {
    // Try to fetch spaces to test connectivity and auth
    await listSpaces();

    return {
      ok: true,
      docmostReachable: true,
      authenticated: true,
      lastLoginAt,
      sessionValid: true,
      timestamp,
    };
  } catch (error) {
    log('Health check failed:', error);
    return {
      ok: false,
      docmostReachable: false,
      authenticated: false,
      lastLoginAt,
      sessionValid: false,
      timestamp,
    };
  }
}

export async function debugSession(): Promise<any> {
  const cookies = await jar.getCookies(baseURL);
  return {
    baseURL,
    lastLoginAt,
    cookies: cookies.map((c: any) => ({
      key: c.key,
      domain: c.domain,
      path: c.path,
      httpOnly: c.httpOnly,
      secure: c.secure,
      expires: c.expires,
    })),
    cacheStats: cache.getStats(),
  };
}

export async function boot(): Promise<{ authToken: string | null }> {
  return login(true);
}
