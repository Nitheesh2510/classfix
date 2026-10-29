/**
 * Centralized definitions for roles, request statuses, categories and priorities.
 * Every component reads labels, colours and workflow rules from here.
 */

export const APP_NAME = 'ClassFix';
export const INSTITUTION_NAME = 'Example Engineering College';
export const STORAGE_KEY = 'classfix.demo.v1';

/* ------------------------------------------------------------------ roles */

export const ROLES = {
  STUDENT: 'student',
  FACULTY: 'faculty',
  OFFICIAL: 'official',
};

export const ROLE_META = {
  [ROLES.STUDENT]: {
    id: ROLES.STUDENT,
    label: 'Student / Class Representative',
    shortLabel: 'Student',
    description: 'Report facility issues, track progress and confirm repairs.',
  },
  [ROLES.FACULTY]: {
    id: ROLES.FACULTY,
    label: 'Faculty / Class Advisor',
    shortLabel: 'Faculty',
    description: 'Verify reported issues and forward them to the right department.',
  },
  [ROLES.OFFICIAL]: {
    id: ROLES.OFFICIAL,
    label: 'College Official',
    shortLabel: 'Official',
    description: 'Assign work, record actions taken and close out requests.',
  },
};

export const ROLE_LIST = Object.values(ROLE_META);

/* --------------------------------------------------------------- statuses */

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

/**
 * `tone` maps to a badge colour set in <StatusBadge />.
 * `stage` groups statuses for dashboard statistics.
 */
export const STATUS_META = {
  [STATUS.SUBMITTED]: { id: STATUS.SUBMITTED, label: 'Submitted', tone: 'slate', stage: 'open' },
  [STATUS.UNDER_REVIEW]: { id: STATUS.UNDER_REVIEW, label: 'Under Review', tone: 'blue', stage: 'open' },
  [STATUS.VERIFIED]: { id: STATUS.VERIFIED, label: 'Verified', tone: 'blue', stage: 'open' },
  [STATUS.ASSIGNED]: { id: STATUS.ASSIGNED, label: 'Assigned', tone: 'indigo', stage: 'active' },
  [STATUS.ACKNOWLEDGED]: { id: STATUS.ACKNOWLEDGED, label: 'Acknowledged', tone: 'indigo', stage: 'active' },
  [STATUS.IN_PROGRESS]: { id: STATUS.IN_PROGRESS, label: 'In Progress', tone: 'amber', stage: 'active' },
  [STATUS.AWAITING_VERIFICATION]: {
    id: STATUS.AWAITING_VERIFICATION,
    label: 'Resolved — Awaiting Verification',
    shortLabel: 'Awaiting Verification',
    tone: 'teal',
    stage: 'active',
  },
  [STATUS.CLOSED]: { id: STATUS.CLOSED, label: 'Closed', tone: 'green', stage: 'closed' },
  [STATUS.REJECTED]: { id: STATUS.REJECTED, label: 'Rejected', tone: 'red', stage: 'closed' },
  [STATUS.DUPLICATE]: { id: STATUS.DUPLICATE, label: 'Duplicate', tone: 'slate', stage: 'closed' },
  [STATUS.ON_HOLD]: { id: STATUS.ON_HOLD, label: 'On Hold', tone: 'orange', stage: 'active' },
  [STATUS.REOPENED]: { id: STATUS.REOPENED, label: 'Reopened', tone: 'red', stage: 'open' },
};

export const STATUS_LIST = Object.values(STATUS_META);

/** The happy-path pipeline, used by the progress tracker on the details page. */
export const STATUS_PIPELINE = [
  STATUS.SUBMITTED,
  STATUS.UNDER_REVIEW,
  STATUS.VERIFIED,
  STATUS.ASSIGNED,
  STATUS.ACKNOWLEDGED,
  STATUS.IN_PROGRESS,
  STATUS.AWAITING_VERIFICATION,
  STATUS.CLOSED,
];

/** Statuses that count as finished — they are never flagged as overdue. */
export const TERMINAL_STATUSES = [STATUS.CLOSED, STATUS.REJECTED, STATUS.DUPLICATE];

/** Statuses waiting on somebody to act before any work starts. */
export const PENDING_STATUSES = [
  STATUS.SUBMITTED,
  STATUS.UNDER_REVIEW,
  STATUS.VERIFIED,
  STATUS.REOPENED,
  STATUS.ON_HOLD,
];

export const ACTIVE_STATUSES = [STATUS.ASSIGNED, STATUS.ACKNOWLEDGED, STATUS.IN_PROGRESS];

/* ------------------------------------------------------------- priorities */

export const PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

export const PRIORITY_META = {
  [PRIORITY.LOW]: { id: PRIORITY.LOW, label: 'Low', tone: 'slate', rank: 1, slaDays: 14 },
  [PRIORITY.MEDIUM]: { id: PRIORITY.MEDIUM, label: 'Medium', tone: 'blue', rank: 2, slaDays: 7 },
  [PRIORITY.HIGH]: { id: PRIORITY.HIGH, label: 'High', tone: 'orange', rank: 3, slaDays: 3 },
  [PRIORITY.URGENT]: { id: PRIORITY.URGENT, label: 'Urgent', tone: 'red', rank: 4, slaDays: 1 },
};

export const PRIORITY_LIST = Object.values(PRIORITY_META);

/* ------------------------------------------------------------- categories */

export const CATEGORY = {
  FANS: 'fans',
  LIGHTS: 'lights',
  FURNITURE: 'furniture',
  PROJECTOR: 'projector',
  NETWORK: 'network',
  WATER: 'water',
  CLEANLINESS: 'cleanliness',
  WASHROOM: 'washroom',
  LAB: 'lab',
  OTHER: 'other',
};

export const CATEGORY_META = {
  [CATEGORY.FANS]: { id: CATEGORY.FANS, label: 'Fans and ventilation' },
  [CATEGORY.LIGHTS]: { id: CATEGORY.LIGHTS, label: 'Lights and electricity' },
  [CATEGORY.FURNITURE]: { id: CATEGORY.FURNITURE, label: 'Benches and furniture' },
  [CATEGORY.PROJECTOR]: { id: CATEGORY.PROJECTOR, label: 'Projector and smart board' },
  [CATEGORY.NETWORK]: { id: CATEGORY.NETWORK, label: 'Wi-Fi and network' },
  [CATEGORY.WATER]: { id: CATEGORY.WATER, label: 'Drinking water' },
  [CATEGORY.CLEANLINESS]: { id: CATEGORY.CLEANLINESS, label: 'Cleanliness' },
  [CATEGORY.WASHROOM]: { id: CATEGORY.WASHROOM, label: 'Washroom facilities' },
  [CATEGORY.LAB]: { id: CATEGORY.LAB, label: 'Laboratory equipment' },
  [CATEGORY.OTHER]: { id: CATEGORY.OTHER, label: 'Other' },
};

export const CATEGORY_LIST = Object.values(CATEGORY_META);

/* ----------------------------------------------------------- room / misc */

export const ROOM_TYPE = {
  CLASSROOM: 'classroom',
  LAB: 'laboratory',
  LIBRARY: 'library',
  WASHROOM: 'washroom',
  OTHER: 'other',
};

export const ROOM_TYPE_META = {
  [ROOM_TYPE.CLASSROOM]: { id: ROOM_TYPE.CLASSROOM, label: 'Classroom' },
  [ROOM_TYPE.LAB]: { id: ROOM_TYPE.LAB, label: 'Laboratory' },
  [ROOM_TYPE.LIBRARY]: { id: ROOM_TYPE.LIBRARY, label: 'Library' },
  [ROOM_TYPE.WASHROOM]: { id: ROOM_TYPE.WASHROOM, label: 'Washroom' },
  [ROOM_TYPE.OTHER]: { id: ROOM_TYPE.OTHER, label: 'Other facility' },
};

export const ROOM_TYPE_LIST = Object.values(ROOM_TYPE_META);

export const NOTIFICATION_TYPE = {
  SUBMISSION: 'submission',
  VERIFICATION: 'verification',
  ASSIGNMENT: 'assignment',
  STATUS: 'status',
  OVERDUE: 'overdue',
  RESOLUTION: 'resolution',
  REOPEN: 'reopen',
};

export const NOTIFICATION_TYPE_META = {
  [NOTIFICATION_TYPE.SUBMISSION]: { id: NOTIFICATION_TYPE.SUBMISSION, label: 'New request' },
  [NOTIFICATION_TYPE.VERIFICATION]: { id: NOTIFICATION_TYPE.VERIFICATION, label: 'Verification' },
  [NOTIFICATION_TYPE.ASSIGNMENT]: { id: NOTIFICATION_TYPE.ASSIGNMENT, label: 'Assignment' },
  [NOTIFICATION_TYPE.STATUS]: { id: NOTIFICATION_TYPE.STATUS, label: 'Status update' },
  [NOTIFICATION_TYPE.OVERDUE]: { id: NOTIFICATION_TYPE.OVERDUE, label: 'Overdue' },
  [NOTIFICATION_TYPE.RESOLUTION]: { id: NOTIFICATION_TYPE.RESOLUTION, label: 'Resolution' },
  [NOTIFICATION_TYPE.REOPEN]: { id: NOTIFICATION_TYPE.REOPEN, label: 'Reopened' },
};

export const NOTIFICATION_TYPE_LIST = Object.values(NOTIFICATION_TYPE_META);

/** Max size accepted by the demo photo picker (browser-only preview). */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
