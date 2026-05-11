"use client";

import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  unreadCount?: number;
  onClick?: () => void;
  className?: string;
}

function NotificationBell({ unreadCount = 0, onClick, className }: NotificationBellProps) {
  return (
    <button
      onClick={onClick}
      aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
      className={cn(
        "relative flex items-center justify-center rounded-xl text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg)] transition-all",
        !className?.includes("w-") && "p-2",
        className
      )}
    >
      <Bell size={20} />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-alert)] text-white text-[10px] font-bold flex items-center justify-center">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}

export { NotificationBell };
