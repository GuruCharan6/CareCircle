"use client";

import { useEffect, useRef } from "react";

interface GoogleButtonProps {
  onSuccess: (idToken: string) => void;
  onError?: () => void;
}

function GoogleButton({ onSuccess, onError }: GoogleButtonProps) {
  const btnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const google = (window as any).google;
    if (!google) return;

    // Ensure we only initialize ONCE even if the button remounts or exists on multiple pages
    if (!(window as any).__cc_gsi_initialized) {
      google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: (response: any) => {
          if (response.credential) {
            onSuccess(response.credential);
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
  }, [onSuccess]);

  return (
    <div className="w-full flex justify-center min-h-[40px]">
      <div ref={btnRef} />
    </div>
  );
}

export { GoogleButton };
