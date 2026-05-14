"use client";

import { useEffect, useRef, useCallback } from "react";

interface GoogleButtonProps {
  onSuccess: (idToken: string) => void;
  onError?: () => void;
}

function GoogleButton({ onSuccess, onError }: GoogleButtonProps) {
  const btnRef = useRef<HTMLDivElement>(null);
  // Keep a stable ref to the latest callback so we never re-initialize GSI
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);

  useEffect(() => {
    const google = (window as any).google;
    if (!google || !btnRef.current) return;

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full min-h-[44px] overflow-hidden">
      <div ref={btnRef} className="w-full" />
    </div>
  );
}

export { GoogleButton };
