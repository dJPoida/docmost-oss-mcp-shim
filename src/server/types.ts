// Shared types for Docmost API responses and internal structures

export interface DocmostSpace {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocmostPage {
  id: string;
  title: string;
  content?: any;
  spaceId: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  path?: string;
}

export interface DocmostSearchResult {
  id: string;
  title: string;
  content: string;
  spaceId: string;
  spaceName?: string;
  path?: string;
  score?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface HealthStatus {
  ok: boolean;
  docmostReachable: boolean;
  authenticated: boolean;
  lastLoginAt?: number;
  sessionValid: boolean;
  timestamp: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
}

export interface RetryConfig {
  retries: number;
  minTimeout: number;
  maxTimeout: number;
  factor: number;
}

export interface CreatePageRequest {
  spaceId: string;
  title: string;
  content?: string;
  parentId?: string;
}

export interface UpdatePageRequest {
  pageId: string;
  title?: string;
  content?: string;
}

export interface SearchRequest {
  query: string;
  spaceId?: string;
  page?: number;
  limit?: number;
}
