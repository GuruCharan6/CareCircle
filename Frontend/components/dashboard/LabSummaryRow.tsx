import Link from "next/link";
import { FlaskConical, ChevronRight, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function LabSummaryRow() {
  return (
    <Card padding="sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-[var(--color-surface)]">
            <FlaskConical
              size={15}
              className="text-[var(--color-action)]"
            />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">
              Lab Results
            </p>
            <p className="text-xs text-[var(--color-muted)]">View all test reports</p>
          </div>
        </div>
        <Link
          href="/lab-results"
          className="flex items-center gap-1 text-xs text-[var(--color-action)] font-medium hover:underline"
        >
          View all <ChevronRight size={13} />
        </Link>
      </div>
    </Card>
  );
}
