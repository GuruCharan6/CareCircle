"use client";

import React, { useState } from "react";
import { Pill, Calendar, UserPlus, X, FlaskConical } from "lucide-react";
import { cn, formatDateLocal } from "@/lib/utils";
import type { EventType, CalendarEventCreate, CalendarEventResponse } from "@/lib/types";

interface CalendarEventFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialDate?: Date;
  initialEvent?: CalendarEventResponse | null;
}


function TypeButton({ 
  active, 
  onClick, 
  icon, 
  label, 
  description 
}: { 
  active: boolean, 
  onClick: () => void, 
  icon: React.ReactNode, 
  label: string,
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-3 lg:p-4 rounded-[16px] lg:rounded-[20px] border-2 transition-all gap-1.5 text-center min-h-[90px] lg:min-h-[110px] shadow-sm",
        active 
          ? "border-[#0D3B6E] bg-[#0D3B6E]/5 text-[#0D3B6E] scale-[1.02]" 
          : "border-[#F3F4F6] bg-white text-[#9CA3AF] hover:border-[#E5E7EB] hover:text-[#6B7280]"
      )}
    >
      <div className={cn("p-2.5 rounded-xl transition-all", active ? "bg-[#0D3B6E] text-white shadow-md" : "bg-[#F9FAFB]")}>
        {icon}
      </div>
      <div className="space-y-0.5">
        <span className="text-[11px] font-bold block">{label}</span>
        <span className="text-[9px] font-medium opacity-60 block leading-tight">{description}</span>
      </div>
    </button>
  );
}

export function CalendarEventForm({ open, onClose, onSubmit, initialDate, initialEvent }: CalendarEventFormProps) {
  const [type, setType] = useState<EventType>("appointment");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (initialEvent) {
      setType(initialEvent.event_type);
      setTitle(initialEvent.title);
      setDate(initialEvent.event_date);
    } else if (initialDate) {
      setDate(formatDateLocal(initialDate));
      setType("appointment");
      setTitle("");
    }
  }, [initialDate, initialEvent, open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !date) return;
    
    setLoading(true);
    try {
      await onSubmit({
        event_type: type,
        title,
        event_date: date,
      });
      setTitle("");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center p-0 lg:p-4 bg-[#0D3B6E]/20 backdrop-blur-md">
      <div className="bg-white w-full max-w-md rounded-t-[24px] lg:rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-[#E5E7EB] overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-[#F3F4F6] flex items-center justify-between bg-[#FDFDFD]">
          <div>
            <h2 className="font-bold text-[#1F2937] text-xl">{initialEvent ? "Edit Schedule" : "Schedule Event"}</h2>
            <p className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-widest mt-1">
              {initialEvent ? "Update details below" : initialDate 
                ? `${initialDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}` 
                : "Enter details below"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#F3F4F6] rounded-full transition-all text-[#9CA3AF] hover:text-[#1F2937]">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 lg:p-8 space-y-5 lg:space-y-8">
          <div className="space-y-4">
            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest block text-center">Event Category</label>
            <div className="grid grid-cols-3 gap-3">
              <TypeButton 
                active={type === "appointment"} 
                onClick={() => { setType("appointment"); setTitle("Doctor Appointment"); }}
                icon={<Calendar size={20} />}
                label="Appointment"
                description="General visit"
              />
              <TypeButton 
                active={type === "lab_test"} 
                onClick={() => { setType("lab_test"); setTitle("Lab Test"); }}
                icon={<FlaskConical size={20} />}
                label="Lab Test"
                description="Diagnostics"
              />
              <TypeButton 
                active={type === "caregiver_visit"} 
                onClick={() => { setType("caregiver_visit"); setTitle("Care Visit"); }}
                icon={<UserPlus size={20} />}
                label="Care Visit"
                description="Home care"
              />
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest block px-1">Description</label>
              <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Annual physical, Blood panel..."
                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm font-medium text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#0D3B6E]/10 focus:border-[#0D3B6E] transition-all"
                required
              />
            </div>

            {!initialDate && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest block px-1">Event Date</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm font-medium text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#0D3B6E]/10 focus:border-[#0D3B6E] transition-all"
                  required
                />
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 px-6 bg-[#0D3B6E] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#0D3B6E]/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? "Saving..." : initialEvent ? "Update Schedule" : "Add to Calendar"}
          </button>
        </form>
      </div>
    </div>
  );
}
