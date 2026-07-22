const express = require('express');
const router = express.Router();
const db = require('../db/database');
const fs = require('fs');
const path = require('path');

// GET /api/settings/mcp-status
router.get('/mcp-status', (req, res) => {
  console.log('[DEBUG] mcp-status route HIT!');
  try {
    const settingsPath = path.join(process.env.APP_DATA_DIR || path.join(__dirname, '../../data'), 'settings.json');
    let enabled = false;

    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      enabled = settings.mcpEnabled === true;
    }

    if (!enabled) {
      return res.status(403).json({ data: { enabled: false } });
    }

    res.json({ data: { enabled: true } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/:key
router.get('/:key', (req, res) => {
  try {
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key);
    if (!setting) {
      return res.json({ data: null });
    }
    res.json({ data: setting.value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/:key
router.post('/:key', (req, res) => {
  try {
    const { value } = req.body;
    const key = req.params.key;
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT key FROM settings WHERE key = ?').get(key);
    if (existing) {
      db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?').run(value, now, key);
    } else {
      db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)').run(key, value, now);
    }

    res.json({ data: { key, value } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
