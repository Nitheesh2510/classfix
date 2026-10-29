import { Router } from 'express';
import { rateLimit, requireAuth } from '../middleware/auth.js';
import { config } from '../config.js';
import { asyncRoute } from '../middleware/errors.js';
import { validate } from '../middleware/validate.js';
import { changePassword, login, publicUser, register } from '../services/authService.js';
import { getDb } from '../db/index.js';
import { changePasswordSchema, loginSchema, registerSchema } from './schemas.js';

export const authRoutes = Router();

/** POST /api/auth/login — exchange credentials for a bearer token. */
authRoutes.post(
  '/login',
  rateLimit(config.loginRateLimit),
  validate(loginSchema),
  asyncRoute((req, res) => {
    const result = login(req.body.email, req.body.password);
    res.json(result);
  }),
);

/** POST /api/auth/register — self-registration, students only. */
authRoutes.post(
  '/register',
  rateLimit({ ...config.loginRateLimit, max: Math.max(5, Math.floor(config.loginRateLimit.max / 2)) }),
  validate(registerSchema),
  asyncRoute((req, res) => {
    const result = register({ ...req.body, title: 'Student' });
    res.status(201).json(result);
  }),
);

/** GET /api/auth/me — the signed-in account, re-read from the database. */
authRoutes.get(
  '/me',
  requireAuth,
  asyncRoute((req, res) => {
    const row = getDb().prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json({ user: publicUser(row) });
  }),
);

/** POST /api/auth/password — change your own password. */
authRoutes.post(
  '/password',
  requireAuth,
  validate(changePasswordSchema),
  asyncRoute((req, res) => {
    changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    res.json({ ok: true, message: 'Password updated.' });
  }),
);
