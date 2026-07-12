const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');

// GET /api/todos - 列出待办事项
router.get('/', (req, res) => {
  try {
    const { completed, priority, tag, due_date, limit = 100, offset = 0 } = req.query;
    let query = 'SELECT * FROM todos WHERE 1=1';
    const params = [];

    if (completed !== undefined) {
      query += ' AND completed = ?';
      params.push(completed === 'true' ? 1 : 0);
    }
    if (priority) {
      query += ' AND priority = ?';
      params.push(priority);
    }
    if (tag) {
      query += ' AND tags LIKE ?';
      params.push(`%"${tag}"%`);
    }
    if (due_date) {
      query += ' AND due_date = ?';
      params.push(due_date);
    }

    query += ' ORDER BY completed ASC, sort_order ASC, created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const todos = db.prepare(query).all(...params);
    res.json({
      data: todos.map(t => ({ ...t, tags: JSON.parse(t.tags), completed: !!t.completed })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/todos/:id
router.get('/:id', (req, res) => {
  try {
    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
    if (!todo) return res.status(404).json({ error: 'Todo not found' });
    res.json({ ...todo, tags: JSON.parse(todo.tags), completed: !!todo.completed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/todos - 创建待办
router.post('/', (req, res) => {
  try {
    const { title, description = '', priority = 'medium', due_date = null, tags = [] } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const id = uuidv4();
    const now = new Date().toISOString();
    const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM todos').get();
    const sortOrder = (maxOrder.m || 0) + 1;

    db.prepare(
      'INSERT INTO todos (id, title, description, completed, priority, due_date, tags, sort_order, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?)'
    ).run(id, title, description, priority, due_date, JSON.stringify(tags), sortOrder, now, now);

    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
    res.status(201).json({ ...todo, tags: JSON.parse(todo.tags), completed: !!todo.completed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/todos/:id - 更新待办
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Todo not found' });

    const { title, description, completed, priority, due_date, tags, sort_order } = req.body;
    const now = new Date().toISOString();

    db.prepare(
      'UPDATE todos SET title=?, description=?, completed=?, priority=?, due_date=?, tags=?, sort_order=?, updated_at=? WHERE id=?'
    ).run(
      title !== undefined ? title : existing.title,
      description !== undefined ? description : existing.description,
      completed !== undefined ? (completed ? 1 : 0) : existing.completed,
      priority !== undefined ? priority : existing.priority,
      due_date !== undefined ? due_date : existing.due_date,
      tags !== undefined ? JSON.stringify(tags) : existing.tags,
      sort_order !== undefined ? sort_order : existing.sort_order,
      now,
      req.params.id
    );

    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
    res.json({ ...todo, tags: JSON.parse(todo.tags), completed: !!todo.completed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/todos/:id/complete - 快速切换完成状态
router.patch('/:id/complete', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Todo not found' });

    const newCompleted = !existing.completed;
    const now = new Date().toISOString();
    db.prepare('UPDATE todos SET completed=?, updated_at=? WHERE id=?').run(
      newCompleted ? 1 : 0,
      now,
      req.params.id
    );

    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
    res.json({ ...todo, tags: JSON.parse(todo.tags), completed: !!todo.completed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/todos/:id
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Todo not found' });
    db.prepare('DELETE FROM todos WHERE id = ?').run(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
