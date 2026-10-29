import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {
  ACCOUNTS,
  PASSWORD,
  get,
  post,
  startTestServer,
  stopTestServer,
  tokenFor,
} from './helpers.js';

before(startTestServer);
after(stopTestServer);

describe('authentication', () => {
  it('signs in a seeded account and returns a usable token', async () => {
    const { status, body } = await post('/api/auth/login', {
      email: ACCOUNTS.student,
      password: PASSWORD,
    });

    assert.equal(status, 200);
    assert.ok(body.token, 'expected a token');
    assert.equal(body.user.email, ACCOUNTS.student);
    assert.equal(body.user.role, 'student');
    assert.ok(!('password_hash' in body.user), 'password hash must never be returned');

    const me = await get('/api/auth/me', body.token);
    assert.equal(me.status, 200);
    assert.equal(me.body.user.id, body.user.id);
  });

  it('rejects a wrong password', async () => {
    const { status } = await post('/api/auth/login', {
      email: ACCOUNTS.student,
      password: 'not-the-password',
    });
    assert.equal(status, 401);
  });

  it('does not reveal whether an email exists', async () => {
    const unknown = await post('/api/auth/login', {
      email: 'nobody@example-college.demo',
      password: 'whatever',
    });
    const wrongPassword = await post('/api/auth/login', {
      email: ACCOUNTS.student,
      password: 'whatever',
    });

    assert.equal(unknown.status, wrongPassword.status);
    assert.equal(unknown.body.error.message, wrongPassword.body.error.message);
  });

  it('refuses requests with no token, a malformed token, or a forged signature', async () => {
    assert.equal((await get('/api/requests')).status, 401);
    assert.equal((await get('/api/requests', 'not-a-jwt')).status, 401);

    const forged = jwt.sign({ sub: 'usr-admin-1', role: 'admin' }, 'the-wrong-secret');
    assert.equal((await get('/api/requests', forged)).status, 401);
  });

  it('refuses an expired token', async () => {
    const expired = jwt.sign({ sub: 'usr-student-1', role: 'student' }, process.env.JWT_SECRET, {
      expiresIn: '-1s',
    });
    const { status, body } = await get('/api/requests', expired);
    assert.equal(status, 401);
    assert.match(body.error.message, /expired/i);
  });

  it('ignores a role claimed in the token and uses the stored role', async () => {
    // A correctly signed token whose role claim says admin, for a student.
    const tampered = jwt.sign({ sub: 'usr-student-1', role: 'admin' }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    const me = await get('/api/auth/me', tampered);
    assert.equal(me.status, 200);
    assert.equal(me.body.user.role, 'student', 'role must come from the database, not the token');

    // And the elevated claim grants nothing: creating a building is staff-only.
    const attempt = await post(
      '/api/locations/buildings',
      { name: 'Smuggled Block', code: 'SM' },
      tampered,
    );
    assert.equal(attempt.status, 403);
  });

  it('validates the login payload', async () => {
    const { status, body } = await post('/api/auth/login', { email: 'not-an-email' });
    assert.equal(status, 400);
    assert.ok(Array.isArray(body.error.details));
  });

  it('registers a new student and lets them sign in', async () => {
    const created = await post('/api/auth/register', {
      name: 'Test Student',
      email: `test-${Date.now()}@example-college.demo`,
      password: 'a-long-enough-password',
      className: 'IT — 1st Year',
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.user.role, 'student');

    const me = await get('/api/auth/me', created.body.token);
    assert.equal(me.status, 200);
  });

  it('refuses a duplicate email and a self-assigned staff role', async () => {
    const duplicate = await post('/api/auth/register', {
      name: 'Imposter',
      email: ACCOUNTS.student,
      password: 'a-long-enough-password',
    });
    assert.equal(duplicate.status, 409);

    // The schema pins role to 'student', so asking for faculty is rejected.
    const escalation = await post('/api/auth/register', {
      name: 'Would-be Advisor',
      email: `escalate-${Date.now()}@example-college.demo`,
      password: 'a-long-enough-password',
      role: 'faculty',
    });
    assert.equal(escalation.status, 400);
  });

  it('rejects a short password', async () => {
    const { status } = await post('/api/auth/register', {
      name: 'Short Password',
      email: `short-${Date.now()}@example-college.demo`,
      password: 'abc',
    });
    assert.equal(status, 400);
  });

  it('changes a password and invalidates the old one', async () => {
    const email = `rotate-${Date.now()}@example-college.demo`;
    const created = await post('/api/auth/register', {
      name: 'Rotate Me',
      email,
      password: 'first-password-value',
    });

    const changed = await post(
      '/api/auth/password',
      { currentPassword: 'first-password-value', newPassword: 'second-password-value' },
      created.body.token,
    );
    assert.equal(changed.status, 200);

    assert.equal((await post('/api/auth/login', { email, password: 'first-password-value' })).status, 401);
    assert.equal((await post('/api/auth/login', { email, password: 'second-password-value' })).status, 200);
  });

  it('refuses a password change without the current password', async () => {
    const token = await tokenFor('student');
    const { status } = await post(
      '/api/auth/password',
      { currentPassword: 'wrong-current', newPassword: 'brand-new-password' },
      token,
    );
    assert.equal(status, 401);
  });
});
