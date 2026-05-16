"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Only show once per session
    if (sessionStorage.getItem("splash_shown")) {
      setVisible(false);
      return;
    }
    const fadeTimer = setTimeout(() => setFading(true), 1600);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem("splash_shown", "1");
    }, 2100);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0D3B6E",
        transition: "opacity 0.5s ease",
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      <Image
        src="/icons/icon-192.png"
        alt="CareCircle"
        width={96}
        height={96}
        priority
        style={{ borderRadius: 24, marginBottom: 20 }}
      />
      <span
        style={{
          fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
          fontSize: 28,
          fontWeight: 700,
          color: "#ffffff",
          letterSpacing: "-0.5px",
        }}
      >
        CareCircle
      </span>
      <span
        style={{
          fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
          fontSize: 13,
          fontWeight: 400,
          color: "rgba(255,255,255,0.55)",
          marginTop: 6,
          letterSpacing: "0.2px",
        }}
      >
        Smart health management
      </span>
    </div>
  );
}
