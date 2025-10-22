import type { DocmostSpace, DocmostPage, DocmostSearchResult, HealthStatus, CreatePageRequest, UpdatePageRequest, SearchRequest } from './types.js';
export declare function listSpaces(): Promise<DocmostSpace[]>;
export declare function searchDocs({ query, spaceId, page, limit, }: SearchRequest): Promise<DocmostSearchResult[]>;
export declare function createPage({ spaceId, title, content, parentId, }: CreatePageRequest): Promise<DocmostPage>;
export declare function updatePage({ pageId, title, content, }: UpdatePageRequest): Promise<DocmostPage>;
export declare function getSpacePages(spaceId: string): Promise<DocmostPage[]>;
export declare function getPageMetadata(pageId: string): Promise<DocmostPage>;
export declare function getAttachment(attachmentId: string, fileName?: string): Promise<any>;
export declare function getPageHistory(pageId: string, page?: number, limit?: number): Promise<any>;
export declare function getPageBreadcrumbs(pageId: string): Promise<any>;
export declare function getComments(pageId: string, page?: number, limit?: number): Promise<any>;
export declare function getAllPages(): Promise<any>;
export declare function healthCheck(): Promise<HealthStatus>;
export declare function debugSession(): Promise<any>;
export declare function boot(): Promise<{
    authToken: string | null;
}>;
//# sourceMappingURL=docmostClient.d.ts.map