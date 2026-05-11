"use client";

import { useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { CrisisModal } from "@/components/crisis/CrisisModal";
import { authStorage } from "@/lib/auth-storage";
import { notificationsApi } from "@/lib/api/notifications";

const ACTIVE_PATIENT_KEY = "cc_active_patient_id";
const POLL_INTERVAL_MS = 30_000;

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof authStorage.getUser>>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [crisisOpen, setCrisisOpen] = useState(false);
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.replace("/login");
      return;
    }
    setUser(authStorage.getUser());
    setActivePatientId(localStorage.getItem(ACTIVE_PATIENT_KEY));
    setMounted(true);
  }, [router]);

  const refreshBadge = useCallback(async () => {
    const patientId = localStorage.getItem(ACTIVE_PATIENT_KEY);
    if (!patientId) return;
    try {
      const data = await notificationsApi.unreadCount(patientId);
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      // Silent
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    refreshBadge();
    intervalRef.current = setInterval(refreshBadge, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [mounted, refreshBadge]);

  if (!mounted) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          patientName={user?.name ?? undefined}
          unreadCount={unreadCount}
          onNotificationClick={() => router.push("/notifications")}
          onCrisisClick={activePatientId ? () => setCrisisOpen(true) : undefined}
        />
        <main className="flex-1 overflow-y-auto p-6 bg-[var(--color-bg)]">
          {children}
        </main>
      </div>

      {activePatientId && (
        <CrisisModal
          open={crisisOpen}
          patientId={activePatientId}
          onClose={() => setCrisisOpen(false)}
          onExited={refreshBadge}
        />
      )}
    </div>
  );
}
