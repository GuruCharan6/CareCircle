"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Search, LogOut, Upload, ShieldAlert } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { cn } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":       "Dashboard",
  "/chatbot":         "Ask AI",
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
        "h-14 bg-white border-b border-[var(--color-surface)] flex items-center justify-between px-4 lg:px-6 gap-3 shrink-0 shadow-sm z-20",
        className
      )}
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <Image src="/carecircle-logo.svg" alt="Logo" width={28} height={28} className="w-7 h-7 shrink-0" />
        <h1 className="text-lg font-black text-[var(--color-primary)] tracking-tight">CareCircle</h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* SOS — always visible, critical safety feature */}
        {onCrisisClick && (
          <button
            onClick={onCrisisClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-bold text-xs"
          >
            <ShieldAlert size={15} />
            <span>SOS</span>
          </button>
        )}

        {/* Notifications bell — visible on mobile + desktop */}
        <NotificationBell unreadCount={unreadCount} onClick={onNotificationClick} className="w-10 h-10" />

        {/* Desktop only */}
        <Link
          href="/search"
          className="hidden lg:flex w-10 h-10 items-center justify-center rounded-xl text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg)] transition-all"
          title="Search"
        >
          <Search size={20} />
        </Link>

        <Link
          href="/upload"
          className="hidden lg:flex items-center gap-2 px-4 h-9 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary)]/90 transition-colors"
        >
          <Upload size={15} />
          <span>Upload Document</span>
        </Link>

        <div className="hidden lg:block h-8 w-px bg-[var(--color-surface)] mx-1" />

        <button
          onClick={handleLogout}
          aria-label="Logout"
          className="hidden lg:flex w-10 h-10 items-center justify-center rounded-xl text-[var(--color-muted)] hover:text-red-600 hover:bg-red-50 transition-all"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}

export { Topbar };
