"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface GapAlertProps {
  gapActions: string[];
}

export function GapAlert({ gapActions }: GapAlertProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!gapActions.length || dismissed) return null;

  return (
    <div className="rounded-xl border border-[var(--color-watch)]/40 bg-[var(--color-watch)]/8 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={16} className="text-[var(--color-watch)] shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text)] mb-1">
            Care gaps detected
          </p>
          <ul className="space-y-1">
            {gapActions.map((action, i) => (
              <li key={i} className="text-xs text-[var(--color-muted)]">
                · {action}
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-0.5 text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
