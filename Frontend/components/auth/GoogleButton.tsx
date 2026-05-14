"use client";

import { useEffect, useRef } from "react";

interface GoogleButtonProps {
  onSuccess: (idToken: string) => void;
  onError?: () => void;
}

function GoogleButton({ onSuccess, onError }: GoogleButtonProps) {
  const btnRef = useRef<HTMLDivElement>(null);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);

  useEffect(() => {
    function renderGoogleButton() {
      const google = (window as any).google;
      if (!google?.accounts?.id || !btnRef.current) return false;

      const width = btnRef.current.offsetWidth || 320;

      if (!(window as any).__cc_gsi_initialized) {
        google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: (response: any) => {
            if (response.credential) {
              onSuccessRef.current(response.credential);
            }
          },
        });
        (window as any).__cc_gsi_initialized = true;
      }

      google.accounts.id.renderButton(btnRef.current, {
        width,
        text: "continue_with",
        shape: "rectangular",
        theme: "outline",
        logo_alignment: "left",
        size: "large",
      });
      return true;
    }

    // Try immediately (script may already be loaded)
    if (renderGoogleButton()) return;

    // Script not ready — listen for load on the GSI script tag
    const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (script) {
      const onLoad = () => renderGoogleButton();
      script.addEventListener("load", onLoad);
      return () => script.removeEventListener("load", onLoad);
    }

    // Fallback: poll every 300ms for up to 5s
    let attempts = 0;
    const interval = setInterval(() => {
      if (renderGoogleButton() || ++attempts >= 17) clearInterval(interval);
    }, 300);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full min-h-[44px] overflow-hidden">
      <div ref={btnRef} className="w-full" />
    </div>
  );
}

export { GoogleButton };
