#!/usr/bin/env node
/* global setTimeout */
import { spawn } from 'child_process';

// Test the MCP server by sending MCP protocol messages
const server = spawn('node', ['mcp/docmost-server.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

// Send initialization message
const initMessage = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {},
    },
    clientInfo: {
      name: 'test-client',
      version: '1.0.0',
    },
  },
};

console.log('Sending initialization message...');
server.stdin.write(JSON.stringify(initMessage) + '\n');

// Send tools/list request
setTimeout(() => {
  const toolsListMessage = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {},
  };

  console.log('Sending tools/list request...');
  server.stdin.write(JSON.stringify(toolsListMessage) + '\n');
}, 1000);

// Handle responses
server.stdout.on('data', (data) => {
  console.log('Server response:', data.toString());
});

server.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});

// Clean up after 5 seconds
setTimeout(() => {
  server.kill();
  process.exit(0);
}, 5000);
