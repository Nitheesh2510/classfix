import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { getDb } from '../db/index.js';
import { ROLES } from '../domain/constants.js';
import { actionsFor, authorizeAction } from '../domain/workflow.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncRoute, badRequest, forbidden, notFound } from '../middleware/errors.js';
import { queryOf, validate } from '../middleware/validate.js';
import {
  canView,
  getAttachments,
  getRequestRow,
  listAllVisible,
  listRequests,
  serializeRequest,
} from '../repositories/requestRepo.js';
import {
  addComment,
  applyAction,
  attachPhoto,
  createRequest,
  toggleUpvote,
} from '../services/requestService.js';
import {
  actionSchema,
  commentSchema,
  createRequestSchema,
  listRequestsSchema,
} from './schemas.js';

export const requestRoutes = Router();

requestRoutes.use(requireAuth);

/* ------------------------------------------------------------- uploads */

fs.mkdirSync(config.uploadDir, { recursive: true });

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, config.uploadDir),
    filename: (req, file, cb) => {
      // Never trust the client filename on disk — generate our own.
      const ext = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' }[
        file.mimetype
      ] ?? '.bin';
      cb(null, `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${ext}`);
    },
  }),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(badRequest('Only PNG, JPEG, WebP or GIF images can be attached.'));
    }
    return cb(null, true);
  },
});

/* -------------------------------------------------------------- routes */

/** GET /api/requests — filtered, sorted, paginated list. */
requestRoutes.get(
  '/',
  validate(listRequestsSchema, 'query'),
  asyncRoute((req, res) => {
    res.json(listRequests(req.user, queryOf(req)));
  }),
);

/**
 * GET /api/requests/all — every request the caller may see, unpaginated.
 * The frontend loads this once so its existing client-side dashboards and
 * filters keep working without a round trip per keystroke.
 */
requestRoutes.get(
  '/all',
  asyncRoute((req, res) => {
    res.json({ items: listAllVisible(req.user) });
  }),
);

/** POST /api/requests — raise a new request. */
requestRoutes.post(
  '/',
  requireRole(ROLES.STUDENT, ROLES.FACULTY),
  validate(createRequestSchema),
  asyncRoute((req, res) => {
    res.status(201).json({ request: createRequest(req.body, req.user) });
  }),
);

/** GET /api/requests/:id — full detail including history and comments. */
requestRoutes.get(
  '/:id',
  asyncRoute((req, res) => {
    const row = getRequestRow(req.params.id);
    if (!row) throw notFound(`No request with the ID ${req.params.id}.`);
    if (!canView(req.user, row)) throw forbidden('You cannot view that request.');

    const request = serializeRequest(row, { detail: true });

    // Tell the client which actions this user may actually take, so the UI
    // never offers a button the server would refuse.
    const available = actionsFor(req.user.role, row.status)
      .filter((action) => authorizeAction(action, row, req.user).ok)
      .map((action) => ({
        id: action.id,
        label: action.label,
        requiresReason: Boolean(action.requiresReason),
        requiresDepartment: Boolean(action.requiresDepartment),
        allowsDueDate: Boolean(action.allowsDueDate),
        allowsEvidence: Boolean(action.allowsEvidence),
      }));

    res.json({ request, availableActions: available });
  }),
);

/** POST /api/requests/:id/actions — apply a workflow transition. */
requestRoutes.post(
  '/:id/actions',
  validate(actionSchema),
  asyncRoute((req, res) => {
    const { action, ...input } = req.body;
    const request = applyAction(req.params.id, action, input, req.user);
    res.json({ request });
  }),
);

/** POST /api/requests/:id/comments */
requestRoutes.post(
  '/:id/comments',
  validate(commentSchema),
  asyncRoute((req, res) => {
    res.status(201).json({ request: addComment(req.params.id, req.body.body, req.user) });
  }),
);

/** POST /api/requests/:id/upvote — toggles the caller's vote. */
requestRoutes.post(
  '/:id/upvote',
  asyncRoute((req, res) => {
    res.json(toggleUpvote(req.params.id, req.user));
  }),
);

/** POST /api/requests/:id/photos — attach one image. */
requestRoutes.post(
  '/:id/photos',
  upload.single('photo'),
  asyncRoute((req, res) => {
    if (!req.file) throw badRequest('Attach an image in the "photo" field.');
    const created = attachPhoto(req.params.id, req.file, req.user);
    res.status(201).json({
      attachment: created,
      request: serializeRequest(getRequestRow(req.params.id), { detail: true }),
    });
  }),
);

/** GET /api/requests/:id/attachments/:attachmentId — serve a stored file. */
requestRoutes.get(
  '/:id/attachments/:attachmentId',
  asyncRoute((req, res) => {
    const row = getRequestRow(req.params.id);
    if (!row) throw notFound('No such request.');
    if (!canView(req.user, row)) throw forbidden('You cannot view that request.');

    const attachment = getAttachments(req.params.id).find(
      (item) => String(item.id) === req.params.attachmentId,
    );
    if (!attachment) throw notFound('No such attachment.');

    if (attachment.kind === 'evidence') {
      return res.json({
        label: attachment.label,
        note: attachment.note,
        at: attachment.created_at,
      });
    }

    // Resolve inside the upload directory and confirm it stayed there.
    const filePath = path.resolve(config.uploadDir, attachment.filename);
    if (!filePath.startsWith(path.resolve(config.uploadDir) + path.sep)) {
      throw forbidden('Invalid attachment path.');
    }
    if (!fs.existsSync(filePath)) throw notFound('That file is no longer on disk.');

    res.type(attachment.mime_type);
    return res.sendFile(filePath);
  }),
);

/** GET /api/requests/meta/workflow — the workflow table, for reference. */
requestRoutes.get(
  '/meta/workflow',
  asyncRoute((req, res) => {
    const db = getDb();
    const counts = db
      .prepare('SELECT status, COUNT(*) AS n FROM requests GROUP BY status')
      .all();
    res.json({ role: req.user.role, statusCounts: counts });
  }),
);
