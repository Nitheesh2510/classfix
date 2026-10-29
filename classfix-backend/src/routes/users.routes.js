import { Router } from 'express';
import { getDb } from '../db/index.js';
import { ROLES } from '../domain/constants.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/errors.js';

export const userRoutes = Router();

userRoutes.use(requireAuth);

/**
 * GET /api/users — directory of accounts.
 *
 * Limited to staff, and deliberately narrow: names, roles and departments
 * only. Email addresses are not listed here, so the endpoint cannot be used
 * to harvest contact details.
 */
userRoutes.get(
  '/',
  requireRole(ROLES.FACULTY, ROLES.OFFICIAL),
  asyncRoute((req, res) => {
    const items = getDb()
      .prepare(
        `SELECT u.id, u.name, u.role, u.title, u.class_name, u.department_id, d.name AS department_name
           FROM users u
           LEFT JOIN departments d ON d.id = u.department_id
          WHERE u.active = 1
          ORDER BY u.role, u.name`,
      )
      .all()
      .map((row) => ({
        id: row.id,
        name: row.name,
        role: row.role,
        title: row.title,
        className: row.class_name,
        departmentId: row.department_id,
        departmentName: row.department_name,
      }));

    res.json({ items });
  }),
);

/** GET /api/users/officials — candidates for department head selectors. */
userRoutes.get(
  '/officials',
  requireRole(ROLES.FACULTY, ROLES.OFFICIAL),
  asyncRoute((req, res) => {
    const items = getDb()
      .prepare(
        `SELECT id, name, title, department_id FROM users
          WHERE role = 'official' AND active = 1 ORDER BY name`,
      )
      .all()
      .map((row) => ({
        id: row.id,
        name: row.name,
        title: row.title,
        departmentId: row.department_id,
      }));

    res.json({ items });
  }),
);
