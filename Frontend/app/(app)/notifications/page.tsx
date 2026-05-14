"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCheck } from "lucide-react";
import { usePatient } from "@/hooks/usePatient";
import { useNotifications } from "@/hooks/useNotifications";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { NotificationList } from "@/components/notifications/NotificationList";
import { CrisisFollowUpModal } from "@/components/crisis/CrisisFollowUpModal";
import { ErrorState } from "@/components/ui/ErrorState";
import { cn } from "@/lib/utils";

type Filter = "all" | "unread";

export default function NotificationsPage() {
  const { activePatient } = usePatient();
  const {
    notifications,
    loading,
    error,
    fetchNotifications,
    markRead,
    acknowledge,
    startPoll,
    stopPoll,
  } = useNotifications();
  const [filter, setFilter] = useState<Filter>("all");
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpNotifId, setFollowUpNotifId] = useState<string | undefined>();

  const load = useCallback(() => {
    if (activePatient) {
      fetchNotifications(activePatient.id, filter === "unread" ? "unread" : undefined);
    }
  }, [activePatient?.id, filter, fetchNotifications]);

  useEffect(() => {
    load();
    if (activePatient) {
      startPoll(activePatient.id, filter === "unread" ? "unread" : undefined);
    }
    return () => stopPoll();
  }, [activePatient?.id, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAcknowledge(id: string, action: "handled" | "ongoing") {
    if (!activePatient) return;
    await acknowledge(activePatient.id, id, action);
  }

  async function handleMarkAllRead() {
    if (!activePatient) return;
    const nonActionableUnread = notifications
      .filter(n => n.is_unread && !n.requires_acknowledge)
      .map(n => n.id);
    if (nonActionableUnread.length) {
      await markRead(activePatient.id, nonActionableUnread);
    }
  }

  function handleCrisisFollowUp(_patientId: string, notifId: string) {
    setFollowUpNotifId(notifId);
    setFollowUpOpen(true);
  }

  const unreadCount = notifications.filter(n => n.is_unread).length;

  if (!activePatient) {
    return <p className="text-[var(--color-muted)] text-sm">No patient selected.</p>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-[var(--color-primary)]">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-[var(--color-muted)]">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck size={15} />
            Mark informational read
          </Button>
        )}
      </div>

      {/* Pill-style filter tabs */}
      <div className="flex gap-1 bg-[var(--color-surface)] rounded-xl p-1 w-fit">
        {(["all", "unread"] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors duration-150",
              filter === f
                ? "bg-[var(--color-primary)] text-white shadow-sm"
                : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="space-y-px">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-[var(--color-border)] animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} className="py-10" />
        ) : (
          <NotificationList
            notifications={notifications}
            patientId={activePatient.id}
            onAcknowledge={handleAcknowledge}
            onCrisisFollowUp={handleCrisisFollowUp}
            onMarkRead={(id) => markRead(activePatient.id, [id])}
          />
        )}
      </Card>

      <CrisisFollowUpModal
        open={followUpOpen}
        onClose={() => { setFollowUpOpen(false); setFollowUpNotifId(undefined); load(); }}
        patientId={activePatient.id}
        notificationId={followUpNotifId}
      />
    </div>
  );
}
