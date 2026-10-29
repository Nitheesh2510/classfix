import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { rateLimit } from '../src/middleware/auth.js';

/**
 * The login throttle is raised under test so the rest of the suite can sign in
 * freely, so it is exercised here in isolation against a tiny app.
 */
describe('rate limiting', () => {
  async function appWith(options) {
    const app = express();
    app.post('/try', rateLimit(options), (req, res) => res.json({ ok: true }));

    const server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const base = `http://127.0.0.1:${server.address().port}`;

    return {
      hit: () => fetch(`${base}/try`, { method: 'POST' }),
      close: () => new Promise((resolve) => server.close(resolve)),
    };
  }

  it('allows requests up to the limit and refuses the next one', async () => {
    const { hit, close } = await appWith({ windowMs: 60_000, max: 3 });

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await hit();
      assert.equal(response.status, 200, `attempt ${attempt} should be allowed`);
    }

    const blocked = await hit();
    assert.equal(blocked.status, 429);
    assert.ok(blocked.headers.get('retry-after'), 'should say when to retry');

    const body = await blocked.json();
    assert.match(body.error.message, /Too many attempts/);

    await close();
  });

  it('lets requests through again once the window has passed', async () => {
    // A 50 ms window keeps the test fast while still exercising the reset.
    const { hit, close } = await appWith({ windowMs: 50, max: 1 });

    assert.equal((await hit()).status, 200);
    assert.equal((await hit()).status, 429);

    await new Promise((resolve) => setTimeout(resolve, 70));
    assert.equal((await hit()).status, 200, 'the window should have reset');

    await close();
  });
});
