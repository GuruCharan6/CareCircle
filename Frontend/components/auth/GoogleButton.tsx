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
    if (!google) return;

    // Only initialize once per page lifecycle — avoids flicker on re-renders
    if (!(window as any).__cc_gsi_initialized) {
      google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: (response: any) => {
          if (response.credential) {
            // Always call the latest handler without re-subscribing
            onSuccessRef.current(response.credential);
          }
        },
      });
      (window as any).__cc_gsi_initialized = true;
    }

    if (btnRef.current) {
      google.accounts.id.renderButton(btnRef.current, {
        width: 358,
        text: "continue_with",
        shape: "rectangular",
        theme: "outline",
        logo_alignment: "left",
      });
    }
  // Run only ONCE on mount — ref pattern keeps callback fresh without re-running
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full flex justify-center min-h-[40px]">
      <div ref={btnRef} />
    </div>
  );
}

export { GoogleButton };
