import { z } from 'zod';
import {
  CATEGORY_VALUES,
  NOTIFICATION_TYPE_VALUES,
  PRIORITY_VALUES,
  ROOM_TYPE_VALUES,
  STATUS_VALUES,
} from '../domain/constants.js';

/** Request body and query schemas. Every endpoint validates before it acts. */

const trimmed = (min, max, label) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be at most ${max} characters.`);

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD.')
  .optional()
  .nullable();

/* -------------------------------------------------------------- auth */

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export const registerSchema = z.object({
  name: trimmed(2, 80, 'Name'),
  email: z.string().trim().email('Enter a valid email address.'),
  password: trimmed(8, 128, 'Password'),
  // Self-registration is limited to students; staff accounts are created by an admin.
  role: z.literal('student').default('student'),
  className: trimmed(2, 80, 'Class').optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.'),
  newPassword: trimmed(8, 128, 'New password'),
});

/* ----------------------------------------------------------- requests */

export const createRequestSchema = z.object({
  title: trimmed(6, 120, 'Title'),
  description: trimmed(15, 2000, 'Description'),
  roomId: z.string().trim().min(1, 'Choose a room.'),
  category: z.enum(CATEGORY_VALUES),
  priority: z.enum(PRIORITY_VALUES),
});

export const actionSchema = z.object({
  action: z.string().trim().min(1, 'Name the action to apply.'),
  reason: z.string().trim().max(1000).optional(),
  departmentId: z.string().trim().min(1).optional().nullable(),
  expectedCompletion: optionalDate,
  evidence: z
    .object({
      label: z.string().trim().max(120).optional(),
      note: z.string().trim().max(1000).optional(),
    })
    .optional()
    .nullable(),
});

export const commentSchema = z.object({
  body: trimmed(1, 1000, 'Comment'),
});

export const listRequestsSchema = z.object({
  search: z.string().trim().max(120).optional(),
  buildingId: z.string().trim().optional(),
  floorId: z.string().trim().optional(),
  roomId: z.string().trim().optional(),
  category: z.enum(CATEGORY_VALUES).optional(),
  priority: z.enum(PRIORITY_VALUES).optional(),
  status: z.enum([...STATUS_VALUES, 'overdue']).optional(),
  departmentId: z.string().trim().optional(),
  reportedBy: z.string().trim().optional(),
  from: optionalDate,
  to: optionalDate,
  sort: z.enum(['newest', 'oldest', 'priority', 'updated']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

/* ---------------------------------------------------------- locations */

export const buildingSchema = z.object({
  name: trimmed(2, 60, 'Building name'),
  code: trimmed(1, 4, 'Code'),
  description: z.string().trim().max(200).optional(),
});

export const floorSchema = z.object({
  buildingId: z.string().trim().min(1, 'Choose a building.'),
  name: trimmed(2, 40, 'Floor name'),
  level: z.coerce.number().int().min(0).max(60),
});

export const roomSchema = z.object({
  floorId: z.string().trim().min(1, 'Choose a floor.'),
  number: trimmed(1, 10, 'Room number'),
  name: z.string().trim().max(60).optional().nullable(),
  type: z.enum(ROOM_TYPE_VALUES),
  capacity: z.coerce.number().int().min(0).max(1000).default(0),
});

export const departmentSchema = z.object({
  name: trimmed(2, 60, 'Department name'),
  code: trimmed(1, 4, 'Code'),
  contact: z.union([z.string().trim().email('Enter a valid email address.'), z.literal('')]).optional(),
  headUserId: z.string().trim().min(1).optional().nullable(),
});

/* ------------------------------------------------------ notifications */

export const listNotificationsSchema = z.object({
  type: z.enum(NOTIFICATION_TYPE_VALUES).optional(),
  read: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  limit: z.coerce.number().int().min(1).max(300).default(100),
});

export const setReadSchema = z.object({
  read: z.boolean().default(true),
});

/* --------------------------------------------------------------- stats */

export const statsQuerySchema = z.object({
  buildingId: z.string().trim().optional(),
  floorId: z.string().trim().optional(),
  departmentId: z.string().trim().optional(),
  days: z.coerce.number().int().min(1).max(3650).optional(),
  months: z.coerce.number().int().min(1).max(24).default(6),
});
