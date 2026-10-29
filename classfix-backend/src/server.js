import { createApp, prepareDatabase } from './app.js';
import { config, usingDevSecret } from './config.js';
import { closeDb, getDb } from './db/index.js';

prepareDatabase();

const app = createApp();
const server = app.listen(config.port, () => {
  const requests = getDb().prepare('SELECT COUNT(*) AS n FROM requests').get().n;
  const users = getDb().prepare('SELECT COUNT(*) AS n FROM users').get().n;

  console.log(`ClassFix API listening on http://localhost:${config.port}`);
  console.log(`  environment  ${config.env}`);
  console.log(`  database     ${config.databaseFile}`);
  console.log(`  records      ${users} users, ${requests} requests`);
  console.log(`  cors origins ${config.corsOrigins.join(', ')}`);

  if (users === 0) {
    console.log('\nThe database is empty. Run "npm run db:seed" to load the demo data.');
  }
  if (usingDevSecret) {
    console.log('\nNote: using the built-in development JWT secret.');
    console.log('Set JWT_SECRET in .env before deploying anywhere real.');
  }
});

/** Finish in-flight requests, then close the database cleanly. */
function shutdown(signal) {
  console.log(`\n${signal} received, shutting down.`);
  server.close(() => {
    closeDb();
    process.exit(0);
  });
  // Do not hang forever if a connection refuses to close.
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
