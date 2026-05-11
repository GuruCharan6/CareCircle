"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search, LogOut, Upload, ShieldAlert } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { cn } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":       "Dashboard",
  "/chatbot":         "AI Assistant",
  "/upload":          "Upload",
  "/documents":       "Documents",
  "/calendar":        "Calendar",
  "/doctor-briefing": "Doctor Briefing",
  "/notifications":   "Notifications",
  "/medications":     "Medications",
  "/lab-results":     "Lab Results",
  "/daily-digest":    "Daily Digest",
  "/drug-interactions": "Drug Interactions",
  "/observations":    "Observations",
  "/history":         "Patient History",
  "/caregivers":      "Care Team",
  "/prescribers":     "Prescribers",
  "/refills":         "Refills",
  "/search":          "Search",
};

interface TopbarProps {
  patientName?: string;
  unreadCount?: number;
  onNotificationClick?: () => void;
  onCrisisClick?: () => void;
  className?: string;
}

function Topbar({ patientName, unreadCount = 0, onNotificationClick, onCrisisClick, className }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const pageTitle =
    Object.entries(PAGE_TITLES).find(([key]) => pathname === key || pathname.startsWith(key + "/"))?.[1] ??
    "Dashboard";

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.clear();
      router.replace("/login");
    }
  }

  return (
    <header
      className={cn(
        "h-14 bg-white border-b border-[var(--color-surface)] flex items-center justify-between px-6 gap-4 shrink-0 shadow-sm z-20",
        className
      )}
    >
      {/* Left: Page title */}
      <h1 className="text-lg font-black text-[var(--color-primary)] tracking-tight">CareCircle</h1>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {onCrisisClick && (
          <button
            onClick={onCrisisClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-bold text-xs"
          >
            <ShieldAlert size={15} />
            <span>SOS</span>
          </button>
        )}

        <Link
          href="/search"
          className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg)] transition-all"
          title="Search"
        >
          <Search size={20} />
        </Link>

        <Link
          href="/upload"
          className="flex items-center gap-2 px-4 h-9 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary)]/90 transition-colors"
        >
          <Upload size={15} />
          <span className="hidden sm:inline">Upload Document</span>
        </Link>

        <NotificationBell unreadCount={unreadCount} onClick={onNotificationClick} className="w-10 h-10" />

        <div className="h-8 w-px bg-[var(--color-surface)] mx-1" />

        <button
          onClick={handleLogout}
          aria-label="Logout"
          className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--color-muted)] hover:text-red-600 hover:bg-red-50 transition-all"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}

export { Topbar };
