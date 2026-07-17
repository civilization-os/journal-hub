const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// SSE Clients Registry
const sseClients = new Set();

// SSE Endpoint
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  
  const interval = setInterval(() => {
    try {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
      }
    } catch (e) {
      clearInterval(interval);
      sseClients.delete(res);
    }
  }, 15000);
  
  sseClients.add(res);
  req.on('close', () => {
    clearInterval(interval);
    sseClients.delete(res);
  });
});

// Global Mutation Observer Middleware
app.use((req, res, next) => {
  res.on('finish', () => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && 
        res.statusCode >= 200 && res.statusCode < 300 && 
        req.originalUrl.startsWith('/api')) {
      for (const client of sseClients) {
        try {
          if (!client.writableEnded) {
            client.write(`data: ${JSON.stringify({ type: 'refresh', path: req.originalUrl })}\n\n`);
          }
        } catch (e) {
          sseClients.delete(client);
        }
      }
    }
  });
  next();
});

// Serve frontend static files
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// Routes
app.use('/api/journals', require('./routes/journals'));
app.use('/api/todos', require('./routes/todos'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/settings', require('./routes/settings'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA Fallback: serve index.html for any non-API requests
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

module.exports = { app };
