import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppStoreContext } from './appStoreContext.js';
import { ApiError, api, getToken, setToken } from '../services/api.js';
import { useToast } from '../hooks/useToast.js';

const EMPTY_STATE = {
  buildings: [],
  floors: [],
  rooms: [],
  departments: [],
  requests: [],
  notifications: [],
  announcements: [],
};

/**
 * Holds the signed-in user and the data loaded from the API.
 *
 * `state` keeps the same shape the prototype used, so the pure helpers in
 * locationService/requestService and every dashboard still work unchanged —
 * only the source of the data moved from local storage to the server.
 */
export function AppStoreProvider({ children }) {
  const toast = useToast();

  const [user, setUser] = useState(null);
  const [state, setState] = useState(EMPTY_STATE);
  const [status, setStatus] = useState(getToken() ? 'restoring' : 'anonymous');
  const [unreadCount, setUnreadCount] = useState(0);

  /** Pulls everything the shell needs after sign-in. */
  const loadAll = useCallback(async () => {
    const [locations, requests, notifications, announcements] = await Promise.all([
      api.locations(),
      api.allRequests(),
      api.notifications({ limit: 200 }),
      api.announcements(),
    ]);

    setState({
      ...locations,
      requests: requests.items,
      notifications: notifications.items,
      announcements: announcements.items,
    });
    setUnreadCount(notifications.unread);
  }, []);

  /* Restore a session from a stored token on first load. */
  useEffect(() => {
    if (status !== 'restoring') return;

    let cancelled = false;
    (async () => {
      try {
        const { user: me } = await api.me();
        if (cancelled) return;
        setUser(me);
        await loadAll();
        if (!cancelled) setStatus('ready');
      } catch (error) {
        if (cancelled) return;
        // An expired or rejected token just means signing in again.
        if (error instanceof ApiError && error.status === 0) {
          toast.error(error.message);
        }
        setToken(null);
        setStatus('anonymous');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, loadAll, toast]);

  /** Reloads requests and the unread count after a change. */
  const refresh = useCallback(async () => {
    try {
      const [requests, notifications] = await Promise.all([
        api.allRequests(),
        api.notifications({ limit: 200 }),
      ]);
      setState((current) => ({
        ...current,
        requests: requests.items,
        notifications: notifications.items,
      }));
      setUnreadCount(notifications.unread);
    } catch {
      // A failed refresh leaves the previous data on screen; the next action
      // will try again.
    }
  }, []);

  const refreshLocations = useCallback(async () => {
    const locations = await api.locations();
    setState((current) => ({ ...current, ...locations }));
  }, []);

  /**
   * Runs an API call, turning a failure into a toast and returning null, so
   * callers can write `if (!result) return;` instead of try/catch everywhere.
   */
  const run = useCallback(
    async (action, { successMessage, onError } = {}) => {
      try {
        const result = await action();
        if (successMessage) toast.success(successMessage);
        return result ?? true;
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
        if (onError) onError(error);
        else toast.error(message);

        if (error instanceof ApiError && error.status === 401) {
          setToken(null);
          setUser(null);
          setState(EMPTY_STATE);
          setStatus('anonymous');
        }
        return null;
      }
    },
    [toast],
  );

  /* ------------------------------------------------------------ session */

  const signIn = useCallback(
    async (email, password) => {
      try {
        const { token, user: me } = await api.login(email, password);
        setToken(token);
        setUser(me);
        await loadAll();
        setStatus('ready');
        return { ok: true };
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : 'Could not sign in. Please try again.';
        return { ok: false, message };
      }
    },
    [loadAll],
  );

  const signUp = useCallback(
    async (payload) => {
      try {
        const { token, user: me } = await api.register(payload);
        setToken(token);
        setUser(me);
        await loadAll();
        setStatus('ready');
        return { ok: true };
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : 'Could not create that account.';
        return { ok: false, message, fieldErrors: error?.fieldErrors ?? {} };
      }
    },
    [loadAll],
  );

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    setState(EMPTY_STATE);
    setUnreadCount(0);
    setStatus('anonymous');
  }, []);

  /* ----------------------------------------------------------- requests */

  const createRequest = useCallback(
    async ({ photoFile, ...payload }) => {
      const created = await run(() => api.createRequest(payload));
      if (!created) return null;

      let request = created.request;

      if (photoFile) {
        const uploaded = await run(() => api.uploadPhoto(request.id, photoFile), {
          onError: () =>
            toast.warning(`${request.id} was created, but the photo could not be uploaded.`),
        });
        if (uploaded?.request) request = uploaded.request;
      }

      toast.success(`${request.id} submitted.`);
      await refresh();
      return request;
    },
    [run, refresh, toast],
  );

  const applyAction = useCallback(
    async (requestId, actionId, input = {}) => {
      const result = await run(() => api.applyAction(requestId, { action: actionId, ...input }));
      if (!result) return null;

      const latest = result.request.timeline.at(-1);
      toast.success(`${requestId}: ${latest.action.toLowerCase()}.`);
      await refresh();
      return result.request;
    },
    [run, refresh, toast],
  );

  const addComment = useCallback(
    async (requestId, body) => {
      const result = await run(() => api.addComment(requestId, body), {
        successMessage: 'Comment added.',
      });
      if (!result) return null;
      await refresh();
      return result.request;
    },
    [run, refresh],
  );

  const toggleUpvote = useCallback(
    async (requestId) => {
      const result = await run(() => api.toggleUpvote(requestId));
      if (!result) return null;
      toast.info(result.added ? 'Upvote recorded.' : 'Upvote removed.');
      await refresh();
      return result.request;
    },
    [run, refresh, toast],
  );

  /* ------------------------------------------------------ notifications */

  const markNotificationRead = useCallback(
    async (id, read = true) => {
      const result = await run(() => api.setNotificationRead(id, read));
      if (!result) return;
      setState((current) => ({
        ...current,
        notifications: current.notifications.map((item) =>
          item.id === id ? { ...item, read } : item,
        ),
      }));
      setUnreadCount(result.unread);
    },
    [run],
  );

  const markAllNotificationsRead = useCallback(async () => {
    const result = await run(() => api.markAllNotificationsRead(), {
      successMessage: 'All notifications marked as read.',
    });
    if (!result) return;
    setState((current) => ({
      ...current,
      notifications: current.notifications.map((item) => ({ ...item, read: true })),
    }));
    setUnreadCount(0);
  }, [run]);

  /* --------------------------------------------------------- management */

  const saveRecord = useCallback(
    async (kind, record, message) => {
      const { id, ...payload } = record;
      const creators = {
        building: api.createBuilding,
        floor: api.createFloor,
        room: api.createRoom,
        department: api.createDepartment,
      };
      const updaters = {
        building: api.updateBuilding,
        floor: api.updateFloor,
        room: api.updateRoom,
        department: api.updateDepartment,
      };

      const result = await run(() => (id ? updaters[kind](id, payload) : creators[kind](payload)), {
        successMessage: message,
      });
      if (!result) return false;

      await refreshLocations();
      return true;
    },
    [run, refreshLocations],
  );

  const removeRecord = useCallback(
    async (kind, id) => {
      const removers = {
        building: api.deleteBuilding,
        floor: api.deleteFloor,
        room: api.deleteRoom,
        department: api.deleteDepartment,
      };

      const result = await run(() => removers[kind](id));
      if (!result) return false;

      toast.success(
        result.deactivated
          ? 'That record is referenced by existing requests, so it was deactivated instead of deleted.'
          : 'Record deleted.',
      );
      await refreshLocations();
      await refresh();
      return true;
    },
    [run, refreshLocations, refresh, toast],
  );

  const value = useMemo(
    () => ({
      state,
      user,
      role: user?.role ?? null,
      status,
      isSignedIn: status === 'ready' && Boolean(user),
      unreadCount,
      signIn,
      signUp,
      signOut,
      refresh,
      createRequest,
      applyAction,
      addComment,
      toggleUpvote,
      markNotificationRead,
      markAllNotificationsRead,
      saveRecord,
      removeRecord,
    }),
    [
      state,
      user,
      status,
      unreadCount,
      signIn,
      signUp,
      signOut,
      refresh,
      createRequest,
      applyAction,
      addComment,
      toggleUpvote,
      markNotificationRead,
      markAllNotificationsRead,
      saveRecord,
      removeRecord,
    ],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}
