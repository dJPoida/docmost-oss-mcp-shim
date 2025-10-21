#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import axios from 'axios';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

const SHIM_URL = (process.env.MCP_DOCMOST_SHIM_URL || 'http://127.0.0.1:3888').replace(/\/$/, '');
const SHIM_KEY = process.env.MCP_SHIM_KEY;

const http = axios.create({
  baseURL: SHIM_URL,
  headers: SHIM_KEY ? { 'X-SHIM-KEY': SHIM_KEY } : {},
  timeout: 30000,
});

const server = new McpServer({
  name: 'docmost-oss-mcp-bridge',
  version: packageJson.version,
});

// Log version for debugging
console.error(`Docmost MCP Server v${packageJson.version} starting...`);

// ---- Tools ----
server.registerTool('docmost.listSpaces', 'List spaces/workspaces in Docmost', {}, async () => {
  const { data } = await http.get('/spaces');
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});

server.registerTool(
  'docmost.search',
  {
    title: 'Search pages',
    description: 'Search Docmost content',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        spaceId: { type: 'string' },
      },
      required: ['query'],
    },
  },
  async (args) => {
    const { data } = await http.post('/search', args ?? {});
    return { content: [{ type: 'json', json: data }] };
  }
);

server.registerTool(
  'docmost.createPage',
  {
    title: 'Create a page',
    description: 'Create a new page in a space',
    inputSchema: {
      type: 'object',
      properties: {
        spaceId: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
        parentId: { type: 'string' },
      },
      required: ['spaceId', 'title'],
    },
  },
  async (args) => {
    const { data } = await http.post('/pages', args ?? {});
    return { content: [{ type: 'json', json: data }] };
  }
);

server.registerTool(
  'docmost.updatePage',
  {
    title: 'Update a page',
    description: 'Update title/content by pageId',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['pageId'],
    },
  },
  async (args) => {
    const { data } = await http.put('/pages', args ?? {});
    return { content: [{ type: 'json', json: data }] };
  }
);

// Optional health check
server.registerTool(
  'docmost.health',
  {
    title: 'Shim health',
    description: 'Check shim health',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  async () => {
    const { data } = await http.get('/health');
    return { content: [{ type: 'json', json: data }] };
  }
);

// ---- Start (stdio transport) ----
const transport = new StdioServerTransport();
await server.connect(transport);
