"use client";

import type { LabTrendItem } from "@/lib/types";

interface LabTrendChartProps {
  data: LabTrendItem[];
  loading?: boolean;
}

const W = 400;
const H = 120;
const PAD = { top: 10, right: 16, bottom: 28, left: 40 };

export function LabTrendChart({ data, loading }: LabTrendChartProps) {
  if (loading) {
    return <div className="h-32 rounded-lg bg-[var(--color-border)] animate-pulse" />;
  }
  if (data.length < 2) {
    return (
      <div className="h-32 flex items-center justify-center text-xs text-[var(--color-muted)]">
        Not enough data to show trend.
      </div>
    );
  }

  const sorted = [...data].sort(
    (a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime()
  );

  const values = sorted.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  function xPos(i: number) {
    return PAD.left + (i / (sorted.length - 1)) * innerW;
  }

  function yPos(v: number) {
    return PAD.top + innerH - ((v - minVal) / range) * innerH;
  }

  const linePath = sorted
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xPos(i).toFixed(1)} ${yPos(d.value).toFixed(1)}`)
    .join(" ");

  const unit = sorted[0]?.unit ?? "";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: H }}
      aria-label="Lab result trend chart"
    >
      {/* Y-axis labels */}
      <text x={PAD.left - 4} y={PAD.top + 4} textAnchor="end" fontSize="9" fill="#6B7280">
        {maxVal.toFixed(1)}
      </text>
      <text x={PAD.left - 4} y={PAD.top + innerH + 4} textAnchor="end" fontSize="9" fill="#6B7280">
        {minVal.toFixed(1)}
      </text>

      {/* Unit label */}
      {unit && (
        <text x={PAD.left - 4} y={PAD.top + innerH / 2 + 4} textAnchor="end" fontSize="8" fill="#9CA3AF">
          {unit}
        </text>
      )}

      {/* Grid line at midpoint */}
      <line
        x1={PAD.left} y1={PAD.top + innerH / 2}
        x2={PAD.left + innerW} y2={PAD.top + innerH / 2}
        stroke="#E5E7EB" strokeWidth="1" strokeDasharray="3,3"
      />

      {/* Trend line */}
      <path d={linePath} fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* Data points */}
      {sorted.map((d, i) => (
        <g key={i}>
          <circle
            cx={xPos(i)}
            cy={yPos(d.value)}
            r="4"
            fill={d.is_abnormal ? "#E24B4A" : "#1D9E75"}
            stroke="white"
            strokeWidth="1.5"
          />
          {/* X-axis date label (only first and last) */}
          {(i === 0 || i === sorted.length - 1) && (
            <text
              x={xPos(i)}
              y={H - 6}
              textAnchor={i === 0 ? "start" : "end"}
              fontSize="9"
              fill="#6B7280"
            >
              {new Date(d.test_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
