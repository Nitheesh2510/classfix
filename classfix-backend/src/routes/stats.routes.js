import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncRoute } from '../middleware/errors.js';
import { queryOf, validate } from '../middleware/validate.js';
import * as stats from '../services/statsService.js';
import { statsQuerySchema } from './schemas.js';

export const statsRoutes = Router();

statsRoutes.use(requireAuth);
statsRoutes.use(validate(statsQuerySchema, 'query'));

/**
 * GET /api/stats/summary — headline counts for the dashboards.
 * Everything here is scoped to what the caller may see, in SQL.
 */
statsRoutes.get(
  '/summary',
  asyncRoute((req, res) => {
    res.json(stats.summary(req.user, queryOf(req)));
  }),
);

/** GET /api/stats/breakdown — every grouping the charts need, in one call. */
statsRoutes.get(
  '/breakdown',
  asyncRoute((req, res) => {
    const filters = queryOf(req);
    res.json({
      byStatus: stats.byStatus(req.user, filters),
      byCategory: stats.byCategory(req.user, filters),
      byBuilding: stats.byBuilding(req.user, filters),
      byFloor: stats.byFloor(req.user, filters),
      byDepartment: stats.byDepartment(req.user, filters),
      monthlyTrend: stats.monthlyTrend(req.user, filters, filters.months ?? 6),
    });
  }),
);

/** GET /api/stats/dashboard — summary, charts, overdue list and activity. */
statsRoutes.get(
  '/dashboard',
  asyncRoute((req, res) => {
    const filters = queryOf(req);
    res.json({
      summary: stats.summary(req.user, filters),
      byStatus: stats.byStatus(req.user, filters),
      byCategory: stats.byCategory(req.user, filters),
      byBuilding: stats.byBuilding(req.user, filters),
      byDepartment: stats.byDepartment(req.user, filters),
      monthlyTrend: stats.monthlyTrend(req.user, filters, filters.months ?? 6),
      overdue: stats.overdueList(req.user, 10),
      recentActivity: stats.recentActivity(req.user, 8),
    });
  }),
);

/** GET /api/stats/slowest — closed requests that took the longest. */
statsRoutes.get(
  '/slowest',
  asyncRoute((req, res) => {
    res.json({ items: stats.slowestResolved(req.user, queryOf(req), 5) });
  }),
);
