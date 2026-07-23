const path = require('path');
const fs = require('fs');

const Database = process.env.BETTER_SQLITE3_PATH
  ? require(process.env.BETTER_SQLITE3_PATH)
  : require('better-sqlite3');

const DB_DIR = process.env.APP_DATA_DIR
  ? path.join(process.env.APP_DATA_DIR, 'data')
  : path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'journal.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS journals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      mood TEXT DEFAULT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      completed INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      progress INTEGER NOT NULL DEFAULT 0,
      start_date TEXT DEFAULT NULL,
      due_date TEXT DEFAULT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Migration: Add status column if it doesn't exist
  try {
    const tableInfo = db.prepare("PRAGMA table_info(todos)").all();
    if (!tableInfo.find(col => col.name === 'status')) {
      db.exec("ALTER TABLE todos ADD COLUMN status TEXT NOT NULL DEFAULT 'todo'");
      // Migrate completed status to the new status column
      db.exec("UPDATE todos SET status = 'done' WHERE completed = 1");
    }
    if (!tableInfo.find(col => col.name === 'progress')) {
      db.exec("ALTER TABLE todos ADD COLUMN progress INTEGER NOT NULL DEFAULT 0");
      db.exec("UPDATE todos SET progress = 100 WHERE completed = 1");
    }
    if (!tableInfo.find(col => col.name === 'start_date')) {
      db.exec("ALTER TABLE todos ADD COLUMN start_date TEXT DEFAULT NULL");
    }
  } catch (err) {
    console.error("Migration error:", err);
  }

  db.exec(`

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      start_date TEXT NOT NULL,
      end_date TEXT DEFAULT NULL,
      all_day INTEGER NOT NULL DEFAULT 1,
      color TEXT DEFAULT 'default',
      linked_journal_id TEXT DEFAULT NULL,
      linked_todo_id TEXT DEFAULT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (linked_journal_id) REFERENCES journals(id) ON DELETE SET NULL,
      FOREIGN KEY (linked_todo_id) REFERENCES todos(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_journals_date ON journals(date);
    CREATE INDEX IF NOT EXISTS idx_journals_created_at ON journals(created_at);
    CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
    CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
    CREATE INDEX IF NOT EXISTS idx_calendar_start_date ON calendar_events(start_date);
  `);
}

initSchema();

module.exports = db;
