/**
 * Creates the database and applies the schema.
 *
 *   node src/db/migrate.js            apply schema (safe to re-run)
 *   node src/db/migrate.js --fresh    drop everything first
 */
import { config } from '../config.js';
import { applySchema, closeDb, dropAll, getDb } from './index.js';

const fresh = process.argv.includes('--fresh');
const db = getDb();

if (fresh) {
  dropAll(db);
  console.log('Dropped all existing tables.');
}

applySchema(db);

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map((row) => row.name);

console.log(`Schema applied to ${config.databaseFile}`);
console.log(`Tables (${tables.length}): ${tables.join(', ')}`);

closeDb();
