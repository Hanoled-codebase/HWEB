"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { localDay } from "@/lib/attendance";

export type NotificationItem = {
  id: string;
  organizationId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  score?: number;
  expectedTotal?: number;
  percentage?: number;
  createdAt: string;
  /** Page that fixes or explains this item; null when there is nowhere to go. */
  href?: string | null;
};

/**
 * A job that is still open, derived on the server on every read: an unmarked
 * register, an invite nobody accepted. Unlike a notification there is nothing
 * to "read" — it stays until the work is done and then disappears.
 */
export type AttentionItem = {
  id: string;
  kind: "attendance" | "invites" | "admissions" | string;
  type: string;
  title: string;
  message: string;
  href: string;
  createdAt: string;
  count: number;
};

type NotificationResponse = {
  notifications: NotificationItem[];
  unreadCount: number;
  attention?: AttentionItem[];
  attentionCount?: number;
};

type NotificationStore = {
  userId: string | null;
  fetchedDay: string | null;
  notifications: NotificationItem[];
  attention: AttentionItem[];
  unreadCount: number;
  loading: boolean;
};

const initialStore = (): NotificationStore => ({
  userId: null,
  fetchedDay: null,
  notifications: [],
  attention: [],
  unreadCount: 0,
  loading: true,
});

let sharedStore: NotificationStore = initialStore();
let inFlightFetch: Promise<boolean> | null = null;
let inFlightKey: string | null = null;
const storeListeners = new Set<(next: NotificationStore) => void>();

function updateSharedStore(next: NotificationStore) {
  sharedStore = next;
  storeListeners.forEach((listener) => listener(sharedStore));
}

/** Test helper to clear shared notification state between cases. */
export function resetNotificationsStore() {
  sharedStore = initialStore();
  inFlightFetch = null;
  inFlightKey = null;
  storeListeners.clear();
}

async function loadSharedNotifications(userId: string, force: boolean): Promise<boolean> {
  const day = localDay();
  const key = `${userId}:${day}`;

  if (sharedStore.userId !== userId) {
    updateSharedStore({ ...initialStore(), userId });
  }

  if (!force && sharedStore.userId === userId && sharedStore.fetchedDay === day && !sharedStore.loading) {
    return true;
  }

  if (inFlightFetch && inFlightKey === key) {
    return inFlightFetch;
  }

  const run = (async (): Promise<boolean> => {
    try {
      // "Today" is the reader's day, not the server's — a school in UTC+1
      // should not be told yesterday's register is still open at 00:30.
      const data = await apiFetch<NotificationResponse>(
        `/notifications?date=${day}`,
        { showErrorToast: false },
      );
      if (data && Array.isArray(data.notifications)) {
        const derivedUnread = data.notifications.filter((n) => !n.read).length;
        updateSharedStore({
          userId,
          fetchedDay: day,
          notifications: data.notifications,
          unreadCount:
            typeof data.unreadCount === "number" ? data.unreadCount : derivedUnread,
          attention: Array.isArray(data.attention) ? data.attention : [],
          loading: false,
        });
      } else {
        updateSharedStore({ ...sharedStore, userId, fetchedDay: day, loading: false });
      }
      return true;
    } catch {
      // ignore unauthenticated or network errors gracefully
      updateSharedStore({ ...sharedStore, userId, loading: false });
      return false;
    } finally {
      if (inFlightKey === key) {
        inFlightFetch = null;
        inFlightKey = null;
      }
    }
  })();

  inFlightFetch = run;
  inFlightKey = key;
  return run;
}

export function useNotifications() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [snapshot, setSnapshot] = useState<NotificationStore>(() =>
    userId && sharedStore.userId === userId ? sharedStore : initialStore(),
  );

  /** Fetches quietly; resolves true on success, false on any failure (never throws). */
  const fetchNotifications = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    return loadSharedNotifications(userId, true);
  }, [userId]);

  // Subscribe to shared store and load once per active session across mounted
  // desktop + mobile notification bells so every page load issues one request.
  useEffect(() => {
    storeListeners.add(setSnapshot);
    if (!userId) {
      if (sharedStore.userId !== null) {
        updateSharedStore(initialStore());
      }
      return () => {
        storeListeners.delete(setSnapshot);
      };
    }

    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      if (sharedStore.userId === userId) {
        setSnapshot(sharedStore);
      }
      void loadSharedNotifications(userId, false);
    });
    return () => {
      cancelled = true;
      storeListeners.delete(setSnapshot);
    };
  }, [userId]);

  const markAsRead = async (id: string) => {
    // Optimistic shared state update across desktop and mobile bells
    const nextNotifications = sharedStore.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    updateSharedStore({
      ...sharedStore,
      notifications: nextNotifications,
      unreadCount: Math.max(0, sharedStore.unreadCount - 1),
    });

    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
    } catch {
      void fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    updateSharedStore({
      ...sharedStore,
      notifications: sharedStore.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    });

    try {
      await apiFetch("/notifications/read-all", { method: "POST" });
    } catch {
      void fetchNotifications();
    }
  };

  const { notifications, attention, unreadCount, loading } = snapshot;
  const localUnreadInList = notifications.filter((n) => !n.read).length;
  const effectiveUnreadNotifications = Math.max(unreadCount, localUnreadInList);

  return {
    notifications,
    attention,
    unreadCount: effectiveUnreadNotifications,
    unreadNotificationsCount: effectiveUnreadNotifications,
    /** What the bell badge counts: unread confirmations plus open jobs. */
    badgeCount: effectiveUnreadNotifications + attention.length,
    loading,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}
