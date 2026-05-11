import Link from "next/link";
import { Pill, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { DigestRefillAlert } from "@/lib/types";

interface MedSummaryRowProps {
  activeCount: number;
  refillAlerts?: DigestRefillAlert[];
}

export function MedSummaryRow({ activeCount, refillAlerts = [] }: MedSummaryRowProps) {
  return (
    <Card padding="sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-[var(--color-surface)]">
            <Pill size={15} className="text-[var(--color-action)]" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {activeCount} active medication{activeCount !== 1 ? "s" : ""}
            </p>
            {refillAlerts.length > 0 && (
              <p className="text-xs text-[var(--color-alert)]">
                {refillAlerts.length} refill alert{refillAlerts.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        <Link
          href="/medications"
          className="flex items-center gap-1 text-xs text-[var(--color-action)] font-medium hover:underline"
        >
          View all <ChevronRight size={13} />
        </Link>
      </div>
    </Card>
  );
}
