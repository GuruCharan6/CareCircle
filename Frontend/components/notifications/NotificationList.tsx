import { NotifItem } from "./NotifItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { Bell } from "lucide-react";
import type { NotificationResponse } from "@/lib/types";

interface Props {
  notifications: NotificationResponse[];
  patientId: string;
  onAcknowledge: (id: string, action: "handled" | "ongoing") => void;
  onCrisisFollowUp?: (patientId: string, notifId: string) => void;
  onMarkRead?: (id: string) => void;
}

export function NotificationList({ notifications, patientId, onAcknowledge, onCrisisFollowUp, onMarkRead }: Props) {
  if (!notifications.length) {
    return (
      <EmptyState
        icon={Bell}
        title="No notifications"
        description="You're all caught up."
      />
    );
  }

  return (
    <div className="divide-y divide-[var(--color-border)]">
      {notifications.map(n => (
        <NotifItem
          key={n.id}
          notification={n}
          patientId={patientId}
          onAcknowledge={onAcknowledge}
          onCrisisFollowUp={onCrisisFollowUp}
          onMarkRead={onMarkRead}
        />
      ))}
    </div>
  );
}
