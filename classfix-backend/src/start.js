/**
 * Production startup script.
 * Seeds the database the first time (when no users exist), then starts the server.
 */
import { applySchema, getDb, closeDb } from './db/index.js';
import { seed } from './db/seed.js';

applySchema();

const db = getDb();
const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;

if (userCount === 0) {
  console.log('Fresh database detected — seeding demo data...');
  const counts = seed(db);
  console.log(`Seeded: ${counts.users} users, ${counts.requests} requests, ${counts.notifications} notifications`);
}

closeDb();

// Hand off to the real server
import('./server.js');
