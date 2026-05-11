import { cn } from "@/lib/utils";

// Deterministic color from system name
const SYSTEM_COLORS: Record<string, string> = {
  cardiovascular:  "bg-red-100 text-red-700",
  respiratory:     "bg-sky-100 text-sky-700",
  neurological:    "bg-purple-100 text-purple-700",
  endocrine:       "bg-yellow-100 text-yellow-700",
  gastrointestinal:"bg-orange-100 text-orange-700",
  renal:           "bg-teal-100 text-teal-700",
  musculoskeletal: "bg-lime-100 text-lime-700",
  dermatological:  "bg-pink-100 text-pink-700",
  hematological:   "bg-rose-100 text-rose-700",
  immunological:   "bg-indigo-100 text-indigo-700",
};

function colorFor(system: string) {
  return SYSTEM_COLORS[system.toLowerCase()] ?? "bg-gray-100 text-gray-600";
}

interface BodySystemBadgeProps {
  systems: string[];
  className?: string;
}

export function BodySystemBadge({ systems, className }: BodySystemBadgeProps) {
  if (!systems.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {systems.map(s => (
        <span
          key={s}
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize",
            colorFor(s)
          )}
        >
          {s.replace(/_/g, " ")}
        </span>
      ))}
    </div>
  );
}
