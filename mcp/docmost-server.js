#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import { z } from 'zod';

const SHIM_URL = process.env.MCP_DOCMOST_SHIM_URL || 'http://127.0.0.1:3888';
const SHIM_KEY = process.env.MCP_SHIM_KEY;

const client = axios.create({
  baseURL: SHIM_URL.replace(/\/$/, ''),
  headers: SHIM_KEY ? { 'X-SHIM-KEY': SHIM_KEY } : {},
  timeout: 30_000,
});

const server = new Server(
  {
    name: 'docmost-oss-mcp-bridge',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ---- Tool schemas ----
const SearchSchema = z.object({
  query: z.string().min(1, 'query required'),
  spaceId: z.string().optional(),
});

const CreatePageSchema = z.object({
  spaceId: z.string().min(1, 'spaceId required'),
  title: z.string().min(1, 'title required'),
  content: z.string().default(''),
  parentId: z.string().optional(),
});

const UpdatePageSchema = z.object({
  pageId: z.string().min(1, 'pageId required'),
  title: z.string().optional(),
  content: z.string().optional(),
});

// ---- Register tools ----
server.tool('docmost.listSpaces', 'List spaces/workspaces in Docmost', async () => {
  const { data } = await client.get('/spaces');
  return {
    content: [{ type: 'json', json: data }],
  };
});

server.tool(
  'docmost.search',
  'Search for pages. Args: { query: string, spaceId?: string }',
  async ({ arguments: args }) => {
    const parsed = SearchSchema.parse(args || {});
    const { data } = await client.post('/search', parsed);
    return { content: [{ type: 'json', json: data }] };
  }
);

server.tool(
  'docmost.createPage',
  'Create a page. Args: { spaceId, title, content, parentId? }',
  async ({ arguments: args }) => {
    const parsed = CreatePageSchema.parse(args || {});
    const { data } = await client.post('/pages', parsed);
    return { content: [{ type: 'json', json: data }] };
  }
);

server.tool(
  'docmost.updatePage',
  'Update a page. Args: { pageId, title?, content? }',
  async ({ arguments: args }) => {
    const parsed = UpdatePageSchema.parse(args || {});
    const { data } = await client.put('/pages', parsed);
    return { content: [{ type: 'json', json: data }] };
  }
);

// Basic health tool (optional)
server.tool('docmost.health', 'Shim health check', async () => {
  const { data } = await client.get('/health');
  return { content: [{ type: 'json', json: data }] };
});

// Start the server (stdio transport)
server.connectStdio();

// Optional: strictly validate tool calls (nice DX)
server.router.schema = CallToolRequestSchema;
