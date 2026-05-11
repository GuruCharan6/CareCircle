import { Badge } from "@/components/ui/Badge";
import type { InvitationStatus } from "@/lib/types";

const VARIANT: Record<InvitationStatus, "ok" | "watch"> = {
  confirmed: "ok",
  pending:   "watch",
};

interface Props {
  status: InvitationStatus;
}

export function CaregiverStatusBadge({ status }: Props) {
  return (
    <Badge variant={VARIANT[status]} className="text-[10px]">
      {status}
    </Badge>
  );
}
