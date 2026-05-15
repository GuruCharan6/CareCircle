"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Upload, Coffee, Sparkles, MoreHorizontal,
  Pill, BarChart2, FileText, CalendarDays, RefreshCw, Users,
  Bell, Stethoscope, Settings, Eye, TriangleAlert, FileClock, Search,
  Files, X, LogOut, ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authStorage } from "@/lib/auth-storage";

const BOTTOM_TABS = [
  { href: "/dashboard",    label: "Home",   icon: LayoutDashboard },
  { href: "/upload",       label: "Upload", icon: Upload },
  { href: "/daily-digest", label: "Digest", icon: Coffee },
  { href: "/chatbot",      label: "Ask AI", icon: Sparkles },
] as const;

const MORE_SECTIONS = [
  {
    title: "CLINICAL",
    items: [
      { href: "/medications",       label: "Medications",       icon: Pill },
      { href: "/lab-results",       label: "Lab Results",       icon: BarChart2 },
      { href: "/drug-interactions", label: "Drug Interactions", icon: TriangleAlert },
      { href: "/observations",      label: "Observations",      icon: Eye },
    ],
  },
  {
    title: "RECORDS",
    items: [
      { href: "/search",   label: "Search",          icon: Search },
      { href: "/documents",label: "Documents",        icon: Files },
      { href: "/history",  label: "Patient History",  icon: FileClock },
    ],
  },
  {
    title: "CARE TEAM",
    items: [
      { href: "/caregivers",  label: "Caregivers",  icon: Users },
      { href: "/prescribers", label: "Prescribers", icon: Stethoscope },
    ],
  },
  {
    title: "SCHEDULE",
    items: [
      { href: "/calendar",        label: "Calendar",        icon: CalendarDays },
      { href: "/refills",         label: "Refills",         icon: RefreshCw },
      { href: "/doctor-briefing", label: "Doctor Briefing", icon: FileText },
    ],
  },
  {
    title: "OTHER",
    items: [
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/settings",      label: "Settings",       icon: Settings },
    ],
  },
] as const;

interface BottomNavProps {
  unreadCount?: number;
  onCrisisClick?: () => void;
}

export function BottomNav({ unreadCount = 0, onCrisisClick }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.clear();
      router.replace("/login");
    }
  }

  function isActive(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
  }

  return (
    <>
      {/* Drawer backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* More drawer — slides up from bottom */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-[#0D3B6E] rounded-t-2xl transition-transform duration-300 ease-out lg:hidden",
          "max-h-[80vh] overflow-y-auto",
          drawerOpen ? "translate-y-0" : "translate-y-full"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Drawer handle */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-white/10">
          <span className="text-white font-bold text-base">More</span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Crisis button */}
        {onCrisisClick && (
          <div className="px-4 pt-3 pb-1">
            <button
              onClick={() => { setDrawerOpen(false); onCrisisClick(); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors font-bold text-sm"
            >
              <ShieldAlert size={16} />
              Emergency SOS
            </button>
          </div>
        )}

        {/* Nav sections */}
        <nav className="px-4 py-3 space-y-5">
          {MORE_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-2 pb-1">
                {section.title}
              </h3>
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                      active
                        ? "bg-[#1D9E75]/20 text-white"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon size={18} className={active ? "text-[#1D9E75]" : "text-white/40"} />
                    <span className="text-sm font-semibold">{label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-4 pb-4 pt-2 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm font-semibold">Sign out</span>
          </button>
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[var(--color-border)] lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch h-16">
          {BOTTOM_TABS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-150",
                  active ? "text-[#1D9E75]" : "text-[var(--color-muted)]"
                )}
              >
                <Icon size={22} />
                <span className={cn(
                  "tracking-tight",
                  active ? "text-[11px] font-bold" : "text-[11px] font-medium"
                )}>{label}</span>
              </Link>
            );
          })}

          {/* More tab */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-150 relative",
              drawerOpen ? "text-[#1D9E75]" : "text-[var(--color-muted)]"
            )}
          >
            <div className="relative">
              <MoreHorizontal size={22} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 bg-[#E24B4A] text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span className={cn(
              "tracking-tight",
              drawerOpen ? "text-[11px] font-bold" : "text-[11px] font-medium"
            )}>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
