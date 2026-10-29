import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config, ROOT } from '../config.js';

let instance = null;

/**
 * Opens (or creates) the SQLite database and applies the pragmas that make it
 * behave sensibly: foreign keys enforced, write-ahead logging for concurrent
 * reads, and a busy timeout so a brief lock does not surface as an error.
 */
export function getDb() {
  if (instance) return instance;

  const inMemory = config.databaseFile === ':memory:';
  if (!inMemory) {
    fs.mkdirSync(path.dirname(config.databaseFile), { recursive: true });
  }

  instance = new Database(config.databaseFile);
  instance.pragma('foreign_keys = ON');
  instance.pragma('busy_timeout = 5000');
  if (!inMemory) instance.pragma('journal_mode = WAL');

  return instance;
}

/** Applies schema.sql. Safe to run repeatedly — every statement is IF NOT EXISTS. */
export function applySchema(db = getDb()) {
  const sql = fs.readFileSync(path.join(ROOT, 'src', 'db', 'schema.sql'), 'utf8');
  db.exec(sql);

  db.prepare('INSERT OR IGNORE INTO request_sequence (id, next_value) VALUES (1, 1001)').run();
  return db;
}

/** Drops every table so a reset starts from nothing. */
export function dropAll(db = getDb()) {
  db.pragma('foreign_keys = OFF');
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all();
  const triggers = db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger'").all();

  for (const { name } of triggers) db.exec(`DROP TRIGGER IF EXISTS "${name}"`);
  for (const { name } of tables) db.exec(`DROP TABLE IF EXISTS "${name}"`);

  db.pragma('foreign_keys = ON');
  return db;
}

/**
 * Reserves the next request code. Called inside the same transaction as the
 * insert, so two simultaneous submissions can never receive the same code.
 */
export function nextRequestCode(db = getDb()) {
  const row = db.prepare('SELECT next_value FROM request_sequence WHERE id = 1').get();
  const value = row?.next_value ?? 1001;
  db.prepare('UPDATE request_sequence SET next_value = ? WHERE id = 1').run(value + 1);
  return `CF-${value}`;
}

export function closeDb() {
  if (instance) {
    instance.close();
    instance = null;
  }
}
