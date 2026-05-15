"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePatient } from "@/hooks/usePatient";
import { usePatientState } from "@/hooks/usePatientState";
import { useDocuments } from "@/hooks/useDocuments";
import { useLabResults } from "@/hooks/useLabResults";
import { formatDateLocal } from "@/lib/utils";
import {
  LayoutDashboard, Pill, BarChart2, FileText, CalendarDays,
  RefreshCw, Users, Bell, Sparkles, Stethoscope, Eye, Settings, Plus,
  ChevronLeft, ChevronRight, Menu, TriangleAlert, Coffee,
  FileClock, Search, LogOut, UserCircle, Files
} from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  {
    title: "OVERVIEW",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/daily-digest", label: "Daily Digest", icon: Coffee },
      { href: "/chatbot", label: "Ask AI", icon: Sparkles },
    ],
  },
  {
    title: "CLINICAL",
    items: [
      { href: "/medications", label: "Medications", icon: Pill },
      { href: "/lab-results", label: "Lab Results", icon: BarChart2 },
      { href: "/drug-interactions", label: "Drug Interactions", icon: TriangleAlert },
      { href: "/observations", label: "Observations", icon: Eye },
    ],
  },
  {
    title: "RECORDS",
    items: [
      { href: "/search", label: "Search", icon: Search },
      { href: "/documents", label: "Documents", icon: Files },
      { href: "/history", label: "Patient History", icon: FileClock },
    ],
  },
  {
    title: "CARE TEAM",
    items: [
      { href: "/caregivers", label: "Caregivers", icon: Users },
      { href: "/prescribers", label: "Prescribers", icon: Stethoscope },
    ],
  },
  {
    title: "SCHEDULE",
    items: [
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/refills", label: "Refills", icon: RefreshCw },
      { href: "/doctor-briefing", label: "Doctor Briefing", icon: FileText },
    ],
  },
] as const;

interface SidebarProps {
  className?: string;
}

function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { activePatient } = usePatient();
  const { state: patientState, fetch: fetchPatientState } = usePatientState();
  const { documents, fetchDocuments } = useDocuments();
  const { results: labResults, fetch: fetchLabResults } = useLabResults();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("cc_sidebar_collapsed") === "true";
    }
    return false;
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("cc_sidebar_collapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
    setIsLoaded(true);
  }, []);

  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("cc_sidebar_collapsed", String(newState));
  };

  // Fetch data on patient change for badges
  useEffect(() => {
    if (activePatient?.id) {
      fetchPatientState(activePatient.id);
      fetchDocuments(activePatient.id);
      fetchLabResults(activePatient.id);
    }
  }, [activePatient?.id, fetchPatientState, fetchDocuments, fetchLabResults]);

  // Handle Daily Digest Viewed status
  const todayKey = useMemo(() => `cc_digest_viewed_${formatDateLocal(new Date())}`, []);

  useEffect(() => {
    if (pathname === "/daily-digest") {
      localStorage.setItem(todayKey, "true");
    }
  }, [pathname, todayKey]);

  const initials = user?.name
    ? user.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : null;

  // Dynamic Badge Logic
  const getBadge = (label: string) => {
    if (label === "Daily Digest") {
      const viewed = typeof window !== 'undefined' ? localStorage.getItem(todayKey) : null;
      if (pathname === "/daily-digest") return null;
      return viewed ? null : 1;
    }

    if (label === "AI Assistant" || label === "Medications") return null;

    if (label === "Lab Results") {
      const abnormal = labResults.filter(r => r.is_abnormal).length;
      return abnormal > 0 ? `${abnormal}!` : null;
    }

    if (label === "Drug Interactions") {
      // Deduplicate by sorted drug pair — backend may accumulate duplicates across check runs
      const seen = new Set<string>();
      const interactions = patientState?.drug_interactions || [];
      const deduped = interactions.filter(ix => {
        const key = [ix.drug_a_generic, ix.drug_b_generic].sort().join("||");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return deduped.length || null;
    }

    if (label === "Documents") {
      const pending = documents.filter(d => d.extraction_status === "review_required").length;
      return pending > 0 ? pending : null;
    }

    if (label === "Refills") {
      return patientState?.refill_alerts?.length || null;
    }

    if (label === "Calendar") {
      return patientState?.suggested_appointments?.length || null;
    }

    return null;
  };

  return (
    <aside
      suppressHydrationWarning
      className={cn(
        "bg-[#0D3B6E] hidden lg:flex flex-col shrink-0 h-full border-r border-white/10",
        isLoaded ? "transition-all duration-300 ease-in-out" : "transition-none",
        isCollapsed ? "w-20" : "w-56",
        className
      )}
    >
      <div className={cn(
        "h-14 flex items-center px-4 border-b border-white/10 shrink-0",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
            <span className="text-white font-bold text-xl tracking-tight whitespace-nowrap">CareCircle</span>
          </Link>
        )}
        <button
          onClick={toggleCollapsed}
          className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className={cn("flex-1 py-6 space-y-8 overflow-y-auto scrollbar-hide", isCollapsed ? "px-2" : "pl-2 pr-0")}>
        {SECTIONS.map((section) => (
          <div key={section.title} className="space-y-2">
            {!isCollapsed && (
              <h3 className="px-3 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map(({ href, label, icon: Icon }: any) => {
                const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
                const badge = getBadge(label);
                return (
                  <Link
                    key={href}
                    href={href}
                    title={isCollapsed ? label : ""}
                    className="block relative transition-all"
                  >
                    {active && (
                      <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#1D9E75] rounded-r-full shadow-[0_0_8px_rgba(29,158,117,0.5)]" />
                    )}
                    <div className={cn(
                      "flex items-center transition-all duration-200 group",
                      isCollapsed 
                        ? "justify-center py-3 rounded-lg" 
                        : "gap-3 w-full pl-3 pr-2 py-2.5 rounded-l-xl",
                      active 
                        ? "bg-[#1D9E75]/10 text-white shadow-inner" 
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}>
                      <Icon size={20} className={cn(
                        "transition-transform duration-200 group-hover:scale-110 shrink-0",
                        active ? "text-[#1D9E75]" : "text-white/40"
                      )} />
                      {!isCollapsed && (
                        <span className="text-sm font-bold tracking-tight">{label}</span>
                      )}
                      
                      {!isCollapsed && badge && (
                        <span className={cn(
                          "ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                          typeof badge === 'string' && badge.includes('!')
                            ? "bg-[#E24B4A] text-white animate-pulse"
                            : "bg-[#EF9F27] text-white"
                        )}>
                          {badge}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-white/10 mt-auto bg-black/10">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 p-1 rounded-xl hover:bg-white/5 transition-all group",
            isCollapsed ? "justify-center" : ""
          )}
        >
          <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0 group-hover:border-white/40 transition-colors">
            {initials ?? <UserCircle size={20} className="text-white/70" />}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-white truncate group-hover:text-blue-200 transition-colors">
                {user?.name ?? "Caregiver"}
              </p>
              <p className="text-[10px] text-white/50 truncate uppercase tracking-tight font-bold">
                {user?.role?.replace('_', ' ') ?? "Family Caregiver"}
              </p>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}

export { Sidebar };
