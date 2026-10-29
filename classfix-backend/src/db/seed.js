/**
 * Seeds the database with the same illustrative records the frontend prototype
 * used, so the full stack opens with a believable history rather than an empty
 * table. Safe to re-run: it clears the data tables first.
 *
 *   npm run db:seed
 */
import { config } from '../config.js';
import { applySchema, getDb, closeDb } from './index.js';
import { hashPassword } from '../services/authService.js';

const DAY = 86_400_000;
const base = Date.now();
const ago = (days) => new Date(base - days * DAY).toISOString();
const ahead = (days) => new Date(base + days * DAY).toISOString();

/* ------------------------------------------------------------------ data */

const departments = [
  ['dep-maintenance', 'General Maintenance', 'MNT', 'maintenance@example-college.demo', 'usr-official-1'],
  ['dep-electrical', 'Electrical Services', 'ELE', 'electrical@example-college.demo', 'usr-official-2'],
  ['dep-it', 'IT and Network', 'ITN', 'itdesk@example-college.demo', 'usr-official-3'],
  ['dep-housekeeping', 'Housekeeping', 'HKP', 'housekeeping@example-college.demo', 'usr-official-4'],
  ['dep-lab', 'Laboratory Support', 'LAB', 'labsupport@example-college.demo', 'usr-official-5'],
];

const users = [
  ['usr-student-1', 'Aarthi Raman', 'aarthi@example-college.demo', 'student', 'Class Representative', 'CSE — 3rd Year, Section A', null],
  ['usr-student-2', 'Nikhil Varma', 'nikhil@example-college.demo', 'student', 'Class Representative', 'ECE — 2nd Year, Section B', null],
  ['usr-faculty-1', 'Dr. Meera Krishnan', 'meera@example-college.demo', 'faculty', 'Class Advisor', 'CSE — 3rd Year, Section A', null],
  ['usr-faculty-2', 'Prof. Sanjay Iyer', 'sanjay@example-college.demo', 'faculty', 'Class Advisor', 'ECE — 2nd Year, Section B', null],
  ['usr-official-1', 'Ravi Sundaram', 'ravi@example-college.demo', 'official', 'Maintenance Supervisor', null, 'dep-maintenance'],
  ['usr-official-2', 'Latha Prasad', 'latha@example-college.demo', 'official', 'Electrical Engineer', null, 'dep-electrical'],
  ['usr-official-3', 'Imran Qureshi', 'imran@example-college.demo', 'official', 'Network Administrator', null, 'dep-it'],
  ['usr-official-4', 'Grace Fernandes', 'grace@example-college.demo', 'official', 'Housekeeping Lead', null, 'dep-housekeeping'],
  ['usr-official-5', 'Dinesh Kumar', 'dinesh@example-college.demo', 'official', 'Laboratory Technician', null, 'dep-lab'],
  ['usr-admin-1', 'Priya Nair', 'admin@example-college.demo', 'admin', 'Facility Administrator', null, null],
];

const buildings = [
  ['bld-main', 'Main Block', 'MB', 'Lecture halls and departmental offices.'],
  ['bld-science', 'Science Block', 'SB', 'Teaching laboratories and research rooms.'],
  ['bld-library', 'Library Block', 'LB', 'Reading halls, archives and study rooms.'],
];

const floors = [
  ['flr-main-g', 'bld-main', 'Ground Floor', 0],
  ['flr-main-1', 'bld-main', 'First Floor', 1],
  ['flr-main-2', 'bld-main', 'Second Floor', 2],
  ['flr-main-3', 'bld-main', 'Third Floor', 3],
  ['flr-sci-g', 'bld-science', 'Ground Floor', 0],
  ['flr-sci-1', 'bld-science', 'First Floor', 1],
  ['flr-sci-2', 'bld-science', 'Second Floor', 2],
  ['flr-lib-g', 'bld-library', 'Ground Floor', 0],
  ['flr-lib-1', 'bld-library', 'First Floor', 1],
];

const rooms = [
  ['rm-mb-g01', 'flr-main-g', 'G01', null, 'classroom', 60],
  ['rm-mb-g02', 'flr-main-g', 'G02', null, 'classroom', 60],
  ['rm-mb-g03', 'flr-main-g', 'G03', 'Ground floor washroom', 'washroom', 0],
  ['rm-mb-101', 'flr-main-1', '101', null, 'classroom', 72],
  ['rm-mb-102', 'flr-main-1', '102', null, 'classroom', 72],
  ['rm-mb-103', 'flr-main-1', '103', null, 'classroom', 48],
  ['rm-mb-201', 'flr-main-2', '201', null, 'classroom', 72],
  ['rm-mb-202', 'flr-main-2', '202', null, 'classroom', 72],
  ['rm-mb-203', 'flr-main-2', '203', null, 'classroom', 48],
  ['rm-mb-204', 'flr-main-2', '204', null, 'classroom', 64],
  ['rm-mb-301', 'flr-main-3', '301', null, 'classroom', 48],
  ['rm-mb-302', 'flr-main-3', '302', null, 'classroom', 48],
  ['rm-mb-303', 'flr-main-3', '303', 'Seminar room', 'other', 20],
  ['rm-sb-g01', 'flr-sci-g', 'G01', 'Physics laboratory', 'laboratory', 30],
  ['rm-sb-g02', 'flr-sci-g', 'G02', 'Chemistry laboratory', 'laboratory', 30],
  ['rm-sb-101', 'flr-sci-1', '101', 'Computer laboratory I', 'laboratory', 40],
  ['rm-sb-102', 'flr-sci-1', '102', 'Computer laboratory II', 'laboratory', 40],
  ['rm-sb-201', 'flr-sci-2', '201', null, 'classroom', 56],
  ['rm-sb-202', 'flr-sci-2', '202', 'Second floor washroom', 'washroom', 0],
  ['rm-lb-g01', 'flr-lib-g', 'G01', 'Main reading hall', 'library', 120],
  ['rm-lb-g02', 'flr-lib-g', 'G02', 'Book stack area', 'other', 0],
  ['rm-lb-101', 'flr-lib-1', '101', 'Reference section', 'library', 60],
  ['rm-lb-102', 'flr-lib-1', '102', 'Group study room', 'other', 12],
];

/**
 * Requests, each with the history that produced its current status.
 * `events` entries are [actorId, action, details, daysAgo, statusAfter].
 */
const requests = [
  {
    id: 'CF-1001',
    title: 'Classroom fans not working',
    description:
      'Three of the four ceiling fans in the room stopped working last week. Afternoon classes are difficult to sit through, especially for students at the back.',
    roomId: 'rm-mb-204',
    category: 'fans',
    priority: 'high',
    status: 'awaiting_verification',
    reportedBy: 'usr-student-1',
    departmentId: 'dep-electrical',
    assignedTo: 'usr-official-2',
    createdAt: ago(5),
    updatedAt: ago(1),
    expectedCompletion: ahead(1),
    upvotes: ['usr-student-2', 'usr-faculty-1'],
    evidence: [['Repair completion note (illustrative)', 'Two fan motors replaced, one capacitor changed.']],
    events: [
      ['usr-student-1', 'Request submitted', 'Reported by the class representative.', 5, 'submitted'],
      ['usr-faculty-1', 'Issue verified', 'Advisor confirmed three fans are not running.', 4, 'verified'],
      ['usr-faculty-1', 'Forwarded to department', 'Department: Electrical Services.', 4, 'assigned'],
      ['usr-official-2', 'Request acknowledged', 'Added to this week’s electrical work list.', 3.5, 'acknowledged'],
      ['usr-official-2', 'Inspection recorded', 'Two motors burnt out, one capacitor faulty.', 3, null],
      ['usr-official-2', 'Work started', 'Replacement parts drawn from stores.', 2, 'in_progress'],
      ['usr-official-2', 'Repair marked complete', 'All four fans tested and running.', 1, 'awaiting_verification'],
    ],
    comments: [
      ['usr-faculty-1', 'Please prioritise this — the room is used for back-to-back afternoon sessions.', 4],
      ['usr-official-2', 'Parts were available in stores, so no external purchase was needed.', 2],
    ],
  },
  {
    id: 'CF-1002',
    title: 'Projector shows a blue tint on all slides',
    description:
      'The projector displays everything with a strong blue tint. Text on white slides is hard to read from the middle rows onward.',
    roomId: 'rm-mb-101',
    category: 'projector',
    priority: 'medium',
    status: 'in_progress',
    reportedBy: 'usr-student-1',
    departmentId: 'dep-it',
    assignedTo: 'usr-official-3',
    createdAt: ago(9),
    updatedAt: ago(2),
    expectedCompletion: ahead(3),
    upvotes: ['usr-student-2'],
    events: [
      ['usr-student-1', 'Request submitted', 'Reported after the morning lecture.', 9, 'submitted'],
      ['usr-faculty-1', 'Issue verified', 'Advisor reproduced the problem with a laptop.', 8, 'verified'],
      ['usr-faculty-1', 'Forwarded to department', 'Department: IT and Network.', 8, 'assigned'],
      ['usr-official-3', 'Request acknowledged', 'Logged with the AV vendor.', 6, 'acknowledged'],
      ['usr-official-3', 'Work started', 'Awaiting a replacement HDMI board from the vendor.', 2, 'in_progress'],
    ],
    comments: [['usr-official-3', 'Cable swap did not help, so the board is likely at fault.', 2]],
  },
  {
    id: 'CF-1003',
    title: 'Two tube lights flickering near the whiteboard',
    description: 'The lights above the whiteboard flicker continuously, which is distracting during lectures.',
    roomId: 'rm-mb-102',
    category: 'lights',
    priority: 'medium',
    status: 'closed',
    reportedBy: 'usr-student-2',
    departmentId: 'dep-electrical',
    assignedTo: 'usr-official-2',
    createdAt: ago(21),
    updatedAt: ago(14),
    expectedCompletion: ago(15),
    upvotes: ['usr-student-1'],
    evidence: [['Replacement log (illustrative)', 'Two LED tubes replaced.']],
    events: [
      ['usr-student-2', 'Request submitted', 'Reported by the class representative.', 21, 'submitted'],
      ['usr-faculty-2', 'Issue verified', 'Advisor confirmed the flicker.', 20, 'verified'],
      ['usr-faculty-2', 'Forwarded to department', 'Department: Electrical Services.', 20, 'assigned'],
      ['usr-official-2', 'Request acknowledged', 'Scheduled with the weekly rounds.', 19, 'acknowledged'],
      ['usr-official-2', 'Work started', 'Technician assigned.', 17, 'in_progress'],
      ['usr-official-2', 'Repair marked complete', 'Both tubes replaced with LED units.', 15, 'awaiting_verification'],
      ['usr-student-2', 'Repair confirmed by reporter', 'Lights are steady now.', 14, 'closed'],
    ],
  },
  {
    id: 'CF-1004',
    title: 'Drinking water cooler not cooling',
    description:
      'The water cooler next to the stairwell dispenses only room-temperature water. It has been like this for about ten days.',
    roomId: 'rm-mb-g03',
    category: 'water',
    priority: 'high',
    status: 'on_hold',
    reportedBy: 'usr-student-2',
    departmentId: 'dep-maintenance',
    assignedTo: 'usr-official-1',
    createdAt: ago(16),
    updatedAt: ago(6),
    expectedCompletion: ago(4),
    upvotes: ['usr-student-1', 'usr-faculty-2', 'usr-faculty-1'],
    events: [
      ['usr-student-2', 'Request submitted', 'Reported with support from several classes.', 16, 'submitted'],
      ['usr-faculty-2', 'Issue verified', 'Advisor confirmed the cooler is not chilling.', 15, 'verified'],
      ['usr-faculty-2', 'Forwarded to department', 'Department: General Maintenance.', 15, 'assigned'],
      ['usr-official-1', 'Request acknowledged', 'Vendor contacted for a compressor check.', 13, 'acknowledged'],
      ['usr-official-1', 'Inspection recorded', 'Compressor needs replacement, not a refill.', 10, null],
      ['usr-official-1', 'Request put on hold', 'Compressor is out of stock with the supplier until next week.', 6, 'on_hold'],
    ],
    comments: [['usr-faculty-2', 'Could a temporary cooler be moved here in the meantime?', 5]],
  },
  {
    id: 'CF-1005',
    title: 'Wi-Fi drops repeatedly in the computer laboratory',
    description:
      'Connections drop every few minutes during practical sessions, which interrupts downloads and online submissions.',
    roomId: 'rm-sb-101',
    category: 'network',
    priority: 'urgent',
    status: 'assigned',
    reportedBy: 'usr-student-1',
    departmentId: 'dep-it',
    assignedTo: null,
    createdAt: ago(4),
    updatedAt: ago(3),
    expectedCompletion: ago(2),
    upvotes: ['usr-student-2', 'usr-faculty-1', 'usr-faculty-2'],
    events: [
      ['usr-student-1', 'Request submitted', 'Reported during the Tuesday practical.', 4, 'submitted'],
      ['usr-faculty-1', 'Issue verified', 'Advisor observed repeated disconnections.', 3, 'verified'],
      ['usr-faculty-1', 'Forwarded to department', 'Department: IT and Network.', 3, 'assigned'],
    ],
    comments: [['usr-faculty-1', 'Two lab batches are affected, so this blocks assessments.', 3]],
  },
  {
    id: 'CF-1006',
    title: 'Six benches have broken backrests',
    description: 'Several benches in the last three rows have cracked backrests and wobble when students lean back.',
    roomId: 'rm-mb-201',
    category: 'furniture',
    priority: 'medium',
    status: 'verified',
    reportedBy: 'usr-student-1',
    createdAt: ago(6),
    updatedAt: ago(5),
    upvotes: ['usr-student-2'],
    events: [
      ['usr-student-1', 'Request submitted', 'Reported with a count of affected benches.', 6, 'submitted'],
      ['usr-faculty-1', 'Review started', 'Advisor will inspect after the afternoon session.', 5.5, 'under_review'],
      ['usr-faculty-1', 'Issue verified', 'Six benches confirmed unusable.', 5, 'verified'],
    ],
  },
  {
    id: 'CF-1007',
    title: 'Washroom taps leaking continuously',
    description: 'Two taps in the second floor washroom run constantly and water is pooling on the floor.',
    roomId: 'rm-sb-202',
    category: 'washroom',
    priority: 'high',
    status: 'acknowledged',
    reportedBy: 'usr-student-2',
    departmentId: 'dep-housekeeping',
    assignedTo: 'usr-official-4',
    createdAt: ago(8),
    updatedAt: ago(5),
    expectedCompletion: ago(1),
    upvotes: ['usr-student-1', 'usr-faculty-2'],
    events: [
      ['usr-student-2', 'Request submitted', 'Reported as a safety and wastage concern.', 8, 'submitted'],
      ['usr-faculty-2', 'Issue verified', 'Advisor confirmed both taps are leaking.', 7, 'verified'],
      ['usr-faculty-2', 'Forwarded to department', 'Department: Housekeeping.', 7, 'assigned'],
      ['usr-official-4', 'Request acknowledged', 'Plumber scheduled.', 5, 'acknowledged'],
    ],
  },
  {
    id: 'CF-1008',
    title: 'Reading hall not cleaned before opening hours',
    description: 'Tables were left uncleaned for three consecutive mornings and bins were overflowing.',
    roomId: 'rm-lb-g01',
    category: 'cleanliness',
    priority: 'low',
    status: 'closed',
    reportedBy: 'usr-student-1',
    departmentId: 'dep-housekeeping',
    assignedTo: 'usr-official-4',
    createdAt: ago(28),
    updatedAt: ago(24),
    expectedCompletion: ago(25),
    events: [
      ['usr-student-1', 'Request submitted', 'Reported by a library user.', 28, 'submitted'],
      ['usr-faculty-1', 'Issue verified', 'Advisor confirmed with the library desk.', 27, 'verified'],
      ['usr-faculty-1', 'Forwarded to department', 'Department: Housekeeping.', 27, 'assigned'],
      ['usr-official-4', 'Request acknowledged', 'Morning shift roster reviewed.', 26, 'acknowledged'],
      ['usr-official-4', 'Work started', 'Additional staff assigned to the early shift.', 26, 'in_progress'],
      ['usr-official-4', 'Repair marked complete', 'Cleaning schedule corrected and supervised for two days.', 25, 'awaiting_verification'],
      ['usr-student-1', 'Repair confirmed by reporter', 'Hall has been clean since.', 24, 'closed'],
    ],
  },
  {
    id: 'CF-1009',
    title: 'Smart board touch input is unresponsive',
    description: 'The smart board responds to the pen but not to touch, so group annotation exercises cannot be run.',
    roomId: 'rm-mb-301',
    category: 'projector',
    priority: 'medium',
    status: 'under_review',
    reportedBy: 'usr-student-2',
    createdAt: ago(2),
    updatedAt: ago(1.5),
    events: [
      ['usr-student-2', 'Request submitted', 'Reported after a tutorial session.', 2, 'submitted'],
      ['usr-faculty-2', 'Review started', 'Advisor will test the board before verifying.', 1.5, 'under_review'],
    ],
  },
  {
    id: 'CF-1010',
    title: 'Microscope eyepieces missing from the physics laboratory',
    description: 'Four microscopes are missing eyepieces, so one bench group has to share equipment each session.',
    roomId: 'rm-sb-g01',
    category: 'lab',
    priority: 'high',
    status: 'in_progress',
    reportedBy: 'usr-student-1',
    departmentId: 'dep-lab',
    assignedTo: 'usr-official-5',
    createdAt: ago(12),
    updatedAt: ago(4),
    expectedCompletion: ahead(2),
    upvotes: ['usr-student-2'],
    events: [
      ['usr-student-1', 'Request submitted', 'Reported with the equipment numbers.', 12, 'submitted'],
      ['usr-faculty-1', 'Issue verified', 'Advisor checked the laboratory register.', 11, 'verified'],
      ['usr-faculty-1', 'Forwarded to department', 'Department: Laboratory Support.', 11, 'assigned'],
      ['usr-official-5', 'Request acknowledged', 'Stock check started.', 9, 'acknowledged'],
      ['usr-official-5', 'Work started', 'Replacement eyepieces ordered from the supplier.', 4, 'in_progress'],
    ],
  },
  {
    id: 'CF-1011',
    title: 'Room is too dark in the first two periods',
    description: 'Natural light is poor in the morning and only one of the three light rows works.',
    roomId: 'rm-mb-103',
    category: 'lights',
    priority: 'low',
    status: 'rejected',
    reportedBy: 'usr-student-2',
    createdAt: ago(18),
    updatedAt: ago(17),
    events: [
      ['usr-student-2', 'Request submitted', 'Reported by the class representative.', 18, 'submitted'],
      ['usr-faculty-2', 'Review started', 'Advisor inspected the room.', 17.5, 'under_review'],
      [
        'usr-faculty-2',
        'Request rejected',
        'All three light rows were working when checked; the switch panel had been left partly off. Advised the class to report again if it recurs.',
        17,
        'rejected',
      ],
    ],
  },
  {
    id: 'CF-1012',
    title: 'Ceiling fan making a loud rattling noise',
    description: 'One fan rattles loudly at higher speeds and the blade mount looks loose.',
    roomId: 'rm-mb-202',
    category: 'fans',
    priority: 'urgent',
    status: 'submitted',
    reportedBy: 'usr-student-1',
    createdAt: ago(0.4),
    updatedAt: ago(0.4),
    upvotes: ['usr-student-2'],
    events: [
      ['usr-student-1', 'Request submitted', 'Flagged as a safety risk by the class representative.', 0.4, 'submitted'],
    ],
  },
  {
    id: 'CF-1013',
    title: 'Duplicate report of flickering lights near the whiteboard',
    description: 'Lights near the board keep flickering during the first period.',
    roomId: 'rm-mb-102',
    category: 'lights',
    priority: 'low',
    status: 'duplicate',
    reportedBy: 'usr-student-1',
    createdAt: ago(20),
    updatedAt: ago(19),
    events: [
      ['usr-student-1', 'Request submitted', 'Reported separately by another class.', 20, 'submitted'],
      ['usr-faculty-1', 'Marked as duplicate', 'Same issue as CF-1003, which is already being handled.', 19, 'duplicate'],
    ],
  },
  {
    id: 'CF-1014',
    title: 'Group study room door latch broken',
    description: 'The door does not latch shut, so the room cannot be used for recorded group discussions.',
    roomId: 'rm-lb-102',
    category: 'other',
    priority: 'low',
    status: 'submitted',
    reportedBy: 'usr-student-2',
    createdAt: ago(1.2),
    updatedAt: ago(1.2),
    events: [['usr-student-2', 'Request submitted', 'Reported by a study group.', 1.2, 'submitted']],
  },
  {
    id: 'CF-1015',
    title: 'Air circulation poor in the chemistry laboratory',
    description: 'The exhaust fan is weak and fumes linger well after experiments finish.',
    roomId: 'rm-sb-g02',
    category: 'fans',
    priority: 'urgent',
    status: 'reopened',
    reportedBy: 'usr-student-1',
    departmentId: 'dep-lab',
    assignedTo: 'usr-official-5',
    createdAt: ago(34),
    updatedAt: ago(3),
    expectedCompletion: ago(2),
    upvotes: ['usr-student-2', 'usr-faculty-1'],
    events: [
      ['usr-student-1', 'Request submitted', 'Reported after a practical session.', 34, 'submitted'],
      ['usr-faculty-1', 'Issue verified', 'Advisor confirmed weak extraction.', 33, 'verified'],
      ['usr-faculty-1', 'Forwarded to department', 'Department: Laboratory Support.', 33, 'assigned'],
      ['usr-official-5', 'Request acknowledged', 'Exhaust unit inspected.', 31, 'acknowledged'],
      ['usr-official-5', 'Work started', 'Duct cleaned and motor serviced.', 28, 'in_progress'],
      ['usr-official-5', 'Repair marked complete', 'Airflow measured and found acceptable.', 26, 'awaiting_verification'],
      ['usr-student-1', 'Repair confirmed by reporter', 'Extraction was better after servicing.', 25, 'closed'],
      ['usr-student-1', 'Issue reopened', 'The exhaust has weakened again over the last fortnight and fumes are lingering.', 3, 'reopened'],
    ],
    comments: [['usr-faculty-1', 'This needs a permanent fix rather than another service round.', 3]],
  },
  {
    id: 'CF-1016',
    title: 'Reference section lights left on overnight',
    description: 'Lights in the reference section stay on through the night, which looks like a timer or switch fault.',
    roomId: 'rm-lb-101',
    category: 'lights',
    priority: 'low',
    status: 'awaiting_verification',
    reportedBy: 'usr-student-2',
    departmentId: 'dep-electrical',
    assignedTo: 'usr-official-2',
    createdAt: ago(11),
    updatedAt: ago(2),
    expectedCompletion: ahead(4),
    evidence: [['Timer configuration note (illustrative)', 'Automatic cut-off set to 21:30.']],
    events: [
      ['usr-student-2', 'Request submitted', 'Reported as an energy wastage concern.', 11, 'submitted'],
      ['usr-faculty-2', 'Issue verified', 'Advisor confirmed with the night security log.', 10, 'verified'],
      ['usr-faculty-2', 'Forwarded to department', 'Department: Electrical Services.', 10, 'assigned'],
      ['usr-official-2', 'Request acknowledged', 'Timer panel to be checked.', 8, 'acknowledged'],
      ['usr-official-2', 'Work started', 'Faulty timer relay identified.', 5, 'in_progress'],
      ['usr-official-2', 'Repair marked complete', 'Relay replaced and cut-off time configured.', 2, 'awaiting_verification'],
    ],
  },
];

const announcements = [
  [
    'Electrical maintenance rounds every Wednesday',
    'Electrical Services now runs a fixed inspection round every Wednesday afternoon. Requests verified before Tuesday evening are picked up in the same week.',
    'All classes',
    'usr-official-2',
    2,
  ],
  [
    'Laboratory equipment audit — Science Block',
    'A full equipment audit runs through the Science Block this month. Please report missing or damaged apparatus through ClassFix rather than the register so it can be tracked.',
    'Science Block users',
    'usr-official-5',
    9,
  ],
  [
    'How to write a useful facility request',
    'Include the exact room, what is broken and how long it has been that way. Requests with a clear description and a photo are verified noticeably faster.',
    'Class representatives',
    'usr-faculty-1',
    16,
  ],
];

/* ----------------------------------------------------------------- seed */

export function seed(db = getDb()) {
  applySchema(db);

  const passwordHash = hashPassword(config.seedPassword);

  const run = db.transaction(() => {
    // Clear the data tables. The append-only trigger refuses to delete a
    // history row while its request still exists, so `requests` is cleared
    // first and the orphaned events go afterwards.
    db.pragma('foreign_keys = OFF');
    for (const table of [
      'notifications',
      'announcements',
      'attachments',
      'upvotes',
      'comments',
      'requests',
      'request_events',
      'rooms',
      'floors',
      'buildings',
      'users',
      'departments',
    ]) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
    db.pragma('foreign_keys = ON');

    // Departments reference users and vice versa, so insert departments
    // without a head first, then set heads once the users exist.
    const insertDept = db.prepare(
      'INSERT INTO departments (id, name, code, contact, head_user_id) VALUES (?, ?, ?, ?, NULL)',
    );
    for (const [id, name, code, contact] of departments) insertDept.run(id, name, code, contact);

    const insertUser = db.prepare(
      `INSERT INTO users (id, name, email, password_hash, role, title, class_name, department_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const [id, name, email, role, title, className, departmentId] of users) {
      insertUser.run(id, name, email, passwordHash, role, title, className, departmentId, ago(60));
    }

    const setHead = db.prepare('UPDATE departments SET head_user_id = ? WHERE id = ?');
    for (const [id, , , , head] of departments) setHead.run(head, id);

    const insertBuilding = db.prepare(
      'INSERT INTO buildings (id, name, code, description) VALUES (?, ?, ?, ?)',
    );
    for (const row of buildings) insertBuilding.run(...row);

    const insertFloor = db.prepare(
      'INSERT INTO floors (id, building_id, name, level) VALUES (?, ?, ?, ?)',
    );
    for (const row of floors) insertFloor.run(...row);

    const insertRoom = db.prepare(
      'INSERT INTO rooms (id, floor_id, number, name, type, capacity) VALUES (?, ?, ?, ?, ?, ?)',
    );
    for (const row of rooms) insertRoom.run(...row);

    const insertRequest = db.prepare(
      `INSERT INTO requests
         (id, title, description, room_id, category, priority, status, reported_by,
          department_id, assigned_to, expected_completion, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertEvent = db.prepare(
      `INSERT INTO request_events (request_id, actor_id, action, details, status_after, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const insertComment = db.prepare(
      'INSERT INTO comments (request_id, author_id, body, created_at) VALUES (?, ?, ?, ?)',
    );
    const insertUpvote = db.prepare(
      'INSERT INTO upvotes (request_id, user_id, created_at) VALUES (?, ?, ?)',
    );
    const insertEvidence = db.prepare(
      `INSERT INTO attachments
         (request_id, kind, filename, mime_type, size_bytes, label, note, uploaded_by, created_at)
       VALUES (?, 'evidence', 'completion-note.txt', 'text/plain', 0, ?, ?, ?, ?)`,
    );

    for (const request of requests) {
      insertRequest.run(
        request.id,
        request.title,
        request.description,
        request.roomId,
        request.category,
        request.priority,
        request.status,
        request.reportedBy,
        request.departmentId ?? null,
        request.assignedTo ?? null,
        request.expectedCompletion ?? null,
        request.createdAt,
        request.updatedAt,
      );

      for (const [actorId, action, details, daysAgo, statusAfter] of request.events) {
        insertEvent.run(request.id, actorId, action, details, statusAfter, ago(daysAgo));
      }
      for (const [authorId, body, daysAgo] of request.comments ?? []) {
        insertComment.run(request.id, authorId, body, ago(daysAgo));
      }
      for (const userId of request.upvotes ?? []) {
        insertUpvote.run(request.id, userId, request.updatedAt);
      }
      for (const [label, note] of request.evidence ?? []) {
        insertEvidence.run(request.id, label, note, request.assignedTo ?? 'usr-official-1', request.updatedAt);
      }
    }

    const insertAnnouncement = db.prepare(
      'INSERT INTO announcements (title, body, audience, posted_by, created_at) VALUES (?, ?, ?, ?, ?)',
    );
    for (const [title, body, audience, postedBy, daysAgo] of announcements) {
      insertAnnouncement.run(title, body, audience, postedBy, ago(daysAgo));
    }

    // Continue the CF-#### series after the seeded records.
    db.prepare('UPDATE request_sequence SET next_value = ? WHERE id = 1').run(1017);

    seedNotifications(db);
  });

  run();

  return {
    users: users.length,
    buildings: buildings.length,
    floors: floors.length,
    rooms: rooms.length,
    departments: departments.length,
    requests: requests.length,
    events: db.prepare('SELECT COUNT(*) AS n FROM request_events').get().n,
    notifications: db.prepare('SELECT COUNT(*) AS n FROM notifications').get().n,
  };
}

/**
 * Derives inbox entries from the seeded history, so notifications can never
 * describe something the action timeline does not show.
 */
function seedNotifications(db) {
  const RELEVANT = {
    'Request submitted': { type: 'submission', roles: ['faculty'] },
    'Issue verified': { type: 'verification', roles: ['official'] },
    'Forwarded to department': { type: 'assignment', roles: ['official'] },
    'Request acknowledged': { type: 'status', roles: ['faculty'] },
    'Work started': { type: 'status', roles: ['faculty'] },
    'Request put on hold': { type: 'status', roles: ['faculty'] },
    'Repair marked complete': { type: 'resolution', roles: ['faculty'] },
    'Repair confirmed by reporter': { type: 'resolution', roles: ['faculty', 'official'] },
    'Issue reopened': { type: 'reopen', roles: ['faculty', 'official'] },
    'Request rejected': { type: 'status', roles: [] },
    'Marked as duplicate': { type: 'status', roles: [] },
  };

  const cutoff = ago(21);
  const events = db
    .prepare(
      `SELECT e.*, rq.title, rq.reported_by
         FROM request_events e
         JOIN requests rq ON rq.id = e.request_id
        WHERE e.created_at >= ?
        ORDER BY e.created_at`,
    )
    .all(cutoff);

  const insert = db.prepare(
    `INSERT INTO notifications (user_id, type, request_id, title, body, read_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const byRole = db.prepare('SELECT id FROM users WHERE role = ? AND active = 1 AND id IS NOT ?');

  // Everything older than three days starts read, so unread counts look real.
  const readCutoff = new Date(base - 3 * DAY).toISOString();

  for (const event of events) {
    const mapping = RELEVANT[event.action];
    if (!mapping) continue;

    const title = `${event.request_id} — ${event.action}`;
    const body = `${event.title}. ${event.details ?? ''}`.trim();
    const readAt = event.created_at < readCutoff ? event.created_at : null;

    const recipients = new Set();
    if (event.reported_by !== event.actor_id) recipients.add(event.reported_by);
    for (const role of mapping.roles) {
      for (const row of byRole.all(role, event.actor_id)) recipients.add(row.id);
    }

    for (const userId of recipients) {
      insert.run(userId, mapping.type, event.request_id, title, body, readAt, event.created_at);
    }
  }

  // Overdue alerts for anything genuinely past its date.
  const overdue = db
    .prepare(
      `SELECT id, title, expected_completion FROM requests
        WHERE expected_completion IS NOT NULL
          AND expected_completion < ?
          AND status NOT IN ('closed','rejected','duplicate','awaiting_verification')`,
    )
    .all(new Date().toISOString());

  for (const request of overdue) {
    for (const role of ['faculty', 'official']) {
      for (const row of byRole.all(role, null)) {
        insert.run(
          row.id,
          'overdue',
          request.id,
          `${request.id} — Past its expected completion date`,
          `${request.title} is still open after the expected completion date.`,
          null,
          request.expected_completion,
        );
      }
    }
  }
}

/* Run directly: node src/db/seed.js */
const invokedDirectly = process.argv[1]?.endsWith('seed.js');
if (invokedDirectly) {
  const counts = seed();
  console.log('Seeded ClassFix demo data:');
  for (const [key, value] of Object.entries(counts)) {
    console.log(`  ${key.padEnd(14)} ${value}`);
  }
  console.log(`\nAll seed accounts use the password: ${config.seedPassword}`);
  console.log('  student  aarthi@example-college.demo');
  console.log('  faculty  meera@example-college.demo');
  console.log('  official ravi@example-college.demo');
  console.log('  admin    admin@example-college.demo');
  closeDb();
}
