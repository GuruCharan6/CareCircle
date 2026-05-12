"use client";

import { useState, useEffect } from "react";
import { X, Building, Phone, User, Mail, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { PrescriberResponse, PrescriberCreate, PrescriberUpdate } from "@/lib/types";

interface PrescriberModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: PrescriberResponse | null;
}

export function PrescriberModal({ open, onClose, onSubmit, initialData }: PrescriberModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    specialty: "",
    hospital: "",
    phone: "",
    email: ""
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        specialty: initialData.specialty || "",
        hospital: initialData.hospital || "",
        phone: initialData.phone || "",
        email: initialData.email || ""
      });
    } else {
      setFormData({ name: "", specialty: "", hospital: "", phone: "", email: "" });
    }
  }, [initialData, open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-[var(--color-border)]">
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[var(--color-text)]">
              {initialData ? "Edit Prescriber" : "Add Prescriber"}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-[var(--color-bg)] rounded-full transition-colors text-[var(--color-muted)]">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest ml-1">Full Name</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)] opacity-50" />
                <input
                  required
                  type="text"
                  placeholder="e.g. Dr. Priya Nair"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-12 pl-12 pr-4 bg-white border border-[var(--color-border)] rounded-xl text-[15px] font-bold text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-action)] transition-all placeholder:text-[var(--color-muted)]/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest ml-1">Specialty</label>
                <div className="relative">
                  <Stethoscope size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)] opacity-50" />
                  <input
                    type="text"
                    placeholder="e.g. Cardiology"
                    value={formData.specialty}
                    onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                    className="w-full h-12 pl-12 pr-4 bg-white border border-[var(--color-border)] rounded-xl text-[15px] font-bold text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-action)] transition-all placeholder:text-[var(--color-muted)]/40"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest ml-1">Hospital</label>
                <div className="relative">
                  <Building size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)] opacity-50" />
                  <input
                    type="text"
                    placeholder="e.g. AIIMS"
                    value={formData.hospital}
                    onChange={e => setFormData({ ...formData, hospital: e.target.value })}
                    className="w-full h-12 pl-12 pr-4 bg-white border border-[var(--color-border)] rounded-xl text-[15px] font-bold text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-action)] transition-all placeholder:text-[var(--color-muted)]/40"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest ml-1">Phone Number</label>
              <div className="flex h-12 rounded-xl border border-[var(--color-border)] overflow-hidden bg-white focus-within:ring-2 focus-within:ring-[var(--color-action)]">
                <div className="flex items-center px-3 bg-[var(--color-surface)] border-r border-[var(--color-border)] shrink-0">
                  <span className="text-sm font-bold text-[var(--color-text)]">+91</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="98765 43210"
                  value={formData.phone.startsWith("+91") ? formData.phone.slice(3) : formData.phone}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setFormData({ ...formData, phone: digits ? `+91${digits}` : "" });
                  }}
                  className="flex-1 px-3 text-[15px] font-bold text-[var(--color-text)] focus:outline-none font-mono bg-transparent placeholder:text-[var(--color-muted)]/40"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest ml-1">Email (Optional)</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)] opacity-50" />
                <input
                  type="email"
                  placeholder="doctor@hospital.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-12 pl-12 pr-4 bg-white border border-[var(--color-border)] rounded-xl text-[15px] font-bold text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-action)] transition-all placeholder:text-[var(--color-muted)]/40"
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
                {initialData ? "Save Changes" : "Add Prescriber"}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
