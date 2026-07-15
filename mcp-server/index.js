#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');
const { app } = require('../backend/src/app.js');
const { exec } = require('child_process');
const os = require('os');

const PORT = process.env.PORT || 3001;
const API_BASE = `http://localhost:${PORT}/api`;

const api = axios.create({ baseURL: API_BASE, timeout: 10000 });

// ==================== Tool Definitions ====================
const TOOLS = [
  // Journal Tools
  {
    name: 'journal_list',
    description: 'List journal entries. Supports filtering by date, tag, and search query.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Filter by date (YYYY-MM-DD)' },
        tag: { type: 'string', description: 'Filter by tag name' },
        search: { type: 'string', description: 'Search in title and content' },
        limit: { type: 'number', description: 'Max results (default 50)' },
        offset: { type: 'number', description: 'Offset for pagination' },
      },
    },
  },
  {
    name: 'journal_get',
    description: 'Get a single journal entry by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Journal ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'journal_create',
    description: 'Create a new journal entry.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Journal title' },
        content: { type: 'string', description: 'Journal content (supports HTML from TipTap)' },
        mood: { type: 'string', description: 'Mood: happy, sad, neutral, excited, anxious, grateful' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tag list' },
        date: { type: 'string', description: 'Date (YYYY-MM-DD), defaults to today' },
      },
    },
  },
  {
    name: 'journal_update',
    description: 'Update an existing journal entry.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Journal ID' },
        title: { type: 'string' },
        content: { type: 'string' },
        mood: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        date: { type: 'string', description: 'Date (YYYY-MM-DD)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'journal_delete',
    description: 'Delete a journal entry by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Journal ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'journal_search',
    description: 'Full-text search across all journals.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
      required: ['query'],
    },
  },
  // Todo Tools
  {
    name: 'todo_list',
    description: 'List todo items with optional filters.',
    inputSchema: {
      type: 'object',
      properties: {
        completed: { type: 'boolean', description: 'Filter by completion status' },
        priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Filter by priority' },
        tag: { type: 'string', description: 'Filter by tag' },
        due_date: { type: 'string', description: 'Filter by due date (YYYY-MM-DD)' },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'todo_get',
    description: 'Get a single todo by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Todo ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'todo_create',
    description: 'Create a new todo item.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Todo title' },
        description: { type: 'string', description: 'Optional description' },
        priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Priority level' },
        due_date: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['title'],
    },
  },
  {
    name: 'todo_update',
    description: 'Update a todo item.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Todo ID' },
        title: { type: 'string' },
        description: { type: 'string' },
        completed: { type: 'boolean' },
        priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        due_date: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['id'],
    },
  },
  {
    name: 'todo_complete',
    description: 'Toggle the completion status of a todo item.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Todo ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'todo_delete',
    description: 'Delete a todo item.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Todo ID' },
      },
      required: ['id'],
    },
  },
  // Calendar Tools
  {
    name: 'calendar_events_list',
    description: 'List calendar events in a date range.',
    inputSchema: {
      type: 'object',
      properties: {
        start: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        end: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'calendar_event_create',
    description: 'Create a new calendar event.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Event title' },
        description: { type: 'string' },
        start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        end_date: { type: 'string', description: 'End date (YYYY-MM-DD), optional' },
        all_day: { type: 'boolean', description: 'Is all-day event (default true)' },
        color: { type: 'string', description: 'Color label: default, red, green, blue, yellow' },
      },
      required: ['title', 'start_date'],
    },
  },
  {
    name: 'calendar_get_day',
    description: 'Get all content for a specific day: journals, todos, and calendar events.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date (YYYY-MM-DD)' },
      },
      required: ['date'],
    },
  },
  {
    name: 'stats_overview',
    description: 'Get an overview of statistics: total journals, todos, events, and recent activity.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  // System Tools
  {
    name: 'open_web_ui',
    description: 'Open the Journal Hub Web UI in the default browser.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// ==================== Helper ====================
function openBrowser(url) {
  const platform = os.platform();
  if (platform === 'win32') {
    exec(`start "" "${url}"`);
  } else if (platform === 'darwin') {
    exec(`open "${url}"`);
  } else {
    exec(`xdg-open "${url}"`);
  }
}

// ==================== Tool Handlers ====================
async function handleTool(name, args) {
  switch (name) {
    case 'journal_list': {
      const res = await api.get('/journals', { params: args });
      return JSON.stringify(res.data, null, 2);
    }
    case 'journal_get': {
      const res = await api.get(`/journals/${args.id}`);
      return JSON.stringify(res.data, null, 2);
    }
    case 'journal_create': {
      const res = await api.post('/journals', args);
      return JSON.stringify(res.data, null, 2);
    }
    case 'journal_update': {
      const { id, ...body } = args;
      const res = await api.put(`/journals/${id}`, body);
      return JSON.stringify(res.data, null, 2);
    }
    case 'journal_delete': {
      const res = await api.delete(`/journals/${args.id}`);
      return JSON.stringify(res.data, null, 2);
    }
    case 'journal_search': {
      const res = await api.get('/journals/search/full', { params: { q: args.query, limit: args.limit } });
      return JSON.stringify(res.data, null, 2);
    }
    case 'todo_list': {
      const res = await api.get('/todos', { params: args });
      return JSON.stringify(res.data, null, 2);
    }
    case 'todo_get': {
      const res = await api.get(`/todos/${args.id}`);
      return JSON.stringify(res.data, null, 2);
    }
    case 'todo_create': {
      const res = await api.post('/todos', args);
      return JSON.stringify(res.data, null, 2);
    }
    case 'todo_update': {
      const { id, ...body } = args;
      const res = await api.put(`/todos/${id}`, body);
      return JSON.stringify(res.data, null, 2);
    }
    case 'todo_complete': {
      const res = await api.patch(`/todos/${args.id}/complete`);
      return JSON.stringify(res.data, null, 2);
    }
    case 'todo_delete': {
      const res = await api.delete(`/todos/${args.id}`);
      return JSON.stringify(res.data, null, 2);
    }
    case 'calendar_events_list': {
      const res = await api.get('/calendar', { params: args });
      return JSON.stringify(res.data, null, 2);
    }
    case 'calendar_event_create': {
      const res = await api.post('/calendar', args);
      return JSON.stringify(res.data, null, 2);
    }
    case 'calendar_get_day': {
      const res = await api.get(`/calendar/day/${args.date}`);
      return JSON.stringify(res.data, null, 2);
    }
    case 'stats_overview': {
      const res = await api.get('/stats');
      return JSON.stringify(res.data, null, 2);
    }
    case 'open_web_ui': {
      const url = `http://localhost:${PORT}`;
      openBrowser(url);
      return JSON.stringify({ message: `Opened Web UI at ${url}` }, null, 2);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ==================== MCP Server ====================
async function startMcpServer() {
  const server = new Server(
    { name: 'journal-hub-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await handleTool(name, args || {});
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Unknown error';
      return {
        content: [{ type: 'text', text: `Error: ${msg}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

async function main() {
  // Multi-startup protection: Try to start the Web/API server and mount dist
  const server = app.listen(PORT, () => {
    console.error(`Journal Hub Web/API server running on http://localhost:${PORT}`);
    startMcpServer().catch(err => {
      console.error('Fatal MCP Error:', err);
      process.exit(1);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} in use (multi-startup protection active). Proceeding to provide AI operation func...`);
      startMcpServer().catch(err => {
        console.error('Fatal MCP Error:', err);
        process.exit(1);
      });
    } else {
      console.error('Fatal Server Error:', err);
      process.exit(1);
    }
  });
}

main();
