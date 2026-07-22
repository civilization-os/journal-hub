#!/usr/bin/env node

const express = require('express');
const { randomUUID } = require('node:crypto');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { createMcpServer } = require('./index.js');

const PORT = process.env.MCP_PORT || 3002;
const HOST = process.env.MCP_HOST || '127.0.0.1';

// Keep HTTP and stdio transports bound to the Desktop-managed API.
process.env.MCP_PORT = String(PORT);

const app = express();
app.use(express.json());

// Transport storage by session ID
const transports = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', transports: [...transports.keys()] });
});

// ============================================================================
// STREAMABLE HTTP TRANSPORT (Protocol version 2025-11-25)
// Endpoint: /mcp
// Methods: POST (requests), GET (SSE stream), DELETE (terminate session)
// ============================================================================
app.all('/mcp', async (req, res) => {
  try {
    const sessionId = req.headers['mcp-session-id'];
    let transport;

    if (sessionId && transports.has(sessionId)) {
      // Reuse existing transport
      transport = transports.get(sessionId);
    } else if (!sessionId && req.method === 'POST' && req.body?.method === 'initialize') {
      // New session initialization
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports.set(sid, transport);
        },
      });
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports.has(sid)) {
          transports.delete(sid);
        }
      };
      const server = createMcpServer();
      await server.connect(transport);
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Streamable HTTP error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});

// ============================================================================
// LEGACY SSE TRANSPORT (Protocol version 2024-11-05)
// Endpoint: /sse (GET) + /messages (POST)
// ============================================================================
app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  transports.set(transport.sessionId, transport);

  res.on('close', () => {
    transports.delete(transport.sessionId);
  });

  const server = createMcpServer();
  await server.connect(transport);
});

app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports.get(sessionId);

  if (!transport) {
    res.status(404).json({ error: 'Unknown MCP session' });
    return;
  }

  await transport.handlePostMessage(req, res, req.body);
});

// ============================================================================
// Start server
// ============================================================================
const server = app.listen(PORT, HOST, () => {
  console.error(`Journal Hub MCP server running on http://${HOST}:${PORT}`);
  console.error(`  Streamable HTTP: http://${HOST}:${PORT}/mcp  (type=http)`);
  console.error(`  Legacy SSE:      http://${HOST}:${PORT}/sse   (type=sse)`);
});

server.on('error', (err) => {
  console.error('Fatal MCP server error:', err);
  process.exit(1);
});
