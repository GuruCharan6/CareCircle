import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

const STATUS_PREVIEW = [
  { name: "Meera Sharma", status: "OK",    bg: "bg-[#639922]" },
  { name: "Raj Kumar",    status: "WATCH", bg: "bg-[#EF9F27]" },
  { name: "Priya Devi",  status: "ALERT", bg: "bg-[#E24B4A]" },
];

function PulseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col lg:flex-row">

      {/* ── Left panel: brand + status preview (desktop only) ── */}
      <aside
        className="hidden lg:flex lg:w-[400px] xl:w-[440px] shrink-0 flex-col justify-between p-10"
        style={{ background: "#0D3B6E" }}
        aria-hidden="true"
      >
        {/* subtle radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 10% 60%, rgba(29,158,117,0.18) 0%, transparent 55%)," +
              "radial-gradient(ellipse at 85% 10%, rgba(232,244,240,0.08) 0%, transparent 40%)",
          }}
        />

        <div className="relative z-10 flex flex-col gap-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image src="/carecircle-logo.svg" alt="Logo" width={36} height={36} className="w-9 h-9" />
            <span className="text-white text-xl font-bold tracking-tight">CareCircle</span>
          </Link>

          {/* Tagline */}
          <div>
            <h2 className="text-white text-[2rem] font-bold leading-tight">
              Monitor what<br />matters most
            </h2>
            <p className="text-white/55 text-[0.9375rem] mt-3 leading-relaxed max-w-[18rem]">
              One glance. Real-time status for everyone in your care circle.
            </p>
          </div>

          {/* Status card preview */}
          <div>
            <p className="text-white/40 text-[0.6875rem] uppercase tracking-widest font-semibold mb-3">
              Live status
            </p>
            <div className="space-y-2">
              {STATUS_PREVIEW.map(({ name, status, bg }) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <span className="text-white/80 text-sm font-medium">{name}</span>
                  <span className={`${bg} text-white text-[0.6875rem] font-bold font-mono px-2.5 py-0.5 rounded-full tracking-wide`}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="relative z-10 text-white/25 text-xs">© 2026 CareCircle</p>
      </aside>

      {/* ── Right panel: form ── */}
      <main
        className="flex-1 flex flex-col items-center justify-center min-h-dvh lg:min-h-0 px-6 py-10"
        style={{ background: "#F5F3EE" }}
      >
        {/* Mobile logo */}
        <div className="lg:hidden text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-1">
            <Image src="/carecircle-logo.svg" alt="Logo" width={32} height={32} className="w-8 h-8" />
            <span className="text-[#0D3B6E] text-lg font-bold tracking-tight">CareCircle</span>
          </Link>
          <p className="text-[#6B7280] text-sm">Smart health management</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-2xl border border-[#D9D5CD] shadow-sm p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
