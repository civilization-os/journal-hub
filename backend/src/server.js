const { app } = require('./app');

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';

const server = app.listen(PORT, HOST, () => {
  console.log(`Journal Hub Backend running on http://${HOST}:${PORT}`);
});

server.on('error', (err) => {
  console.error('Fatal backend server error:', err);
  process.exit(1);
});

module.exports = app;
