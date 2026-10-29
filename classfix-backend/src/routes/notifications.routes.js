import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncRoute, notFound } from '../middleware/errors.js';
import { queryOf, validate } from '../middleware/validate.js';
import {
  listAnnouncements,
  listForUser,
  markAllRead,
  setRead,
  unreadCount,
} from '../services/notificationService.js';
import { listNotificationsSchema, setReadSchema } from './schemas.js';

export const notificationRoutes = Router();

notificationRoutes.use(requireAuth);

/** GET /api/notifications — the caller's own inbox. */
notificationRoutes.get(
  '/',
  validate(listNotificationsSchema, 'query'),
  asyncRoute((req, res) => {
    const query = queryOf(req);
    res.json({
      items: listForUser(req.user.id, query),
      unread: unreadCount(req.user.id),
    });
  }),
);

/** PATCH /api/notifications/:id — mark one read or unread. */
notificationRoutes.patch(
  '/:id',
  validate(setReadSchema),
  asyncRoute((req, res) => {
    const changed = setRead(Number(req.params.id), req.user.id, req.body.read);
    if (!changed) throw notFound('No such notification in your inbox.');
    res.json({ ok: true, unread: unreadCount(req.user.id) });
  }),
);

/** POST /api/notifications/read-all */
notificationRoutes.post(
  '/read-all',
  asyncRoute((req, res) => {
    const changed = markAllRead(req.user.id);
    res.json({ ok: true, changed, unread: unreadCount(req.user.id) });
  }),
);

/** GET /api/announcements */
export const announcementRoutes = Router();
announcementRoutes.use(requireAuth);

announcementRoutes.get(
  '/',
  asyncRoute((req, res) => {
    res.json({ items: listAnnouncements() });
  }),
);
