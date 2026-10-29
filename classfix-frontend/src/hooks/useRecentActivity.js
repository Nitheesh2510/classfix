import { useEffect, useState } from 'react';
import { api } from '../services/api.js';

/**
 * Recent action-history entries for the dashboards.
 *
 * This comes from the API rather than being derived on the client: a request
 * list response does not carry timelines, and the server can order the history
 * table directly.
 */
export function useRecentActivity(limit = 8) {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    let cancelled = false;

    api
      .dashboard()
      .then((data) => {
        if (!cancelled) setEntries((data.recentActivity ?? []).slice(0, limit));
      })
      .catch(() => {
        // The dashboard still renders without the activity panel.
        if (!cancelled) setEntries([]);
      });

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return entries;
}
