import { Card } from "@/components/ui/Card";
import { MedConflictList } from "./MedConflictList";
import { LabTrendSection } from "./LabTrendSection";
import { AutoQuestions } from "./AutoQuestions";
import type { DoctorBriefingResponse } from "@/lib/api/doctor-briefing";

interface Props {
  briefing: DoctorBriefingResponse;
}

export function BriefingCard({ briefing }: Props) {
  const hasBehavioral = briefing.behavioral_notes.length > 0;

  return (
    <Card className="space-y-6">
      <MedConflictList meds={briefing.meds_from_other_doctors} />
      <LabTrendSection trends={briefing.lab_trends} />

      {hasBehavioral && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-[var(--color-primary)]">Behavioral Notes</h3>
          <ul className="space-y-1">
            {briefing.behavioral_notes.map((note, i) => (
              <li key={i} className="text-sm text-[var(--color-text)] flex gap-2">
                <span className="text-[var(--color-muted)] shrink-0">·</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      <AutoQuestions questions={briefing.questions_to_raise} />
    </Card>
  );
}
