const express = require('express');
const router = express.Router();
const db = require('../db/database');

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
