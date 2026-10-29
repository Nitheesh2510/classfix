import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { getDb } from '../db/index.js';
import { forbidden, unauthorized } from './errors.js';

/**
 * Verifies the bearer token and loads the current user from the database.
 *
 * The user is re-read on every request rather than trusted from the token, so
 * deactivating an account or changing its role takes effect immediately
 * instead of when the token happens to expire.
 */
export function requireAuth(req, res, next) {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return next(unauthorized('Provide a bearer token in the Authorization header.'));
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch (error) {
    const message =
      error?.name === 'TokenExpiredError'
        ? 'Your session has expired. Please sign in again.'
        : 'That token is not valid.';
    return next(unauthorized(message));
  }

  const user = getDb()
    .prepare(
      `SELECT id, name, email, role, title, class_name, department_id, active
         FROM users WHERE id = ?`,
    )
    .get(payload.sub);

  if (!user) return next(unauthorized('That account no longer exists.'));
  if (!user.active) return next(forbidden('That account has been deactivated.'));

  req.user = user;
  return next();
}

/** Restricts a route to the listed roles. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (req.user.role === 'admin' || roles.includes(req.user.role)) return next();
    return next(
      forbidden(
        `This action is limited to: ${roles.join(', ')}. You are signed in as ${req.user.role}.`,
      ),
    );
  };
}

/**
 * Small in-memory throttle for the login route, so the demo cannot be
 * brute-forced from a loop. Resets on restart, which is fine at this scale.
 */
export function rateLimit({ windowMs = 60_000, max = 10 } = {}) {
  const hits = new Map();

  return (req, res, next) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const record = hits.get(key);

    if (!record || now > record.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    record.count += 1;
    if (record.count > max) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: { message: `Too many attempts. Try again in ${retryAfter} seconds.` },
      });
    }

    return next();
  };
}
