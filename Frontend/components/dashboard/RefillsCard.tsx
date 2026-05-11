"use client";

import { Card } from "@/components/ui/Card";
import { RefreshCw, AlertCircle, ChevronRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DigestResponse } from "@/lib/types";

interface RefillsCardProps {
  digest: DigestResponse | null;
  loading?: boolean;
}

export function RefillsCard({ digest, loading }: RefillsCardProps) {
  const refills = digest?.refill_alerts || [];
  const hasRefills = refills.length > 0;

  if (loading) {
    return (
      <Card title="Refills Needed" icon={<RefreshCw size={18} className="text-[var(--color-action)]" />}>
        <div className="space-y-3 animate-pulse">
          {[1, 2].map(i => (
            <div key={i} className="h-12 bg-[var(--color-surface)] rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="Refills Needed" 
      icon={<RefreshCw size={18} className="text-[var(--color-action)]" />}
      headerAction={
        <Link href="/settings" className="text-[10px] font-bold text-[var(--color-action)] uppercase flex items-center gap-1 hover:underline">
          Manage <ChevronRight size={12} />
        </Link>
      }
    >
      <div className="space-y-3">
        {!hasRefills ? (
          <div className="py-4 text-center">
            <div className="p-3 bg-[var(--color-ok)]/10 rounded-full w-fit mx-auto mb-2 text-[var(--color-ok)]">
              <CheckCircle2 size={24} />
            </div>
            <p className="text-sm font-medium text-[var(--color-text)]">All stocks confirmed</p>
            <p className="text-xs text-[var(--color-muted)] mt-1">No medication refills required soon.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {refills.map((refill, i) => (
              <div 
                key={i} 
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border transition-all",
                  refill.urgency === "critical" 
                    ? "bg-red-50 border-red-100 text-red-900" 
                    : "bg-[var(--color-bg)] border-[var(--color-border)]"
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{refill.brand_name || refill.generic_name}</p>
                  <p className={cn(
                    "text-[10px] font-medium",
                    refill.urgency === "critical" ? "text-red-600" : "text-[var(--color-muted)]"
                  )}>
                    {refill.days_remaining} days remaining
                  </p>
                </div>
                {refill.urgency === "critical" && <AlertCircle size={14} className="text-red-500 animate-pulse shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
