"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageCircle, CheckCircle, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { onboardingApi } from "@/lib/api/onboarding";
import { cn } from "@/lib/utils";

export default function OnboardingWhatsAppPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const isEdit = mode === "edit";

  const [finishing, setFinishing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function handleFinish() {
    setFinishing(true);
    await onboardingApi.completeStep(5).catch(() => {});
    router.replace(isEdit ? "/settings" : "/dashboard");
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const WHATSAPP_URL = "https://wa.me/14155238886?text=join%20officer-magnet";

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-black text-[#0D3B6E] tracking-tight">
          {isEdit ? "WhatsApp Connection" : "Final Step — Join WhatsApp"}
        </h2>
        <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
          {isEdit ? "Review your WhatsApp connection status." : "Activate hands-free updates and daily health digests."}
        </p>
      </div>

      <div className="flex flex-col md:flex-row items-stretch gap-6 py-2">
        {/* Left Side: Manual Message */}
        <div className="flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
              Method 1: Manual
            </h3>
            <div className="space-y-2">
              {/* Number Card */}
              <div className="group flex items-center justify-between p-3 bg-emerald-50/40 rounded-xl border border-emerald-100/50 transition-all hover:bg-emerald-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <MessageCircle size={14} className="text-emerald-600" />
                  </div>
                  <span className="text-base font-bold text-[#0D3B6E] tracking-tight">+1 415 523 8886</span>
                </div>
                <button 
                  onClick={() => copyToClipboard("+14155238886", "num")}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    copied === "num" ? "bg-emerald-500 text-white" : "text-slate-400 hover:bg-white hover:shadow-sm"
                  )}
                >
                  {copied === "num" ? <CheckCircle size={14} /> : <Copy size={14} />}
                </button>
              </div>

              {/* Code Card */}
              <div className="group flex items-center justify-between p-3 bg-slate-50/40 rounded-xl border border-slate-200/40 transition-all hover:bg-slate-50/60">
                <div className="space-y-0.5">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Code</p>
                  <p className="text-sm font-mono font-black text-[#0D3B6E]">join officer-magnet</p>
                </div>
                <button 
                  onClick={() => copyToClipboard("join officer-magnet", "code")}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    copied === "code" ? "bg-[#0D3B6E] text-white" : "text-slate-400 hover:bg-white hover:shadow-sm"
                  )}
                >
                  {copied === "code" ? <CheckCircle size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

          <a 
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#007AFF] hover:bg-[#0066D6] text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            Open WhatsApp
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Middle: OR Separator */}
        <div className="hidden md:flex flex-col items-center justify-center gap-4 py-4">
          <div className="w-[1px] flex-1 bg-gradient-to-b from-transparent via-slate-200 to-transparent" />
          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest bg-white px-1">OR</span>
          <div className="w-[1px] flex-1 bg-gradient-to-b from-transparent via-slate-200 to-transparent" />
        </div>

        {/* Right Side: QR Code */}
        <div className="flex-1 flex flex-col items-center justify-between space-y-4">
          <div className="space-y-4 w-full flex flex-col items-center">
            <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Method 2: Scan
            </h3>
            <div className="relative p-4 bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 transition-transform hover:scale-[1.02]">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(WHATSAPP_URL)}`}
                alt="WhatsApp QR Code"
                className="w-[120px] h-[120px] opacity-90 transition-opacity"
              />
            </div>
          </div>
          <p className="text-[8px] font-bold text-slate-400 text-center">Scan to join instantly</p>
        </div>
      </div>

      <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
          {[
            "Health digests",
            "Daily summaries",
            "Voice updates",
            "Emergency alerts",
          ].map(feature => (
            <div key={feature} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
                <CheckCircle size={8} className="text-emerald-500" />
              </div>
              <span className="text-[10px] font-bold text-slate-600 tracking-tight">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      <Button 
        variant="primary" 
        className="w-full h-12 text-sm font-black shadow-xl shadow-blue-500/30 bg-gradient-to-r from-[#007AFF] to-[#0055FF] border-none hover:scale-[1.01] active:scale-[0.99] transition-all" 
        loading={finishing} 
        onClick={handleFinish}
      >
        Finish Setup →
      </Button>
    </div>
  );
}
