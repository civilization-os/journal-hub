const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/stats - 统计概览
router.get('/', (req, res) => {
  try {
    const totalJournals = db.prepare('SELECT COUNT(*) as count FROM journals').get();
    const totalTodos = db.prepare('SELECT COUNT(*) as count FROM todos').get();
    const completedTodos = db.prepare('SELECT COUNT(*) as count FROM todos WHERE completed = 1').get();
    const totalEvents = db.prepare('SELECT COUNT(*) as count FROM calendar_events').get();
    const recentJournals = db.prepare('SELECT id, title, content, mood, tags, date, created_at FROM journals ORDER BY created_at DESC LIMIT 5').all();
    const pendingTodos = db.prepare('SELECT * FROM todos WHERE completed = 0 ORDER BY sort_order ASC LIMIT 5').all();
    const todayStr = new Date().toISOString().substring(0, 10);
    const todayJournals = db.prepare('SELECT COUNT(*) as count FROM journals WHERE date = ?').get(todayStr);
    const todayTodos = db.prepare('SELECT COUNT(*) as count FROM todos WHERE due_date = ?').get(todayStr);

    res.json({
      data: {
        journals: { total: totalJournals.count, today: todayJournals.count },
        todos: { total: totalTodos.count, completed: completedTodos.count, pending: totalTodos.count - completedTodos.count, today: todayTodos.count },
        events: { total: totalEvents.count },
        recent_journals: recentJournals.map(j => ({ ...j, tags: j.tags ? JSON.parse(j.tags) : [] })),
        pending_todos: pendingTodos.map(t => {
          let parsedTags = [];
          try { parsedTags = t.tags ? JSON.parse(t.tags) : []; } catch (e) {}
          return { ...t, tags: parsedTags, completed: !!t.completed };
        }),
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
