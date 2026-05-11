"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = [
  { num: 1, label: "Patient", path: "/onboarding/patient" },
  { num: 2, label: "First Doc", path: "/onboarding/document" },
  { num: 3, label: "Daily Digest", path: "/onboarding/digest" },
  { num: 4, label: "Care Team", path: "/onboarding/caregiver" },
  { num: 5, label: "WhatsApp", path: "/onboarding/whatsapp" },
];

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEdit = searchParams.get("mode") === "edit";

  const currentStep = STEPS.findIndex(s => pathname.startsWith(s.path)) + 1 || 1;

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Header - More compact */}
      <header className="h-12 bg-[#0D3B6E] flex items-center px-6 shrink-0">
        <span className="text-white font-black text-lg tracking-tighter">CareCircle</span>
        <div className="ml-3 h-3 w-px bg-white/20" />
        <span className="ml-3 text-white/70 text-[10px] font-bold uppercase tracking-widest">
          {isEdit ? "Refine setup" : "Setup Wizard"}
        </span>
      </header>

      {/* Progress Bar Container - Tightened */}
      <div className="w-full bg-slate-50 shrink-0">
        <div className="max-w-xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between relative">
            {/* Background Line */}
            <div className="absolute top-3.5 left-0 right-0 h-0.5 bg-slate-100 -z-0" />

            {/* Active Line Progress */}
            <div
              className="absolute top-3.5 left-0 h-0.5 bg-[#0D3B6E] transition-all duration-500 ease-in-out -z-0"
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            />

            {STEPS.map((step) => {
              const isActive = currentStep === step.num;
              const isCompleted = currentStep > step.num;
              
              return (
                <div key={step.num} className="relative z-10 flex flex-col items-center group">
                  <div 
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 border-2",
                      isActive ? "bg-[#0D3B6E] text-white border-[#0D3B6E] shadow-md scale-105" : 
                      isCompleted ? "bg-white text-[#0D3B6E] border-[#0D3B6E]" : 
                      "bg-white text-slate-300 border-slate-100"
                    )}
                  >
                    {isCompleted ? <Check size={12} strokeWidth={3} /> : step.num}
                  </div>
                  <span 
                    className={cn(
                      "absolute top-8 whitespace-nowrap text-[8px] font-bold uppercase tracking-tight transition-colors duration-300",
                      isActive ? "text-[#0D3B6E]" : 
                      isCompleted ? "text-slate-500" : 
                      "text-slate-300"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content - Scroll-free container */}
      <div className="flex-1 flex items-center justify-center px-4 overflow-hidden py-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl p-6 relative overflow-hidden flex flex-col max-h-full">
          {/* Subtle accent line at top of card */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0D3B6E] to-[#1a5fa8]" />
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
