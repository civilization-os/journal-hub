const fs = require('fs');
const os = require('os');
const path = require('path');

async function main() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'journal-hub-smoke-'));
  const token = 'smoke-token';

  process.env.APP_DATA_DIR = dataDir;
  process.env.JOURNAL_HUB_API_TOKEN = token;
  fs.writeFileSync(path.join(dataDir, 'settings.json'), JSON.stringify({ mcpEnabled: true }), 'utf-8');

  const { app } = require('../src/app');
  const db = require('../src/db/database');
  const server = await new Promise((resolve, reject) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    instance.on('error', reject);
  });

  const address = server.address();
  const baseURL = `http://127.0.0.1:${address.port}/api`;
  process.env.JOURNAL_HUB_API_BASE = baseURL;

  try {
    const unauth = await fetch(`${baseURL}/stats`);
    if (unauth.status !== 401) {
      throw new Error(`Expected unauthorized stats request to return 401, got ${unauth.status}`);
    }

    const health = await fetch(`${baseURL}/health`);
    if (!health.ok) {
      throw new Error(`Health check failed with ${health.status}`);
    }

    const stats = await fetch(`${baseURL}/stats`, {
      headers: { 'x-journal-hub-token': token },
    });
    if (!stats.ok) {
      throw new Error(`Authorized stats request failed with ${stats.status}`);
    }

    const { handleTool } = require('../../mcp-server/index.js');
    const result = await handleTool('stats_overview', {});
    const parsed = JSON.parse(result);
    if (!parsed.data?.journals || !parsed.data?.todos) {
      throw new Error('MCP stats_overview returned an unexpected payload');
    }

    console.log('Smoke test passed');
  } finally {
    await new Promise(resolve => server.close(resolve));
    db.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
