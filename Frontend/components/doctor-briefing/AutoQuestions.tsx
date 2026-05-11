import { HelpCircle } from "lucide-react";

interface Props {
  questions: string[];
}

export function AutoQuestions({ questions }: Props) {
  if (!questions.length) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-[var(--color-primary)] flex items-center gap-2">
        <HelpCircle size={16} />
        Questions to Raise
      </h3>
      <ol className="space-y-1.5 list-decimal list-inside">
        {questions.map((q, i) => (
          <li key={i} className="text-sm text-[var(--color-text)]">{q}</li>
        ))}
      </ol>
    </div>
  );
}
