import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { applySchema, getDb } from './db/index.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import {
  CATEGORY_VALUES,
  PRIORITY_VALUES,
  ROLE_VALUES,
  ROOM_TYPE_VALUES,
  STATUS_LABELS,
  STATUS_VALUES,
} from './domain/constants.js';
import { WORKFLOW_ACTIONS } from './domain/workflow.js';
import { authRoutes } from './routes/auth.routes.js';
import { requestRoutes } from './routes/requests.routes.js';
import { locationRoutes } from './routes/locations.routes.js';
import { announcementRoutes, notificationRoutes } from './routes/notifications.routes.js';
import { statsRoutes } from './routes/stats.routes.js';
import { userRoutes } from './routes/users.routes.js';

/**
 * Builds the Express application. Exported separately from the server so tests
 * can mount it without binding a port.
 */
export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin and tooling requests arrive without an Origin header.
        if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));

  // Conservative defaults; this API serves JSON and stored images only.
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('X-Frame-Options', 'DENY');
    next();
  });

  /** Liveness probe, and a quick way to confirm the database is reachable. */
  app.get('/api/health', (req, res) => {
    const requests = getDb().prepare('SELECT COUNT(*) AS n FROM requests').get().n;
    res.json({
      status: 'ok',
      env: config.env,
      time: new Date().toISOString(),
      requests,
    });
  });

  /**
   * The domain vocabulary, so a client never has to hard-code it.
   * The frontend uses its own copy for labels, but this keeps the two
   * checkable against each other.
   */
  app.get('/api/meta', (req, res) => {
    res.json({
      roles: ROLE_VALUES,
      statuses: STATUS_VALUES.map((id) => ({ id, label: STATUS_LABELS[id] })),
      categories: CATEGORY_VALUES,
      priorities: PRIORITY_VALUES,
      roomTypes: ROOM_TYPE_VALUES,
      workflow: WORKFLOW_ACTIONS.map((action) => ({
        id: action.id,
        label: action.label,
        role: action.role,
        from: action.from,
        to: action.to,
        requiresReason: Boolean(action.requiresReason),
        requiresDepartment: Boolean(action.requiresDepartment),
        allowsDueDate: Boolean(action.allowsDueDate),
        allowsEvidence: Boolean(action.allowsEvidence),
        ownerOnly: Boolean(action.ownerOnly),
        departmentOnly: Boolean(action.departmentOnly),
      })),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/requests', requestRoutes);
  app.use('/api/locations', locationRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/announcements', announcementRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/users', userRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/** Ensures the schema exists before the first request is served. */
export function prepareDatabase() {
  applySchema(getDb());
}
