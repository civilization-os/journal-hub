const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');

// GET /api/journals - 列出所有日志
router.get('/', (req, res) => {
  try {
    const { date, start_date, end_date, tag, search, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM journals WHERE 1=1';
    const params = [];

    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }
    if (start_date) {
      query += ' AND date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND date <= ?';
      params.push(end_date);
    }
    if (tag) {
      query += ' AND tags LIKE ?';
      params.push(`%"${tag}"%`);
    }
    if (search) {
      query += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const journals = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) as count FROM journals WHERE 1=1').get();

    res.json({
      data: journals.map(j => ({ ...j, tags: JSON.parse(j.tags) })),
      total: total.count,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/journals/:id - 获取单条日志
router.get('/:id', (req, res) => {
  try {
    const journal = db.prepare('SELECT * FROM journals WHERE id = ?').get(req.params.id);
    if (!journal) return res.status(404).json({ error: 'Journal not found' });
    res.json({ ...journal, tags: JSON.parse(journal.tags) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/journals - 创建日志
router.post('/', (req, res) => {
  try {
    const { title = '', content = '', mood = null, tags = [], date } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();
    const journalDate = date || now.substring(0, 10);

    db.prepare(
      'INSERT INTO journals (id, title, content, mood, tags, created_at, updated_at, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, title, content, mood, JSON.stringify(tags), now, now, journalDate);

    const journal = db.prepare('SELECT * FROM journals WHERE id = ?').get(id);
    res.status(201).json({ ...journal, tags: JSON.parse(journal.tags) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/journals/:id - 更新日志
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM journals WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Journal not found' });

    const { title, content, mood, tags, date } = req.body;
    const now = new Date().toISOString();

    db.prepare(
      'UPDATE journals SET title = ?, content = ?, mood = ?, tags = ?, date = ?, updated_at = ? WHERE id = ?'
    ).run(
      title !== undefined ? title : existing.title,
      content !== undefined ? content : existing.content,
      mood !== undefined ? mood : existing.mood,
      tags !== undefined ? JSON.stringify(tags) : existing.tags,
      date !== undefined ? date : existing.date,
      now,
      req.params.id
    );

    const journal = db.prepare('SELECT * FROM journals WHERE id = ?').get(req.params.id);
    res.json({ ...journal, tags: JSON.parse(journal.tags) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/journals/:id - 删除日志
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM journals WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Journal not found' });
    db.prepare('DELETE FROM journals WHERE id = ?').run(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/journals/search - 全文搜索
router.get('/search/full', (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q) return res.json({ data: [] });

    const journals = db.prepare(
      'SELECT * FROM journals WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC LIMIT ?'
    ).all(`%${q}%`, `%${q}%`, Number(limit));

    res.json({ data: journals.map(j => ({ ...j, tags: JSON.parse(j.tags) })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
