"use client";

import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Pill,
  RefreshCw,
  Stethoscope,
  Upload,
  Zap,
  FileText,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NotificationResponse } from "@/lib/types";

interface Props {
  notification: NotificationResponse;
  patientId: string;
  onAcknowledge?: (id: string, action: "handled" | "ongoing") => void;
  onCrisisFollowUp?: (patientId: string, notifId: string) => void;
  onMarkRead?: (id: string) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type IconConfig = {
  icon: React.ElementType;
  bg: string;
  text: string;
  dot: string;
};

function getIconConfig(type: string, isUnread: boolean): IconConfig {
  const active = isUnread;
  switch (type) {
    case "alert":
      return { icon: AlertTriangle, bg: active ? "bg-red-500" : "bg-red-100", text: active ? "text-white" : "text-red-400", dot: "bg-red-500" };
    case "drug_interaction_alert":
      return { icon: Zap, bg: active ? "bg-red-500" : "bg-red-100", text: active ? "text-white" : "text-red-400", dot: "bg-red-500" };
    case "refill_reminder":
      return { icon: Pill, bg: active ? "bg-orange-500" : "bg-orange-100", text: active ? "text-white" : "text-orange-400", dot: "bg-orange-500" };
    case "calendar_reminder":
      return { icon: Calendar, bg: active ? "bg-blue-500" : "bg-blue-100", text: active ? "text-white" : "text-blue-400", dot: "bg-blue-500" };
    case "watch_event_card":
      return { icon: Stethoscope, bg: active ? "bg-yellow-500" : "bg-yellow-100", text: active ? "text-white" : "text-yellow-500", dot: "bg-yellow-500" };
    case "crisis_follow_up":
      return { icon: AlertTriangle, bg: active ? "bg-red-600" : "bg-red-100", text: active ? "text-white" : "text-red-400", dot: "bg-red-600" };
    case "staleness_notice":
      return { icon: Clock, bg: active ? "bg-purple-500" : "bg-purple-100", text: active ? "text-white" : "text-purple-400", dot: "bg-purple-500" };
    case "morning_digest":
    case "evening_digest":
      return { icon: RefreshCw, bg: active ? "bg-green-500" : "bg-green-100", text: active ? "text-white" : "text-green-400", dot: "bg-green-500" };
    default:
      return { icon: Bell, bg: active ? "bg-[var(--color-action)]" : "bg-[var(--color-border)]", text: active ? "text-white" : "text-[var(--color-muted)]", dot: "bg-[var(--color-action)]" };
  }
}

export function NotifItem({ notification, patientId, onAcknowledge, onCrisisFollowUp, onMarkRead }: Props) {
  const router = useRouter();
  const isUnread = notification.is_unread;
  const { icon: Icon, bg, text, dot } = getIconConfig(notification.type, isUnread);

  const unactioned = !notification.acknowledged_at;
  const canAddNote = unactioned && notification.type === "crisis_follow_up";
  const canAddToCalendar = isUnread && notification.type === "calendar_reminder" && unactioned;
  const canMarkRefilled = isUnread && notification.type === "refill_reminder" && unactioned;
  const canUpload = isUnread && (notification.type === "staleness_notice" || notification.type === "gap_reminder");
  // All unacknowledged notifications that don't have a specific action button show Handled
  const canShowHandled = unactioned && !canAddNote && !canAddToCalendar && !canMarkRefilled && !canUpload;

  const showUnreadDot = isUnread && !canShowHandled && !canAddNote && !canAddToCalendar && !canMarkRefilled && !canUpload;

  return (
    <div
      onClick={() => isUnread && onMarkRead?.(notification.id)}
      className={cn(
        "flex items-start gap-3 px-4 py-4 transition-colors",
        isUnread ? "bg-[var(--color-surface)] cursor-pointer hover:bg-slate-50" : "bg-white"
      )}
    >
      {/* Type icon — 36px circle */}
      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-1", bg)}>
        <Icon size={15} className={text} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm leading-snug",
            isUnread ? "font-semibold text-[var(--color-text)]" : "text-[var(--color-muted)]"
          )}>
            {notification.title}
          </p>
          {/* Timestamp + unread dot stacked on the right */}
          <div className="flex flex-col items-end shrink-0 gap-1">
            <span className="text-xs text-[var(--color-muted)] mt-0.5">
              {timeAgo(notification.created_at)}
            </span>
            {showUnreadDot && (
              <div className={cn("w-2 h-2 rounded-full", dot)} />
            )}
          </div>
        </div>

        <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-relaxed">
          {notification.body}
        </p>

        {/* Handled button — all non-specific-action notifications */}
        {canShowHandled && onAcknowledge && (
          <button
            onClick={e => { e.stopPropagation(); onAcknowledge(notification.id, "handled"); }}
            className="mt-2 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
          >
            <CheckCircle2 size={11} />
            Handled
          </button>
        )}

        {canAddNote && onCrisisFollowUp && (
          <button
            onClick={e => { e.stopPropagation(); onCrisisFollowUp(patientId, notification.id); }}
            className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 transition-colors"
          >
            <FileText size={11} />
            Add note / voice record →
          </button>
        )}

        {canAddToCalendar && (
          <button
            onClick={e => {
              e.stopPropagation();
              const dest = notification.linked_entity_id
                ? `/calendar?id=${notification.linked_entity_id}`
                : "/calendar";
              router.push(dest);
            }}
            className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            <Calendar size={11} />
            Review →
          </button>
        )}

        {canMarkRefilled && onAcknowledge && (
          <button
            onClick={e => { e.stopPropagation(); onAcknowledge(notification.id, "handled"); }}
            className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-colors"
          >
            <CheckCircle2 size={11} />
            Mark as refilled →
          </button>
        )}

        {canUpload && (
          <button
            onClick={e => { e.stopPropagation(); router.push("/"); }}
            className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 transition-colors"
          >
            <Upload size={11} />
            Upload document →
          </button>
        )}

        {notification.acknowledged_at && notification.acknowledge_action === "ongoing" && (
          <div className="mt-1.5">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
              ⚠ Ongoing
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
