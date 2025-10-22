#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Go up two levels from dist/mcp to get to project root
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));
const SHIM_URL = (process.env.MCP_DOCMOST_SHIM_URL || 'http://127.0.0.1:3888').replace(/\/$/, '');
const SHIM_KEY = process.env.MCP_SHIM_KEY;
const http = axios.create({
    baseURL: SHIM_URL,
    headers: SHIM_KEY ? { 'X-SHIM-KEY': SHIM_KEY } : {},
    timeout: 30000,
});
const server = new Server({
    name: 'docmost-oss-mcp-bridge',
    version: packageJson.version,
}, {
    capabilities: {
        tools: {},
        resources: {},
        prompts: {},
    },
});
// Log version for debugging
console.error(`Docmost MCP Server v${packageJson.version} starting...`);
// List spaces tool
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'docmost_listSpaces',
                description: 'List available workspaces/spaces in Docmost',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'docmost_search',
                description: 'Search for pages in Docmost',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Search query',
                        },
                        spaceId: {
                            type: 'string',
                            description: 'Optional space ID to limit search',
                        },
                        page: {
                            type: 'number',
                            description: 'Page number for pagination (default: 1)',
                        },
                        limit: {
                            type: 'number',
                            description: 'Number of results per page (default: 20, max: 100)',
                        },
                    },
                    required: ['query'],
                },
            },
            {
                name: 'docmost_health',
                description: 'Check the health of the Docmost shim server',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'docmost_getPage',
                description: 'Get full page content including attachments and diagrams',
                inputSchema: {
                    type: 'object',
                    properties: {
                        pageId: {
                            type: 'string',
                            description: 'Page ID to retrieve',
                        },
                    },
                    required: ['pageId'],
                },
            },
            {
                name: 'docmost_getSpacePages',
                description: 'Get all pages in a specific space',
                inputSchema: {
                    type: 'object',
                    properties: {
                        spaceId: {
                            type: 'string',
                            description: 'Space ID to get pages from',
                        },
                    },
                    required: ['spaceId'],
                },
            },
            {
                name: 'docmost_getAttachment',
                description: 'Get attachment content including draw.io diagrams and other files',
                inputSchema: {
                    type: 'object',
                    properties: {
                        attachmentId: {
                            type: 'string',
                            description: 'Attachment ID to retrieve',
                        },
                        fileName: {
                            type: 'string',
                            description: 'File name (optional, defaults to diagram.drawio.svg)',
                        },
                    },
                    required: ['attachmentId'],
                },
            },
            {
                name: 'docmost_getPageHistory',
                description: 'Get page version history to understand documentation evolution',
                inputSchema: {
                    type: 'object',
                    properties: {
                        pageId: {
                            type: 'string',
                            description: 'Page ID to get history for',
                        },
                        page: {
                            type: 'number',
                            description: 'Page number for pagination (default: 1)',
                        },
                        limit: {
                            type: 'number',
                            description: 'Number of results per page (default: 20)',
                        },
                    },
                    required: ['pageId'],
                },
            },
            {
                name: 'docmost_getPageBreadcrumbs',
                description: 'Get page hierarchy and navigation context',
                inputSchema: {
                    type: 'object',
                    properties: {
                        pageId: {
                            type: 'string',
                            description: 'Page ID to get breadcrumbs for',
                        },
                    },
                    required: ['pageId'],
                },
            },
            {
                name: 'docmost_getComments',
                description: 'Get comments on a page for additional context and discussions',
                inputSchema: {
                    type: 'object',
                    properties: {
                        pageId: {
                            type: 'string',
                            description: 'Page ID to get comments for',
                        },
                        page: {
                            type: 'number',
                            description: 'Page number for pagination (default: 1)',
                        },
                        limit: {
                            type: 'number',
                            description: 'Number of results per page (default: 20)',
                        },
                    },
                    required: ['pageId'],
                },
            },
        ],
    };
});
// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const { name, arguments: args } = request.params;
        switch (name) {
            case 'docmost_listSpaces': {
                const { data } = await http.get('/spaces');
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(data, null, 2),
                        },
                    ],
                };
            }
            case 'docmost_search': {
                const { data } = await http.post('/search', args);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(data, null, 2),
                        },
                    ],
                };
            }
            case 'docmost_health': {
                const { data } = await http.get('/health');
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(data, null, 2),
                        },
                    ],
                };
            }
            case 'docmost_getPage': {
                const { data } = await http.post('/pages', { pageId: args?.pageId });
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(data, null, 2),
                        },
                    ],
                };
            }
            case 'docmost_getSpacePages': {
                const { data } = await http.post('/spaces/pages', { spaceId: args?.spaceId });
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(data, null, 2),
                        },
                    ],
                };
            }
            case 'docmost_getAttachment': {
                const { data } = await http.get(`/attachments/${args?.attachmentId}${args?.fileName ? `/${args.fileName}` : ''}`);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(data, null, 2),
                        },
                    ],
                };
            }
            case 'docmost_getPageHistory': {
                const { data } = await http.post('/pages/history', {
                    pageId: args?.pageId,
                    page: args?.page || 1,
                    limit: args?.limit || 20,
                });
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(data, null, 2),
                        },
                    ],
                };
            }
            case 'docmost_getPageBreadcrumbs': {
                const { data } = await http.post('/pages/breadcrumbs', { pageId: args?.pageId });
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(data, null, 2),
                        },
                    ],
                };
            }
            case 'docmost_getComments': {
                const { data } = await http.post('/comments', {
                    pageId: args?.pageId,
                    page: args?.page || 1,
                    limit: args?.limit || 20,
                });
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(data, null, 2),
                        },
                    ],
                };
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${errorMessage}`,
                },
            ],
            isError: true,
        };
    }
});
// List resources handler
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    try {
        // Get spaces to build resource list
        const { data: spaces } = await http.get('/spaces');
        const resources = [
            {
                uri: 'docmost://spaces',
                name: 'All Spaces',
                description: 'List of all available Docmost spaces',
                mimeType: 'application/json',
            },
            {
                uri: 'docmost://all-pages',
                name: 'All Pages Overview',
                description: 'Complete list of all pages with metadata for comprehensive documentation discovery',
                mimeType: 'application/json',
            },
        ];
        // Add individual space resources
        if (Array.isArray(spaces)) {
            for (const space of spaces) {
                resources.push({
                    uri: `docmost://space/${space.id}`,
                    name: `Space: ${space.name}`,
                    description: `Pages in the ${space.name} space`,
                    mimeType: 'application/json',
                });
            }
        }
        return { resources };
    }
    catch (error) {
        console.error('Error listing resources:', error);
        return { resources: [] };
    }
});
// Read resource handler
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    try {
        const { uri } = request.params;
        if (uri === 'docmost://spaces') {
            const { data } = await http.get('/spaces');
            return {
                contents: [
                    {
                        uri,
                        mimeType: 'application/json',
                        text: JSON.stringify(data, null, 2),
                    },
                ],
            };
        }
        if (uri === 'docmost://all-pages') {
            const { data } = await http.get('/all-pages');
            return {
                contents: [
                    {
                        uri,
                        mimeType: 'application/json',
                        text: JSON.stringify(data, null, 2),
                    },
                ],
            };
        }
        if (uri.startsWith('docmost://space/')) {
            const spaceId = uri.replace('docmost://space/', '');
            const { data } = await http.get(`/spaces/${spaceId}/pages`);
            return {
                contents: [
                    {
                        uri,
                        mimeType: 'application/json',
                        text: JSON.stringify(data, null, 2),
                    },
                ],
            };
        }
        if (uri.startsWith('docmost://page/')) {
            const pageId = uri.replace('docmost://page/', '');
            const { data } = await http.get(`/pages/${pageId}`);
            return {
                contents: [
                    {
                        uri,
                        mimeType: 'application/json',
                        text: JSON.stringify(data, null, 2),
                    },
                ],
            };
        }
        throw new Error(`Unknown resource URI: ${uri}`);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
            contents: [
                {
                    uri: request.params.uri,
                    mimeType: 'text/plain',
                    text: `Error: ${errorMessage}`,
                },
            ],
            isError: true,
        };
    }
});
// List prompts handler
server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
        prompts: [
            {
                name: 'search-docs',
                description: 'Guide for effective documentation search',
                arguments: [
                    {
                        name: 'query',
                        description: 'Search query to find relevant documentation',
                        required: true,
                    },
                    {
                        name: 'spaceId',
                        description: 'Optional space ID to limit search scope',
                        required: false,
                    },
                ],
            },
        ],
    };
});
// Get prompt handler
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    switch (name) {
        case 'search-docs': {
            const { query, spaceId } = args;
            return {
                description: `Search for documentation using query "${query}"${spaceId ? ` in space ${spaceId}` : ''}`,
                messages: [
                    {
                        role: 'user',
                        content: {
                            type: 'text',
                            text: `I need to search for documentation with the query: "${query}"
${spaceId ? `Limit the search to space: ${spaceId}` : ''}

Please use the docmost_search tool to find relevant documentation.`,
                        },
                    },
                ],
            };
        }
        default:
            throw new Error(`Unknown prompt: ${name}`);
    }
});
// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=docmostServer.js.map