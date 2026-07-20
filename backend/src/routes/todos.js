const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');

function normalizeProgress(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const progress = Number(value);
  if (!Number.isFinite(progress)) return fallback;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

function deriveState({ progress, status, completed }) {
  if (completed !== undefined) {
    return {
      completed: completed ? 1 : 0,
      status: completed ? 'done' : (status !== undefined ? status : 'todo'),
      progress: completed ? 100 : progress,
    };
  }

  if (status !== undefined) {
    if (status === 'done') return { completed: 1, status, progress: 100 };
    if (status === 'todo') return { completed: 0, status, progress: 0 };
    return { completed: 0, status, progress: progress === 0 ? 1 : progress };
  }

  if (progress >= 100) return { completed: 1, status: 'done', progress: 100 };
  if (progress > 0) return { completed: 0, status: 'in-progress', progress };
  return { completed: 0, status: 'todo', progress: 0 };
}

function serializeTodo(todo) {
  return { ...todo, tags: JSON.parse(todo.tags), completed: !!todo.completed };
}

// GET /api/todos - 列出待办事项
router.get('/', (req, res) => {
  try {
    const { completed, status, priority, tag, due_date, start_date, end_date, search, limit = 100, offset = 0 } = req.query;
    let query = 'SELECT * FROM todos WHERE 1=1';
    const params = [];

    if (completed !== undefined) {
      query += ' AND completed = ?';
      params.push(completed === 'true' ? 1 : 0);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
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
    if (start_date) {
      query += ' AND due_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND due_date <= ?';
      params.push(end_date);
    }
    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    query += ' ORDER BY completed ASC, sort_order ASC, created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const todos = db.prepare(query).all(...params);
    res.json({
      data: todos.map(serializeTodo),
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
    res.json(serializeTodo(todo));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/todos - 创建待办
router.post('/', (req, res) => {
  try {
    const { title, description = '', priority = 'medium', status, completed, progress, due_date, tags = [], sort_order = 0 } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const id = uuidv4();
    const now = new Date().toISOString();
    const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM todos').get();
    const finalSortOrder = sort_order !== 0 ? sort_order : (maxOrder.m || 0) + 1;
    const state = deriveState({
      progress: normalizeProgress(progress),
      status,
      completed,
    });

    db.prepare(
      'INSERT INTO todos (id, title, description, completed, status, priority, progress, due_date, tags, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, title, description, state.completed, state.status, priority, state.progress, due_date, JSON.stringify(tags), finalSortOrder, now, now);

    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
    res.status(201).json(serializeTodo(todo));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/todos/:id - 更新待办
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Todo not found' });

    const { title, description, completed, status, priority, progress, due_date, tags, sort_order } = req.body;
    const now = new Date().toISOString();

    const state = deriveState({
      progress: normalizeProgress(progress, existing.progress),
      status,
      completed,
    });

    db.prepare(
      'UPDATE todos SET title=?, description=?, completed=?, status=?, priority=?, progress=?, due_date=?, tags=?, sort_order=?, updated_at=? WHERE id=?'
    ).run(
      title !== undefined ? title : existing.title,
      description !== undefined ? description : existing.description,
      state.completed,
      state.status,
      priority !== undefined ? priority : existing.priority,
      state.progress,
      due_date !== undefined ? due_date : existing.due_date,
      tags !== undefined ? JSON.stringify(tags) : existing.tags,
      sort_order !== undefined ? sort_order : existing.sort_order,
      now,
      req.params.id
    );

    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
    res.json(serializeTodo(todo));
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
    const newStatus = newCompleted ? 'done' : 'todo';
    const newProgress = newCompleted ? 100 : 0;
    const now = new Date().toISOString();
    db.prepare('UPDATE todos SET completed=?, status=?, progress=?, updated_at=? WHERE id=?').run(
      newCompleted ? 1 : 0,
      newStatus,
      newProgress,
      now,
      req.params.id
    );

    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
    res.json(serializeTodo(todo));
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
