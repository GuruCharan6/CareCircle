"use client";

import { useState, useEffect, useRef } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "cc_install_dismissed";

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Don't show if user already dismissed or app is already installed (standalone)
    if (
      localStorage.getItem(DISMISSED_KEY) === "true" ||
      window.matchMedia("(display-mode: standalone)").matches
    ) {
      return;
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  function handleInstall() {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    deferredPrompt.current.userChoice.then(() => {
      deferredPrompt.current = null;
      setVisible(false);
    });
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-[4.5rem] lg:bottom-6 left-3 right-3 z-50 max-w-xs mx-auto">
      <div className="bg-[#0D3B6E] text-white rounded-2xl shadow-2xl px-3 py-2.5 flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="w-8 h-8 rounded-lg shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-xs leading-tight">Install CareCircle</p>
          <p className="text-white/60 text-[10px] mt-0.5">Works offline · Home screen</p>
        </div>
        <button
          onClick={handleInstall}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1D9E75] hover:bg-[#1D9E75]/90 rounded-lg text-[11px] font-bold transition-colors shrink-0"
        >
          <Download size={11} />
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
