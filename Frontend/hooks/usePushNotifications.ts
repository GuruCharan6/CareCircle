"use client";

import { useEffect } from "react";
import { authApi } from "@/lib/api/auth";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const TOKEN_SAVED_KEY = "cc_fcm_token_saved";

export function usePushNotifications() {
  useEffect(() => {
    // VAPID key required — skip if not configured yet
    if (!VAPID_KEY) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "denied") return;

    async function init() {
      const { getFirebaseMessaging } = await import("@/lib/firebase");
      const messaging = await getFirebaseMessaging();
      if (!messaging) return;

      // Request permission if not yet granted
      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
        // Clear saved flag so we re-save with fresh token after permission grant
        localStorage.removeItem(TOKEN_SAVED_KEY);
      }

      const { getToken, onMessage } = await import("firebase/messaging");
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (!token) return;

      // Save token to backend only if changed
      const lastSaved = localStorage.getItem(TOKEN_SAVED_KEY);
      if (lastSaved !== token) {
        const user = await authApi.me();
        const merged = { ...(user.preferences ?? {}), fcm_token: token };
        await authApi.updateProfile({ preferences: merged });
        localStorage.setItem(TOKEN_SAVED_KEY, token);
      }

      // Handle foreground messages — show browser notification
      onMessage(messaging, (payload) => {
        const title = payload.notification?.title ?? "CareCircle Alert";
        const body = payload.notification?.body ?? "";
        new Notification(title, {
          body,
          icon: "/icons/icon-192.png",
          tag: (payload.data?.notification_id as string) ?? "cc-alert",
        });
      });
    }

    init().catch(() => { /* silent — push is enhancement, not critical */ });
  }, []);
}
