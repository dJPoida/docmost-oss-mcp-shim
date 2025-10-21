#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
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
const server = new Server(
  {
    name: 'docmost-oss-mcp-bridge',
    version: packageJson.version,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);
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
          },
          required: ['query'],
        },
      },
      {
        name: 'docmost_createPage',
        description: 'Create a new page in Docmost',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: {
              type: 'string',
              description: 'Space ID where the page will be created',
            },
            title: {
              type: 'string',
              description: 'Page title',
            },
            content: {
              type: 'string',
              description: 'Page content',
            },
            parentId: {
              type: 'string',
              description: 'Optional parent page ID',
            },
          },
          required: ['spaceId', 'title'],
        },
      },
      {
        name: 'docmost_updatePage',
        description: 'Update an existing page in Docmost',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: {
              type: 'string',
              description: 'Page ID to update',
            },
            title: {
              type: 'string',
              description: 'New page title',
            },
            content: {
              type: 'string',
              description: 'New page content',
            },
          },
          required: ['pageId'],
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
      case 'docmost_createPage': {
        const { data } = await http.post('/pages', args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }
      case 'docmost_updatePage': {
        const { data } = await http.put('/pages', args);
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
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
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
// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
//# sourceMappingURL=docmost-server.js.map
