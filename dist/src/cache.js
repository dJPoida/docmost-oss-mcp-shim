import { LRUCache } from 'lru-cache';
class DocmostCache {
    spacesCache;
    searchCache;
    allPagesCache;
    stats;
    constructor() {
        const spacesTtl = parseInt(process.env.CACHE_SPACES_TTL || '300') * 1000; // 5 minutes default
        const searchTtl = parseInt(process.env.CACHE_SEARCH_TTL || '120') * 1000; // 2 minutes default
        const maxEntries = parseInt(process.env.CACHE_MAX_ENTRIES || '100');
        this.spacesCache = new LRUCache({
            max: 1,
            ttl: spacesTtl,
        });
        this.searchCache = new LRUCache({
            max: maxEntries,
            ttl: searchTtl,
        });
        this.allPagesCache = new LRUCache({
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
    getSpaces() {
        const key = 'spaces';
        const result = this.spacesCache.get(key);
        if (result !== undefined) {
            this.stats.hits++;
            return result;
        }
        this.stats.misses++;
        return undefined;
    }
    setSpaces(data) {
        const key = 'spaces';
        this.spacesCache.set(key, data);
        this.updateStats();
    }
    getSearch(query, spaceId) {
        const key = this.getSearchKey(query, spaceId);
        const result = this.searchCache.get(key);
        if (result !== undefined) {
            this.stats.hits++;
            return result;
        }
        this.stats.misses++;
        return undefined;
    }
    setSearch(query, spaceId, data) {
        const key = this.getSearchKey(query, spaceId);
        this.searchCache.set(key, data);
        this.updateStats();
    }
    invalidateSpaces() {
        this.spacesCache.clear();
        this.updateStats();
    }
    invalidateSearch() {
        this.searchCache.clear();
        this.updateStats();
    }
    getAllPages() {
        const key = 'all-pages';
        const result = this.allPagesCache.get(key);
        if (result !== undefined) {
            this.stats.hits++;
            return result;
        }
        this.stats.misses++;
        return undefined;
    }
    setAllPages(data) {
        const key = 'all-pages';
        this.allPagesCache.set(key, data);
        this.updateStats();
    }
    invalidateAllPages() {
        this.allPagesCache.clear();
        this.updateStats();
    }
    getStats() {
        return { ...this.stats };
    }
    getSearchKey(query, spaceId) {
        return spaceId ? `${query}:${spaceId}` : query;
    }
    updateStats() {
        this.stats.size = this.spacesCache.size + this.searchCache.size + this.allPagesCache.size;
    }
}
export const cache = new DocmostCache();
//# sourceMappingURL=cache.js.map