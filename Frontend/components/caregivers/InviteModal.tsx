"use client";

import { useState, useEffect } from "react";
import { X, User, Phone, Clock, Calendar, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { CaregiverCreate, CaregiverResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CaregiverCreate) => Promise<void>;
  initialData?: CaregiverResponse | null;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function InviteModal({ open, onClose, onSubmit, initialData }: InviteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CaregiverCreate>({
    name: "",
    phone_number: "",
    visit_schedule: [],
    visit_start_time: "",
    visit_end_time: "",
    notes: ""
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        phone_number: initialData.phone_number || "",
        visit_schedule: initialData.visit_schedule || [],
        visit_start_time: initialData.visit_start_time || "",
        visit_end_time: initialData.visit_end_time || "",
        notes: initialData.notes || ""
      });
    } else {
      setFormData({
        name: "",
        phone_number: "",
        visit_schedule: [],
        visit_start_time: "",
        visit_end_time: "",
        notes: ""
      });
    }
  }, [initialData, open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Clean data for backend
      const payload: CaregiverCreate = {
        ...formData,
        phone_number: formData.phone_number.startsWith("+") ? formData.phone_number.replace(/\s+/g, "") : `+91${formData.phone_number.replace(/\D/g, "")}`,
        // phone_number already in E.164 format from the input
        visit_start_time: formData.visit_start_time || undefined,
        visit_end_time: formData.visit_end_time || undefined,
        notes: formData.notes || undefined,
        visit_schedule: formData.visit_schedule?.map(d => d.toLowerCase()) || []
      };
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to process request");
    } finally {
      setLoading(false);
    }
  }

  function toggleDay(day: string) {
    setFormData(prev => ({
      ...prev,
      visit_schedule: prev.visit_schedule?.includes(day)
        ? prev.visit_schedule.filter(d => d !== day)
        : [...(prev.visit_schedule || []), day]
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-[var(--color-border)]">
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[var(--color-text)]">
                {initialData ? "Edit Caregiver" : "Invite Caregiver"}
              </h2>
              <p className="text-sm text-[var(--color-muted)] mt-1 font-bold opacity-70">
                {initialData ? "Update visit schedule and details" : "Invite someone to help with daily care"}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[var(--color-bg)] rounded-full transition-colors text-[var(--color-muted)]">
              <X size={20} />
            </button>
          </div>

          {error && (
            <p className="p-4 bg-[var(--color-alert)]/10 text-[var(--color-alert)] rounded-xl text-sm font-bold border border-[var(--color-alert)]/20">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)] opacity-50" />
                  <input
                    required
                    type="text"
                    placeholder="Caregiver name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-12 pl-12 pr-4 bg-white border border-[var(--color-border)] rounded-xl text-[15px] font-bold text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-action)] transition-all placeholder:text-[var(--color-muted)]/40"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest ml-1">WhatsApp Number</label>
                <div className="flex h-12 rounded-xl border border-[var(--color-border)] overflow-hidden bg-white focus-within:ring-2 focus-within:ring-[var(--color-action)]">
                  <div className="flex items-center px-3 bg-[var(--color-surface)] border-r border-[var(--color-border)] shrink-0">
                    <span className="text-sm font-bold text-[var(--color-text)]">+91</span>
                  </div>
                  <input
                    required
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="98765 43210"
                    value={formData.phone_number.startsWith("+91") ? formData.phone_number.slice(3) : formData.phone_number}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setFormData({ ...formData, phone_number: digits ? `+91${digits}` : "" });
                    }}
                    className="flex-1 px-3 text-[15px] font-bold text-[var(--color-text)] focus:outline-none font-mono bg-transparent placeholder:text-[var(--color-muted)]/40"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest ml-1">Visit Schedule</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => {
                  const active = formData.visit_schedule?.includes(day.toLowerCase());
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day.toLowerCase())}
                      className={cn(
                        "h-10 px-4 rounded-xl text-xs font-black transition-all border-2",
                        active 
                          ? "bg-[var(--color-action)] border-[var(--color-action)] text-white shadow-lg shadow-[var(--color-action)]/20" 
                          : "bg-white border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-action)]/30"
                      )}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest ml-1">Start Time</label>
                <div className="relative">
                  <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)] opacity-50" />
                  <input
                    type="time"
                    value={formData.visit_start_time}
                    onChange={e => setFormData({ ...formData, visit_start_time: e.target.value })}
                    className="w-full h-12 pl-12 pr-4 bg-white border border-[var(--color-border)] rounded-xl text-[15px] font-bold text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-action)] transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest ml-1">End Time</label>
                <div className="relative">
                  <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)] opacity-50" />
                  <input
                    type="time"
                    value={formData.visit_end_time}
                    onChange={e => setFormData({ ...formData, visit_end_time: e.target.value })}
                    className="w-full h-12 pl-12 pr-4 bg-white border border-[var(--color-border)] rounded-xl text-[15px] font-bold text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-action)] transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest ml-1">Notes</label>
              <div className="relative">
                <MessageSquare size={18} className="absolute left-4 top-6 text-[var(--color-muted)] opacity-50" />
                <textarea
                  placeholder="Special instructions for the caregiver..."
                  rows={3}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-[var(--color-border)] rounded-xl text-[15px] font-bold text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-action)] transition-all placeholder:text-[var(--color-muted)]/40 resize-none"
                />
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 h-12 rounded-xl font-bold border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-bg)] transition-all"
              >
                Cancel
              </button>
              <Button 
                type="submit" 
                className="flex-1 h-12 rounded-xl font-bold bg-[var(--color-action)] hover:bg-[var(--color-action)]/90 text-white border-none" 
                loading={loading}
              >
                {initialData ? "Save Changes" : "Send Invite"}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
