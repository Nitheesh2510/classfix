/**
 * The single place the frontend talks to the ClassFix API.
 *
 * Responsibilities:
 *  - attach the bearer token
 *  - turn error responses into thrown ApiError objects with a usable message
 *  - normalise the database's snake_case location rows into the camelCase
 *    shape the rest of the app already expects
 */

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const TOKEN_KEY = 'classfix.token';

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  /** Field-level validation messages, if the server sent any. */
  get fieldErrors() {
    if (!Array.isArray(this.details)) return {};
    return this.details.reduce((map, item) => ({ ...map, [item.field]: item.message }), {});
  }
}

/* ---------------------------------------------------------------- token */

export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage can be unavailable in private browsing; the session still works
    // until the page is reloaded.
  }
}

/* --------------------------------------------------------------- request */

async function request(method, path, { body, formData, auth = true } = {}) {
  const headers = {};
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: formData ?? (body ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError(
      0,
      `Could not reach the ClassFix API at ${BASE_URL}. Is the backend running?`,
    );
  }

  if (response.status === 204) return null;

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error?.message ?? `Request failed (${response.status}).`;
    throw new ApiError(response.status, message, payload?.error?.details);
  }

  return payload;
}

const get = (path, options) => request('GET', path, options);
const post = (path, body, options) => request('POST', path, { ...options, body });
const put = (path, body) => request('PUT', path, { body });
const patch = (path, body) => request('PATCH', path, { body });
const del = (path) => request('DELETE', path);

/* ------------------------------------------------------------ normalise */

/** Location rows arrive as database columns; the UI wants camelCase. */
const toBuilding = (row) => ({
  id: row.id,
  name: row.name,
  code: row.code,
  description: row.description ?? '',
  active: Boolean(row.active),
});

const toFloor = (row) => ({
  id: row.id,
  buildingId: row.building_id,
  name: row.name,
  level: row.level,
  active: Boolean(row.active),
});

const toRoom = (row) => ({
  id: row.id,
  floorId: row.floor_id,
  number: row.number,
  name: row.name ?? null,
  type: row.type,
  capacity: row.capacity,
  active: Boolean(row.active),
});

const toDepartment = (row) => ({
  id: row.id,
  name: row.name,
  code: row.code,
  contact: row.contact ?? '',
  headUserId: row.head_user_id ?? null,
  headName: row.headName ?? null,
  active: Boolean(row.active),
  requestCount: row.requestCount,
  overdueCount: row.overdueCount,
});

/* ------------------------------------------------------------------- api */

export const api = {
  /* auth */
  login: (email, password) => post('/api/auth/login', { email, password }, { auth: false }),
  register: (payload) => post('/api/auth/register', payload, { auth: false }),
  me: () => get('/api/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    post('/api/auth/password', { currentPassword, newPassword }),

  /* reference data */
  async locations() {
    const data = await get('/api/locations');
    return {
      buildings: data.buildings.map(toBuilding),
      floors: data.floors.map(toFloor),
      rooms: data.rooms.map(toRoom),
      departments: data.departments.map(toDepartment),
    };
  },

  async buildings() {
    const data = await get('/api/locations/buildings');
    return data.items.map((row) => ({
      ...toBuilding(row),
      requestCount: row.requestCount,
      floorCount: row.floorCount,
    }));
  },
  createBuilding: (payload) => post('/api/locations/buildings', payload),
  updateBuilding: (id, payload) => put(`/api/locations/buildings/${id}`, payload),
  deleteBuilding: (id) => del(`/api/locations/buildings/${id}`),

  async floors() {
    const data = await get('/api/locations/floors');
    return data.items.map((row) => ({
      ...toFloor(row),
      requestCount: row.requestCount,
      roomCount: row.roomCount,
    }));
  },
  createFloor: (payload) => post('/api/locations/floors', payload),
  updateFloor: (id, payload) => put(`/api/locations/floors/${id}`, payload),
  deleteFloor: (id) => del(`/api/locations/floors/${id}`),

  async rooms() {
    const data = await get('/api/locations/rooms');
    return data.items.map((row) => ({ ...toRoom(row), requestCount: row.requestCount }));
  },
  createRoom: (payload) => post('/api/locations/rooms', payload),
  updateRoom: (id, payload) => put(`/api/locations/rooms/${id}`, payload),
  deleteRoom: (id) => del(`/api/locations/rooms/${id}`),

  async departments() {
    const data = await get('/api/locations/departments');
    return data.items.map(toDepartment);
  },
  createDepartment: (payload) => post('/api/locations/departments', payload),
  updateDepartment: (id, payload) => put(`/api/locations/departments/${id}`, payload),
  deleteDepartment: (id) => del(`/api/locations/departments/${id}`),

  officials: () => get('/api/users/officials'),

  /* requests */
  allRequests: () => get('/api/requests/all'),
  requests: (params) => get(`/api/requests?${new URLSearchParams(params)}`),
  request: (id) => get(`/api/requests/${id}`),
  createRequest: (payload) => post('/api/requests', payload),
  applyAction: (id, payload) => post(`/api/requests/${id}/actions`, payload),
  addComment: (id, body) => post(`/api/requests/${id}/comments`, { body }),
  toggleUpvote: (id) => post(`/api/requests/${id}/upvote`, {}),

  uploadPhoto: (id, file) => {
    const formData = new FormData();
    formData.append('photo', file);
    return request('POST', `/api/requests/${id}/photos`, { formData });
  },

  /** Fetches an attachment with auth and returns an object URL for <img>. */
  async attachmentUrl(requestId, attachmentId) {
    const token = getToken();
    const response = await fetch(
      `${BASE_URL}/api/requests/${requestId}/attachments/${attachmentId}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!response.ok) throw new ApiError(response.status, 'That image could not be loaded.');
    return URL.createObjectURL(await response.blob());
  },

  /* notifications */
  notifications: (params = {}) => get(`/api/notifications?${new URLSearchParams(params)}`),
  setNotificationRead: (id, read) => patch(`/api/notifications/${id}`, { read }),
  markAllNotificationsRead: () => post('/api/notifications/read-all', {}),
  announcements: () => get('/api/announcements'),

  /* statistics */
  summary: (params = {}) => get(`/api/stats/summary?${new URLSearchParams(params)}`),
  dashboard: (params = {}) => get(`/api/stats/dashboard?${new URLSearchParams(params)}`),
  health: () => get('/api/health', { auth: false }),
};
