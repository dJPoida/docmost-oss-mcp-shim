import { LRUCache } from 'lru-cache';

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
}

class DocmostCache {
  private spacesCache: LRUCache<string, any>;
  private searchCache: LRUCache<string, any>;
  private allPagesCache: LRUCache<string, any>;
  private stats: CacheStats;

  constructor() {
    const spacesTtl = parseInt(process.env.CACHE_SPACES_TTL || '300') * 1000; // 5 minutes default
    const searchTtl = parseInt(process.env.CACHE_SEARCH_TTL || '120') * 1000; // 2 minutes default
    const maxEntries = parseInt(process.env.CACHE_MAX_ENTRIES || '100');

    this.spacesCache = new LRUCache<string, any>({
      max: 1,
      ttl: spacesTtl,
    });

    this.searchCache = new LRUCache<string, any>({
      max: maxEntries,
      ttl: searchTtl,
    });

    this.allPagesCache = new LRUCache<string, any>({
      max: 1, // Only one all-pages response
      ttl: spacesTtl, // Same TTL as spaces since it depends on spaces
    });

    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      maxSize: maxEntries,
    };
  }

  getSpaces(): any | undefined {
    const key = 'spaces';
    const result = this.spacesCache.get(key);
    if (result !== undefined) {
      this.stats.hits++;
      return result;
    }
    this.stats.misses++;
    return undefined;
  }

  setSpaces(data: any): void {
    const key = 'spaces';
    this.spacesCache.set(key, data);
    this.updateStats();
  }

  getSearch(query: string, spaceId?: string): any | undefined {
    const key = this.getSearchKey(query, spaceId);
    const result = this.searchCache.get(key);
    if (result !== undefined) {
      this.stats.hits++;
      return result;
    }
    this.stats.misses++;
    return undefined;
  }

  setSearch(query: string, spaceId: string | undefined, data: any): void {
    const key = this.getSearchKey(query, spaceId);
    this.searchCache.set(key, data);
    this.updateStats();
  }

  invalidateSpaces(): void {
    this.spacesCache.clear();
    this.updateStats();
  }

  invalidateSearch(): void {
    this.searchCache.clear();
    this.updateStats();
  }

  getAllPages(): any | undefined {
    const key = 'all-pages';
    const result = this.allPagesCache.get(key);
    if (result !== undefined) {
      this.stats.hits++;
      return result;
    }
    this.stats.misses++;
    return undefined;
  }

  setAllPages(data: any): void {
    const key = 'all-pages';
    this.allPagesCache.set(key, data);
    this.updateStats();
  }

  invalidateAllPages(): void {
    this.allPagesCache.clear();
    this.updateStats();
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  private getSearchKey(query: string, spaceId?: string): string {
    return spaceId ? `${query}:${spaceId}` : query;
  }

  private updateStats(): void {
    this.stats.size = this.spacesCache.size + this.searchCache.size + this.allPagesCache.size;
  }
}

export const cache = new DocmostCache();
