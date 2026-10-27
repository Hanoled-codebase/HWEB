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

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [attention, setAttention] = useState<AttentionItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      // "Today" is the reader's day, not the server's — a school in UTC+1
      // should not be told yesterday's register is still open at 00:30.
      const data = await apiFetch<NotificationResponse>(
        `/notifications?date=${localDay()}`,
        { showErrorToast: false },
      );
      if (data && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
        setAttention(Array.isArray(data.attention) ? data.attention : []);
      }
    } catch {
      // ignore unauthenticated or network errors gracefully
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s poll
    return () => clearInterval(interval);
  }, [fetchNotifications]);

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

  return {
    notifications,
    attention,
    unreadCount,
    /** What the bell badge counts: unread confirmations plus open jobs. */
    badgeCount: unreadCount + attention.length,
    loading,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}
