import { ROLES, STATUS } from './index.js';

/**
 * Role-aware workflow actions.
 *
 * Each action describes one transition that a demo role may apply to a request
 * in one of its `from` statuses. `requiresReason` forces the user to type a
 * justification before the transition is recorded in the action history.
 *
 * This is a demo convenience, not a security mechanism — the role switcher
 * simply changes which buttons are rendered.
 */
export const WORKFLOW_ACTIONS = [
  /* ---------------------------------------------------------- faculty */
  {
    id: 'start_review',
    label: 'Start review',
    role: ROLES.FACULTY,
    from: [STATUS.SUBMITTED, STATUS.REOPENED],
    to: STATUS.UNDER_REVIEW,
    verb: 'Review started',
    style: 'secondary',
  },
  {
    id: 'verify',
    label: 'Verify issue',
    role: ROLES.FACULTY,
    from: [STATUS.SUBMITTED, STATUS.UNDER_REVIEW, STATUS.REOPENED],
    to: STATUS.VERIFIED,
    verb: 'Issue verified',
    style: 'accent',
  },
  {
    id: 'forward',
    label: 'Forward to department',
    role: ROLES.FACULTY,
    from: [STATUS.VERIFIED],
    to: STATUS.ASSIGNED,
    verb: 'Forwarded to department',
    style: 'primary',
    requiresDepartment: true,
  },
  {
    id: 'reject',
    label: 'Reject',
    role: ROLES.FACULTY,
    from: [STATUS.SUBMITTED, STATUS.UNDER_REVIEW, STATUS.VERIFIED, STATUS.REOPENED],
    to: STATUS.REJECTED,
    verb: 'Request rejected',
    style: 'danger',
    requiresReason: true,
    reasonLabel: 'Reason for rejection',
  },
  {
    id: 'duplicate',
    label: 'Mark duplicate',
    role: ROLES.FACULTY,
    from: [STATUS.SUBMITTED, STATUS.UNDER_REVIEW, STATUS.VERIFIED],
    to: STATUS.DUPLICATE,
    verb: 'Marked as duplicate',
    style: 'secondary',
    requiresReason: true,
    reasonLabel: 'Which request does this duplicate?',
  },

  /* --------------------------------------------------------- official */
  {
    id: 'acknowledge',
    label: 'Acknowledge',
    role: ROLES.OFFICIAL,
    from: [STATUS.ASSIGNED],
    to: STATUS.ACKNOWLEDGED,
    verb: 'Request acknowledged',
    style: 'accent',
  },
  {
    id: 'assign_dept',
    label: 'Reassign department',
    role: ROLES.OFFICIAL,
    from: [STATUS.ASSIGNED, STATUS.ACKNOWLEDGED, STATUS.IN_PROGRESS, STATUS.ON_HOLD],
    to: null, // status unchanged
    verb: 'Department reassigned',
    style: 'secondary',
    requiresDepartment: true,
  },
  {
    id: 'start_work',
    label: 'Start work',
    role: ROLES.OFFICIAL,
    from: [STATUS.ACKNOWLEDGED, STATUS.ON_HOLD, STATUS.ASSIGNED],
    to: STATUS.IN_PROGRESS,
    verb: 'Work started',
    style: 'primary',
    allowsDueDate: true,
  },
  {
    id: 'log_inspection',
    label: 'Record inspection',
    role: ROLES.OFFICIAL,
    from: [STATUS.ACKNOWLEDGED, STATUS.IN_PROGRESS, STATUS.ON_HOLD],
    to: null,
    verb: 'Inspection recorded',
    style: 'secondary',
    requiresReason: true,
    reasonLabel: 'Inspection notes',
  },
  {
    id: 'hold',
    label: 'Put on hold',
    role: ROLES.OFFICIAL,
    from: [STATUS.ASSIGNED, STATUS.ACKNOWLEDGED, STATUS.IN_PROGRESS],
    to: STATUS.ON_HOLD,
    verb: 'Request put on hold',
    style: 'secondary',
    requiresReason: true,
    reasonLabel: 'Reason for the delay',
  },
  {
    id: 'resolve',
    label: 'Mark repair complete',
    role: ROLES.OFFICIAL,
    from: [STATUS.IN_PROGRESS, STATUS.ACKNOWLEDGED],
    to: STATUS.AWAITING_VERIFICATION,
    verb: 'Repair marked complete',
    style: 'accent',
    allowsEvidence: true,
  },
  {
    id: 'official_reject',
    label: 'Reject',
    role: ROLES.OFFICIAL,
    from: [STATUS.ASSIGNED, STATUS.ACKNOWLEDGED, STATUS.ON_HOLD],
    to: STATUS.REJECTED,
    verb: 'Request rejected',
    style: 'danger',
    requiresReason: true,
    reasonLabel: 'Reason for rejection',
  },

  /* ---------------------------------------------------------- student */
  {
    id: 'confirm_fixed',
    label: 'Confirm it is fixed',
    role: ROLES.STUDENT,
    from: [STATUS.AWAITING_VERIFICATION],
    to: STATUS.CLOSED,
    verb: 'Repair confirmed by reporter',
    style: 'accent',
  },
  {
    id: 'reopen',
    label: 'Reopen issue',
    role: ROLES.STUDENT,
    from: [STATUS.AWAITING_VERIFICATION, STATUS.CLOSED],
    to: STATUS.REOPENED,
    verb: 'Issue reopened',
    style: 'danger',
    requiresReason: true,
    reasonLabel: 'Why is this still a problem?',
  },
];

/** Actions a given demo role may take on a request in `status`. */
export function getAvailableActions(role, status) {
  return WORKFLOW_ACTIONS.filter((action) => action.role === role && action.from.includes(status));
}

export function getActionById(id) {
  return WORKFLOW_ACTIONS.find((action) => action.id === id) ?? null;
}
