import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { getDb } from '../db/index.js';
import { conflict, unauthorized } from '../middleware/errors.js';

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, config.bcryptRounds);
}

export function issueToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    title: row.title,
    className: row.class_name,
    departmentId: row.department_id,
  };
}

/**
 * Verifies credentials. The same message is returned whether the email is
 * unknown or the password is wrong, so the endpoint cannot be used to discover
 * which accounts exist. A dummy comparison keeps the timing similar too.
 */
export function login(email, password, db = getDb()) {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim());

  if (!row) {
    bcrypt.compareSync(password, '$2b$04$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
    throw unauthorized('That email and password combination is not recognised.');
  }

  if (!bcrypt.compareSync(password, row.password_hash)) {
    throw unauthorized('That email and password combination is not recognised.');
  }

  if (!row.active) throw unauthorized('That account has been deactivated.');

  return { token: issueToken(row), user: publicUser(row) };
}

export function register(input, db = getDb()) {
  const existing = db.prepare('SELECT 1 FROM users WHERE email = ?').get(input.email.trim());
  if (existing) throw conflict('An account with that email already exists.');

  const id = `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, title, class_name, department_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.name.trim(),
    input.email.trim(),
    hashPassword(input.password),
    input.role,
    input.title?.trim() ?? null,
    input.className?.trim() ?? null,
    input.departmentId ?? null,
    new Date().toISOString(),
  );

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return { token: issueToken(row), user: publicUser(row) };
}

export function changePassword(userId, currentPassword, newPassword, db = getDb()) {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!row) throw unauthorized('That account no longer exists.');
  if (!bcrypt.compareSync(currentPassword, row.password_hash)) {
    throw unauthorized('Your current password is not correct.');
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
    hashPassword(newPassword),
    userId,
  );
}
