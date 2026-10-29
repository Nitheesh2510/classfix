/**
 * Domain vocabulary, matching the frontend's src/constants/index.js.
 * The database CHECK constraints mirror these values, so anything not listed
 * here is rejected twice over.
 */

export const ROLES = {
  STUDENT: 'student',
  FACULTY: 'faculty',
  OFFICIAL: 'official',
  ADMIN: 'admin',
};

export const ROLE_VALUES = Object.values(ROLES);

export const STATUS = {
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  VERIFIED: 'verified',
  ASSIGNED: 'assigned',
  ACKNOWLEDGED: 'acknowledged',
  IN_PROGRESS: 'in_progress',
  AWAITING_VERIFICATION: 'awaiting_verification',
  CLOSED: 'closed',
  REJECTED: 'rejected',
  DUPLICATE: 'duplicate',
  ON_HOLD: 'on_hold',
  REOPENED: 'reopened',
};

export const STATUS_VALUES = Object.values(STATUS);

export const STATUS_LABELS = {
  [STATUS.SUBMITTED]: 'Submitted',
  [STATUS.UNDER_REVIEW]: 'Under Review',
  [STATUS.VERIFIED]: 'Verified',
  [STATUS.ASSIGNED]: 'Assigned',
  [STATUS.ACKNOWLEDGED]: 'Acknowledged',
  [STATUS.IN_PROGRESS]: 'In Progress',
  [STATUS.AWAITING_VERIFICATION]: 'Resolved — Awaiting Verification',
  [STATUS.CLOSED]: 'Closed',
  [STATUS.REJECTED]: 'Rejected',
  [STATUS.DUPLICATE]: 'Duplicate',
  [STATUS.ON_HOLD]: 'On Hold',
  [STATUS.REOPENED]: 'Reopened',
};

export const TERMINAL_STATUSES = [STATUS.CLOSED, STATUS.REJECTED, STATUS.DUPLICATE];

export const CATEGORY_VALUES = [
  'fans',
  'lights',
  'furniture',
  'projector',
  'network',
  'water',
  'cleanliness',
  'washroom',
  'lab',
  'other',
];

export const PRIORITY_VALUES = ['low', 'medium', 'high', 'urgent'];

export const ROOM_TYPE_VALUES = ['classroom', 'laboratory', 'library', 'washroom', 'other'];

export const NOTIFICATION_TYPE_VALUES = [
  'submission',
  'verification',
  'assignment',
  'status',
  'overdue',
  'resolution',
  'reopen',
];

/** Default department for each category, used when a request is forwarded. */
export const CATEGORY_DEPARTMENT = {
  fans: 'dep-electrical',
  lights: 'dep-electrical',
  furniture: 'dep-maintenance',
  projector: 'dep-it',
  network: 'dep-it',
  water: 'dep-maintenance',
  cleanliness: 'dep-housekeeping',
  washroom: 'dep-housekeeping',
  lab: 'dep-lab',
  other: 'dep-maintenance',
};
