import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

const STATUS_PREVIEW = [
  { name: "Meera Sharma", status: "OK",    bg: "bg-[#639922]" },
  { name: "Raj Kumar",    status: "WATCH", bg: "bg-[#EF9F27]" },
  { name: "Priya Devi",  status: "ALERT", bg: "bg-[#E24B4A]" },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col lg:flex-row overflow-hidden">

      {/* ── Desktop left panel ── */}
      <aside
        className="hidden lg:flex lg:w-[400px] xl:w-[440px] shrink-0 flex-col justify-between p-10"
        style={{ background: "#0D3B6E" }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 10% 60%, rgba(29,158,117,0.18) 0%, transparent 55%)," +
              "radial-gradient(ellipse at 85% 10%, rgba(232,244,240,0.08) 0%, transparent 40%)",
          }}
        />
        <div className="relative z-10 flex flex-col gap-10">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/carecircle-logo.svg" alt="Logo" width={36} height={36} className="w-9 h-9" />
            <span className="text-white text-xl font-bold tracking-tight">CareCircle</span>
          </Link>
          <div>
            <h2 className="text-white text-[2rem] font-bold leading-tight">
              Your parent&apos;s health,<br /><em className="italic">always in view</em>
            </h2>
            <p className="text-white/55 text-[0.9375rem] mt-3 leading-relaxed max-w-[18rem]">
              Track medications, coordinate caregivers, get daily WhatsApp digests.
            </p>
          </div>
          <div>
            <p className="text-white/40 text-[0.6875rem] uppercase tracking-widest font-semibold mb-3">Live status</p>
            <div className="space-y-2">
              {STATUS_PREVIEW.map(({ name, status, bg }) => (
                <div key={name} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <span className="text-white/80 text-sm font-medium">{name}</span>
                  <span className={`${bg} text-white text-[0.6875rem] font-bold font-mono px-2.5 py-0.5 rounded-full tracking-wide`}>{status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="relative z-10 text-white/25 text-xs">© 2026 CareCircle</p>
      </aside>

      {/* ── Mobile + Desktop right: hero + form ── */}
      <div className="flex-1 flex flex-col min-h-dvh lg:min-h-0 lg:items-center lg:justify-center lg:bg-[#F5F3EE] lg:p-10">

        {/* Mobile hero — dark navy top */}
        <div className="lg:hidden bg-[#0D3B6E] px-6 pt-10 pb-10 shrink-0">
          <Link href="/" className="flex items-center gap-2 mb-7">
            <Image src="/carecircle-logo.svg" alt="Logo" width={26} height={26} className="w-6.5 h-6.5" />
            <span className="text-white text-base font-bold tracking-tight">CareCircle</span>
          </Link>
          <h1 className="text-white text-[1.625rem] font-bold leading-tight">
            Your parent&apos;s health,<br /><em className="italic font-bold">always in view</em>
          </h1>
          <p className="text-white/60 text-sm mt-2.5 leading-relaxed">
            Track medications, coordinate caregivers, get daily WhatsApp digests.
          </p>
        </div>

        {/* Form section */}
        <div className="flex-1 lg:flex-none flex flex-col justify-center w-full bg-white rounded-t-3xl lg:rounded-2xl lg:border lg:border-[#D9D5CD] lg:shadow-sm lg:max-w-sm px-6 py-8 lg:p-8 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
