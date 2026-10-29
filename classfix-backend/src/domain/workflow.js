import { ROLES, STATUS } from './constants.js';

/**
 * The authoritative workflow definition.
 *
 * The frontend has a copy of this table purely to decide which buttons to
 * draw. This one decides what is actually permitted: every transition request
 * is checked here before anything is written, so a crafted HTTP call cannot
 * skip a stage, act in the wrong role, or close a request without a reason.
 *
 * Fields:
 *   role              — the role allowed to perform it
 *   from              — statuses the request must currently be in
 *   to                — resulting status, or null to leave the status unchanged
 *   verb              — wording recorded in the action history
 *   requiresReason    — a non-empty reason must be supplied
 *   requiresDepartment— a valid, active department must be supplied
 *   allowsDueDate     — an expected completion date may be supplied
 *   allowsEvidence    — completion evidence may be attached
 *   ownerOnly         — only the person who reported the request may do it
 *   departmentOnly    — only a member of the assigned department may do it
 */
export const WORKFLOW_ACTIONS = [
  /* ---------------------------------------------------------------- faculty */
  {
    id: 'start_review',
    label: 'Start review',
    role: ROLES.FACULTY,
    from: [STATUS.SUBMITTED, STATUS.REOPENED],
    to: STATUS.UNDER_REVIEW,
    verb: 'Review started',
  },
  {
    id: 'verify',
    label: 'Verify issue',
    role: ROLES.FACULTY,
    from: [STATUS.SUBMITTED, STATUS.UNDER_REVIEW, STATUS.REOPENED],
    to: STATUS.VERIFIED,
    verb: 'Issue verified',
  },
  {
    id: 'forward',
    label: 'Forward to department',
    role: ROLES.FACULTY,
    from: [STATUS.VERIFIED],
    to: STATUS.ASSIGNED,
    verb: 'Forwarded to department',
    requiresDepartment: true,
  },
  {
    id: 'reject',
    label: 'Reject',
    role: ROLES.FACULTY,
    from: [STATUS.SUBMITTED, STATUS.UNDER_REVIEW, STATUS.VERIFIED, STATUS.REOPENED],
    to: STATUS.REJECTED,
    verb: 'Request rejected',
    requiresReason: true,
  },
  {
    id: 'duplicate',
    label: 'Mark duplicate',
    role: ROLES.FACULTY,
    from: [STATUS.SUBMITTED, STATUS.UNDER_REVIEW, STATUS.VERIFIED],
    to: STATUS.DUPLICATE,
    verb: 'Marked as duplicate',
    requiresReason: true,
  },

  /* --------------------------------------------------------------- official */
  {
    id: 'acknowledge',
    label: 'Acknowledge',
    role: ROLES.OFFICIAL,
    from: [STATUS.ASSIGNED],
    to: STATUS.ACKNOWLEDGED,
    verb: 'Request acknowledged',
    departmentOnly: true,
  },
  {
    id: 'assign_dept',
    label: 'Reassign department',
    role: ROLES.OFFICIAL,
    from: [STATUS.ASSIGNED, STATUS.ACKNOWLEDGED, STATUS.IN_PROGRESS, STATUS.ON_HOLD],
    to: null,
    verb: 'Department reassigned',
    requiresDepartment: true,
  },
  {
    id: 'start_work',
    label: 'Start work',
    role: ROLES.OFFICIAL,
    from: [STATUS.ACKNOWLEDGED, STATUS.ON_HOLD, STATUS.ASSIGNED],
    to: STATUS.IN_PROGRESS,
    verb: 'Work started',
    allowsDueDate: true,
    departmentOnly: true,
  },
  {
    id: 'log_inspection',
    label: 'Record inspection',
    role: ROLES.OFFICIAL,
    from: [STATUS.ACKNOWLEDGED, STATUS.IN_PROGRESS, STATUS.ON_HOLD],
    to: null,
    verb: 'Inspection recorded',
    requiresReason: true,
    departmentOnly: true,
  },
  {
    id: 'hold',
    label: 'Put on hold',
    role: ROLES.OFFICIAL,
    from: [STATUS.ASSIGNED, STATUS.ACKNOWLEDGED, STATUS.IN_PROGRESS],
    to: STATUS.ON_HOLD,
    verb: 'Request put on hold',
    requiresReason: true,
    departmentOnly: true,
  },
  {
    id: 'resolve',
    label: 'Mark repair complete',
    role: ROLES.OFFICIAL,
    from: [STATUS.IN_PROGRESS, STATUS.ACKNOWLEDGED],
    to: STATUS.AWAITING_VERIFICATION,
    verb: 'Repair marked complete',
    allowsEvidence: true,
    departmentOnly: true,
  },
  {
    id: 'official_reject',
    label: 'Reject',
    role: ROLES.OFFICIAL,
    from: [STATUS.ASSIGNED, STATUS.ACKNOWLEDGED, STATUS.ON_HOLD],
    to: STATUS.REJECTED,
    verb: 'Request rejected',
    requiresReason: true,
    departmentOnly: true,
  },

  /* ---------------------------------------------------------------- student */
  {
    id: 'confirm_fixed',
    label: 'Confirm it is fixed',
    role: ROLES.STUDENT,
    from: [STATUS.AWAITING_VERIFICATION],
    to: STATUS.CLOSED,
    verb: 'Repair confirmed by reporter',
    ownerOnly: true,
  },
  {
    id: 'reopen',
    label: 'Reopen issue',
    role: ROLES.STUDENT,
    from: [STATUS.AWAITING_VERIFICATION, STATUS.CLOSED],
    to: STATUS.REOPENED,
    verb: 'Issue reopened',
    requiresReason: true,
    ownerOnly: true,
  },
];

const BY_ID = new Map(WORKFLOW_ACTIONS.map((action) => [action.id, action]));

export function getAction(id) {
  return BY_ID.get(id) ?? null;
}

/** Actions a role could take on a request in `status`, ignoring ownership. */
export function actionsFor(role, status) {
  if (role === ROLES.ADMIN) {
    return WORKFLOW_ACTIONS.filter((action) => action.from.includes(status));
  }
  return WORKFLOW_ACTIONS.filter(
    (action) => action.role === role && action.from.includes(status),
  );
}

/**
 * Decides whether `user` may apply `action` to `request`.
 * Returns { ok: true } or { ok: false, status, message } describing the refusal.
 */
export function authorizeAction(action, request, user) {
  if (!action) {
    return { ok: false, status: 400, message: 'Unknown workflow action.' };
  }

  const isAdmin = user.role === ROLES.ADMIN;

  if (!isAdmin && action.role !== user.role) {
    return {
      ok: false,
      status: 403,
      message: `Only a ${action.role} may perform "${action.label}".`,
    };
  }

  if (!action.from.includes(request.status)) {
    return {
      ok: false,
      status: 409,
      message: `"${action.label}" cannot be applied to a request that is currently "${request.status}".`,
    };
  }

  if (action.ownerOnly && !isAdmin && request.reported_by !== user.id) {
    return {
      ok: false,
      status: 403,
      message: 'Only the person who reported this request may do that.',
    };
  }

  if (
    action.departmentOnly &&
    !isAdmin &&
    request.department_id &&
    user.department_id !== request.department_id
  ) {
    return {
      ok: false,
      status: 403,
      message: 'This request is assigned to a different department.',
    };
  }

  return { ok: true };
}

/** Validates the payload an action needs, independent of who is asking. */
export function validateActionInput(action, input) {
  if (action.requiresReason && !input.reason?.trim()) {
    return `"${action.label}" requires a reason to be recorded in the action history.`;
  }
  if (action.requiresDepartment && !input.departmentId) {
    return `"${action.label}" requires a department.`;
  }
  if (input.expectedCompletion && !action.allowsDueDate) {
    return `"${action.label}" does not accept an expected completion date.`;
  }
  if (input.evidence && !action.allowsEvidence) {
    return `"${action.label}" does not accept completion evidence.`;
  }
  return null;
}
