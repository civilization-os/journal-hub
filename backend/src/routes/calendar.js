const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');

// GET /api/calendar - 获取日历事件
router.get('/', (req, res) => {
  try {
    const { start, end, limit = 200 } = req.query;
    let query = 'SELECT * FROM calendar_events WHERE 1=1';
    const params = [];

    if (start) {
      query += ' AND start_date >= ?';
      params.push(start);
    }
    if (end) {
      query += ' AND start_date <= ?';
      params.push(end);
    }

    query += ' ORDER BY start_date ASC LIMIT ?';
    params.push(Number(limit));

    const events = db.prepare(query).all(...params);
    res.json({ data: events.map(e => ({ ...e, all_day: !!e.all_day })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendar/day/:date - 获取某天的所有内容（日志+待办+事件）
router.get('/day/:date', (req, res) => {
  try {
    const { date } = req.params;
    const journals = db.prepare('SELECT * FROM journals WHERE date = ? ORDER BY created_at DESC').all(date);
    const todos = db.prepare("SELECT * FROM todos WHERE due_date = ? ORDER BY sort_order ASC").all(date);
    const events = db.prepare('SELECT * FROM calendar_events WHERE start_date = ? ORDER BY created_at ASC').all(date);

    res.json({
      data: {
        date,
        journals: journals.map(j => ({ ...j, tags: JSON.parse(j.tags) })),
        todos: todos.map(t => ({ ...t, tags: JSON.parse(t.tags), completed: !!t.completed })),
        events: events.map(e => ({ ...e, all_day: !!e.all_day })),
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendar/:id
router.get('/:id', (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({ ...event, all_day: !!event.all_day });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calendar - 创建日历事件
router.post('/', (req, res) => {
  try {
    const {
      title,
      description = '',
      start_date,
      end_date = null,
      all_day = true,
      color = 'default',
      linked_journal_id = null,
      linked_todo_id = null,
    } = req.body;

    if (!title || !start_date) return res.status(400).json({ error: 'Title and start_date are required' });

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO calendar_events (id, title, description, start_date, end_date, all_day, color, linked_journal_id, linked_todo_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, title, description, start_date, end_date, all_day ? 1 : 0, color, linked_journal_id, linked_todo_id, now, now);

    const event = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id);
    res.status(201).json({ ...event, all_day: !!event.all_day });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/calendar/:id
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Event not found' });

    const { title, description, start_date, end_date, all_day, color } = req.body;
    const now = new Date().toISOString();

    db.prepare(
      'UPDATE calendar_events SET title=?, description=?, start_date=?, end_date=?, all_day=?, color=?, updated_at=? WHERE id=?'
    ).run(
      title !== undefined ? title : existing.title,
      description !== undefined ? description : existing.description,
      start_date !== undefined ? start_date : existing.start_date,
      end_date !== undefined ? end_date : existing.end_date,
      all_day !== undefined ? (all_day ? 1 : 0) : existing.all_day,
      color !== undefined ? color : existing.color,
      now,
      req.params.id
    );

    const event = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(req.params.id);
    res.json({ ...event, all_day: !!event.all_day });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/calendar/:id
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Event not found' });
    db.prepare('DELETE FROM calendar_events WHERE id = ?').run(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
