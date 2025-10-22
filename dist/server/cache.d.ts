export interface CacheStats {
    hits: number;
    misses: number;
    size: number;
    maxSize: number;
}
declare class DocmostCache {
    private spacesCache;
    private searchCache;
    private allPagesCache;
    private stats;
    constructor();
    getSpaces(): any | undefined;
    setSpaces(data: any): void;
    getSearch(query: string, spaceId?: string): any | undefined;
    setSearch(query: string, spaceId: string | undefined, data: any): void;
    invalidateSpaces(): void;
    invalidateSearch(): void;
    getAllPages(): any | undefined;
    setAllPages(data: any): void;
    invalidateAllPages(): void;
    getStats(): CacheStats;
    private getSearchKey;
    private updateStats;
}
export declare const cache: DocmostCache;
export {};
//# sourceMappingURL=cache.d.ts.map