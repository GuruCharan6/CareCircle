import type { SuggestedPrompt } from "@/lib/types";

interface Props {
  suggestions: SuggestedPrompt[];
  onSelect: (prompt: SuggestedPrompt) => void;
  disabled?: boolean;
}

export function SuggestionChips({ suggestions, onSelect, disabled }: Props) {
  if (!suggestions.length) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          disabled={disabled}
          className="px-4 py-2 rounded-full text-xs font-semibold bg-white text-[#10B981] border border-[#10B981] hover:bg-[#10B981] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
        >
          {s.text}
        </button>
      ))}
    </div>
  );
}
