"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { notificationsApi } from "@/lib/api/notifications";
import type { NotificationResponse } from "@/lib/types";

const POLL_INTERVAL_MS = 30_000; // 30s

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnreadCount = useCallback(async (patientId: string) => {
    try {
      const data = await notificationsApi.unreadCount(patientId);
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      // Non-critical — bell badge fails silently
    }
  }, []);

  const fetchNotifications = useCallback(async (
    patientId: string,
    status?: "unread" | "read"
  ) => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationsApi.list(patientId, { status, limit: 50 });
      setNotifications(data);
      // Recompute unread count from fetched list using backend is_unread field
      setUnreadCount(data.filter(n => n.is_unread).length);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (patientId: string, ids: string[]) => {
    await notificationsApi.markRead(patientId, { notification_ids: ids });
    setNotifications(prev =>
      prev.map(n =>
        ids.includes(n.id)
          ? { ...n, status: "read" as const, is_unread: false, read_at: new Date().toISOString() }
          : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - ids.length));
  }, []);

  /**
   * Acknowledge an alert notification.
   * ONLY this function decrements badge — not opening the list, not clicking.
   * action = 'handled' | 'ongoing'
   */
  const acknowledge = useCallback(async (
    patientId: string,
    notificationId: string,
    action: "handled" | "ongoing"
  ) => {
    try {
      await notificationsApi.acknowledge(patientId, notificationId, { action });
      if (action === "handled") {
        setNotifications(prev => {
          const target = prev.find(n => n.id === notificationId);
          if (target?.is_unread) setUnreadCount(c => Math.max(0, c - 1));
          return prev.filter(n => n.id !== notificationId);
        });
      } else {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId
              ? { ...n, acknowledge_action: "ongoing", acknowledged_at: new Date().toISOString(), is_unread: false }
              : n
          )
        );
        setUnreadCount(prev => {
          const wasUnread = notifications.find(n => n.id === notificationId)?.is_unread ?? false;
          return wasUnread ? Math.max(0, prev - 1) : prev;
        });
      }
    } catch (e) {
      console.error("acknowledge failed", e);
    }
  }, [notifications]);

  /**
   * Start auto-polling for a patient.
   * Polls every 30s. Stops when stopPoll() called or component unmounts.
   */
  const startPoll = useCallback((patientId: string, status?: "unread" | "read") => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      fetchNotifications(patientId, status);
    }, POLL_INTERVAL_MS);
  }, [fetchNotifications]);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopPoll(), [stopPoll]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markRead,
    acknowledge,
    startPoll,
    stopPoll,
  };
}
