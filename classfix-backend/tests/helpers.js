/**
 * Test harness. Each test file gets its own temporary database file, seeded
 * fresh, so tests never interfere with each other or with the dev database.
 *
 * NODE_ENV and DATABASE_FILE are set before any src/ module is imported,
 * because config.js reads them at import time.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classfix-test-'));

process.env.NODE_ENV = 'test';
process.env.DATABASE_FILE = path.join(tmpDir, `test-${process.pid}.db`);
process.env.UPLOAD_DIR = path.join(tmpDir, 'uploads');
process.env.JWT_SECRET = 'test-secret-value-for-the-suite';
process.env.SEED_PASSWORD = 'classfix123';

const { createApp } = await import('../src/app.js');
const { seed } = await import('../src/db/seed.js');
const { closeDb, getDb } = await import('../src/db/index.js');

export const PASSWORD = 'classfix123';

export const ACCOUNTS = {
  student: 'aarthi@example-college.demo',
  student2: 'nikhil@example-college.demo',
  faculty: 'meera@example-college.demo',
  faculty2: 'sanjay@example-college.demo',
  maintenance: 'ravi@example-college.demo',
  electrical: 'latha@example-college.demo',
  housekeeping: 'grace@example-college.demo',
  lab: 'dinesh@example-college.demo',
  admin: 'admin@example-college.demo',
};

let server = null;
let baseUrl = null;

/** Seeds a fresh database and starts the app on an ephemeral port. */
export async function startTestServer() {
  seed(getDb());

  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  return baseUrl;
}

export async function stopTestServer() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    server = null;
  }
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

/** Re-seeds between tests that mutate data. */
export function reseed() {
  seed(getDb());
}

export { getDb };

/* --------------------------------------------------------------- client */

/** Minimal fetch wrapper returning { status, body }. */
export async function api(method, route, { token, body, raw } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body && !raw) headers['content-type'] = 'application/json';

  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers,
    body: raw ? body : body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  return { status: response.status, body: parsed };
}

export const get = (route, token) => api('GET', route, { token });
export const post = (route, body, token) => api('POST', route, { body, token });
export const put = (route, body, token) => api('PUT', route, { body, token });
export const patch = (route, body, token) => api('PATCH', route, { body, token });
export const del = (route, token) => api('DELETE', route, { token });

const tokenCache = new Map();

/**
 * Signs in and returns the bearer token, caching per account.
 * User ids survive a reseed, so a cached token stays valid.
 */
export async function tokenFor(accountKey) {
  if (tokenCache.has(accountKey)) return tokenCache.get(accountKey);

  const email = ACCOUNTS[accountKey] ?? accountKey;
  const { status, body } = await post('/api/auth/login', { email, password: PASSWORD });
  if (status !== 200) {
    throw new Error(`Login failed for ${email}: ${status} ${JSON.stringify(body)}`);
  }

  tokenCache.set(accountKey, body.token);
  return body.token;
}

/** Applies a workflow action and returns the response. */
export const doAction = (requestId, payload, token) =>
  post(`/api/requests/${requestId}/actions`, payload, token);
