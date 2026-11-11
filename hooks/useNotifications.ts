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

const POLL_BASE_MS = 30_000;
const POLL_MAX_MS = 5 * 60_000;

/** Exponential backoff for the notification poll: 30s, 60s, 120s… capped at 5min. */
export function nextPollDelay(consecutiveFailures: number): number {
  return Math.min(POLL_BASE_MS * 2 ** Math.max(0, consecutiveFailures), POLL_MAX_MS);
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [attention, setAttention] = useState<AttentionItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  /** Fetches quietly; resolves true on success, false on any failure (never throws). */
  const fetchNotifications = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    try {
      // "Today" is the reader's day, not the server's — a school in UTC+1
      // should not be told yesterday's register is still open at 00:30.
      const data = await apiFetch<NotificationResponse>(
        `/notifications?date=${localDay()}`,
        { showErrorToast: false },
      );
      if (data && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        const derivedUnread = data.notifications.filter((n) => !n.read).length;
        setUnreadCount(
          typeof data.unreadCount === "number" ? data.unreadCount : derivedUnread,
        );
        setAttention(Array.isArray(data.attention) ? data.attention : []);
      }
      return true;
    } catch {
      // ignore unauthenticated or network errors gracefully
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Poll on a backoff, not a fixed interval: a healthy session polls every
  // POLL_BASE_MS, but every consecutive failure doubles the wait (capped at
  // POLL_MAX_MS). A dead session used to 401-flood the backend every 30s for
  // as long as the tab stayed open — burning Vercel CPU on both sides with
  // each poll also firing the token-refresh chain. Failures also pause the
  // loop entirely while the tab is hidden: nobody is reading the bell badge.
  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let failures = 0;
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      if (typeof document !== "undefined" && document.hidden) {
        scheduleNext(); // hidden: skip the fetch, keep the loop alive
        return;
      }
      const ok = await fetchNotifications();
      failures = ok ? 0 : failures + 1;
      scheduleNext();
    };

    const scheduleNext = () => {
      if (stopped) return;
      timer = setTimeout(tick, nextPollDelay(failures));
    };

    scheduleNext();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [fetchNotifications, user]);

  const markAsRead = async (id: string) => {
    // Optimistic local state update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
    } catch {
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await apiFetch("/notifications/read-all", { method: "POST" });
    } catch {
      fetchNotifications();
    }
  };

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
