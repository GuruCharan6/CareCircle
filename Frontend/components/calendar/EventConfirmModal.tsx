"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CalendarDays, MapPin, Clock, FileText, Trash2, Edit3 } from "lucide-react";
import type { CalendarEventResponse } from "@/lib/types";

interface EventConfirmModalProps {
  open: boolean;
  onClose: () => void;
  event: CalendarEventResponse | null;
  onConfirm: (eventId: string) => Promise<void>;
  onCancel: (eventId: string) => Promise<void>;
  onEdit: (event: CalendarEventResponse) => void;
}

export function EventConfirmModal({ open, onClose, event, onConfirm, onCancel, onEdit }: EventConfirmModalProps) {
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (!event) return null;

  async function handleConfirm() {
    setConfirming(true);
    try { await onConfirm(event!.id); onClose(); }
    finally { setConfirming(false); }
  }

  async function handleCancel() {
    setCancelling(true);
    try { await onCancel(event!.id); onClose(); }
    finally { setCancelling(false); }
  }

  const isSuggested = event.status === "suggested";
  const isActionable = event.status === "suggested" || event.status === "confirmed";

  return (
    <Modal open={open} onClose={onClose} title={event.title} size="md">
      <div className="space-y-8 p-1">
        <div className="space-y-4 bg-[#F9FAFB] p-5 rounded-[20px] border border-[#F3F4F6]">
          <Row icon={<CalendarDays size={18} />}>
            <span className="font-bold text-[#1F2937]">
              {new Date(event.event_date).toLocaleDateString("en-IN", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </span>
            {event.event_time && <span className="text-[#6B7280] ml-2">at {event.event_time}</span>}
          </Row>
          {event.location && <Row icon={<MapPin size={18} />}>{event.location}</Row>}
          {event.specialist_type && <Row icon={<Clock size={18} />}>{event.specialist_type}</Row>}
          {event.notes && <Row icon={<FileText size={18} />}>{event.notes}</Row>}
          {event.required_tests.length > 0 && (
            <Row icon={<FileText size={18} />}>
              <span className="text-[#6B7280]">Required:</span> {event.required_tests.join(", ")}
            </Row>
          )}
        </div>

        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">Status</span>
            <Badge
              variant={
                event.status === "confirmed" ? "ok"
                : event.status === "suggested" ? "watch"
                : "muted"
              }
              className="rounded-full px-3 py-1 font-bold text-[10px] uppercase tracking-wider"
            >
              {event.status}
            </Badge>
          </div>
          {event.source && (
            <span className="text-xs text-[#9CA3AF] font-medium italic">Detected via {event.source}</span>
          )}
        </div>

        {isActionable && (
          <div className="flex flex-col gap-2 pt-4 border-t border-[#F3F4F6]">
            {isSuggested && (
              <Button
                variant="primary"
                size="md"
                className="w-full rounded-xl bg-[#0D3B6E] shadow-lg shadow-[#0D3B6E]/20"
                loading={confirming}
                onClick={handleConfirm}
              >
                Confirm Appointment
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="md"
                className="flex-1 rounded-xl text-red-500 border-red-100 hover:bg-red-50 hover:border-red-200"
                loading={cancelling}
                onClick={handleCancel}
              >
                <Trash2 size={15} className="mr-1.5" />
                Remove
              </Button>
              <Button
                variant="secondary"
                size="md"
                className="flex-1 rounded-xl"
                onClick={() => { onEdit(event!); onClose(); }}
              >
                <Edit3 size={15} className="mr-1.5" />
                Edit
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm text-[var(--color-text)]">
      <span className="text-[var(--color-muted)] mt-0.5 shrink-0">{icon}</span>
      {children}
    </div>
  );
}
