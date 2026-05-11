"use client";

import { useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { LabTrendChart } from "./LabTrendChart";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LabResultResponse, LabTrendItem } from "@/lib/types";

interface LabModalProps {
  open: boolean;
  onClose: () => void;
  result: LabResultResponse | null;
  trend: LabTrendItem[];
  trendLoading: boolean;
  onFetchTrend: (testName: string) => void;
}

export function LabModal({ open, onClose, result, trend, trendLoading, onFetchTrend }: LabModalProps) {
  useEffect(() => {
    if (open && result) {
      onFetchTrend(result.test_name);
    }
    // onFetchTrend is stable (useCallback); result.test_name is the key signal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, result?.test_name]);

  if (!result) return null;

  const delta = result.delta_from_prev;
  const DeltaIcon = delta === null ? null : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const deltaColor = delta === null ? "" : result.is_abnormal ? "text-[var(--color-alert)]" : "text-[var(--color-ok)]";

  const hasRefRange = result.reference_range_low !== null || result.reference_range_high !== null;

  return (
    <Modal open={open} onClose={onClose} title={result.test_name_display} size="lg">
      <div className="space-y-5">
        {/* Value + status */}
        <div className="flex items-center gap-3">
          <div className="text-3xl font-bold text-[var(--color-text)]">
            {result.value}
            <span className="text-base font-normal text-[var(--color-muted)] ml-1">{result.unit}</span>
          </div>
          {result.is_abnormal ? (
            <Badge variant="alert">Abnormal</Badge>
          ) : (
            <Badge variant="ok">Normal</Badge>
          )}
          {DeltaIcon && delta !== null && (
            <span className={`flex items-center gap-0.5 text-sm font-medium ${deltaColor}`}>
              <DeltaIcon size={15} />
              {Math.abs(delta).toFixed(2)}
            </span>
          )}
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-[var(--color-muted)]">
          <Meta label="Test date" value={new Date(result.test_date).toLocaleDateString()} />
          {result.lab_name && <Meta label="Lab" value={result.lab_name} />}
          {hasRefRange && (
            <Meta
              label="Reference range"
              value={`${result.reference_range_low ?? "–"} – ${result.reference_range_high ?? "–"} ${result.unit}`}
            />
          )}
          {result.specialist_type && <Meta label="Specialist" value={result.specialist_type} />}
          {result.rate_of_change !== null && result.rate_of_change !== undefined && (
            <Meta label="Rate of change" value={`${result.rate_of_change.toFixed(2)} / day`} />
          )}
          {result.prev_reading_date && (
            <Meta label="Previous reading" value={new Date(result.prev_reading_date).toLocaleDateString()} />
          )}
        </div>

        {/* Trend chart */}
        <div>
          <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">
            Historical trend
          </p>
          <LabTrendChart data={trend} loading={trendLoading} />
        </div>
      </div>
    </Modal>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-medium text-[var(--color-text)]">{label}: </span>
      {value}
    </div>
  );
}
