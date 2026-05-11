"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, ReactNode } from "react";
import {
  Pill,
  FlaskConical,
  Mic,
  Users,
  ShieldAlert,
  Bot,
  Upload,
  Sparkles,
  TrendingUp,
  MessageCircle,
  Clock,
  CheckCircle,
  ChevronDown,
  Activity,
  ArrowRight,
  Star,
  Bell,
  LucideIcon,
} from "lucide-react";
import React from "react";

/* ─────────────────────────────────────────────
   Design tokens — all CareCircle brand colours
   ───────────────────────────────────────────── */
interface DesignTokens {
  navy: string;
  teal: string;
  tealLight: string;
  bg: string;
  alert: string;
  watch: string;
  ok: string;
  muted: string;
  border: string;
  white: string;
}

const T: DesignTokens = {
  navy: "#0D3B6E",
  teal: "#1D9E75",
  tealLight: "#E8F4F0",
  bg: "#F5F3EE",
  alert: "#E24B4A",
  watch: "#EF9F27",
  ok: "#639922",
  muted: "#6B7280",
  border: "#E2DDD6",
  white: "#FFFFFF",
};

/* ─────────────────────────────────────────────
   Shared style helpers
   ───────────────────────────────────────────── */
const btn = {
  primary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: T.teal,
    color: T.white,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600,
    fontSize: 15,
    padding: "13px 28px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer" as const,
    textDecoration: "none",
    transition: "opacity .18s",
  },
  ghost: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "transparent",
    color: T.white,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    fontSize: 15,
    padding: "12px 24px",
    borderRadius: 12,
    border: `1.5px solid rgba(255,255,255,0.35)`,
    cursor: "pointer" as const,
    textDecoration: "none",
    transition: "background .18s",
  },
  navyOutline: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "transparent",
    color: T.navy,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600,
    fontSize: 15,
    padding: "12px 24px",
    borderRadius: 12,
    border: `1.5px solid ${T.navy}`,
    cursor: "pointer" as const,
    textDecoration: "none",
    transition: "background .18s",
  },
};

/* ─────────────────────────────────────────────
   NAV
   ───────────────────────────────────────────── */
function Navbar() {
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: T.navy,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "0 24px",
          height: 68,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <Image src="/carecircle-logo.svg" alt="CareCircle Logo" width={34} height={34} />
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: 18,
              color: T.white,
              letterSpacing: "-0.3px",
            }}
          >
            CareCircle
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/login" style={{ ...btn.ghost, fontSize: 14, padding: "9px 20px" }}>
            Log In
          </Link>
          <Link href="/signup" style={{ ...btn.primary, fontSize: 14, padding: "9px 20px" }}>
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ─────────────────────────────────────────────
   HERO
   ───────────────────────────────────────────── */
function Hero() {
  return (
    <section
      style={{
        background: T.navy,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        paddingTop: 100,
        paddingBottom: 80,
      }}
    >
      {/* Decorative blobs */}
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -120,
          width: 480,
          height: 480,
          borderRadius: "50%",
          background: T.teal,
          opacity: 0.08,
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -160,
          left: -100,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: T.teal,
          opacity: 0.07,
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 820,
          margin: "0 auto",
          padding: "0 24px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
        }}
      >
        {/* Badge */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(29,158,117,0.15)",
            border: "1px solid rgba(29,158,117,0.3)",
            color: "#5DCAA5",
            fontFamily: "'DM Mono', monospace",
            fontWeight: 400,
            fontSize: 12,
            letterSpacing: "0.08em",
            padding: "6px 16px",
            borderRadius: 999,
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: T.teal,
              display: "inline-block",
            }}
          />
          AI-powered health management
        </span>

        {/* Headline */}
        <h1
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(38px, 6vw, 64px)",
            lineHeight: 1.1,
            color: T.white,
            letterSpacing: "-1.5px",
            margin: 0,
          }}
        >
          Healthcare management
          <br />
          <span
            style={{
              color: T.teal,
              fontStyle: "italic",
              fontWeight: 300,
            }}
          >
            simplified
          </span>{" "}
          for your family
        </h1>

        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 18,
            fontWeight: 400,
            color: "rgba(255,255,255,0.65)",
            maxWidth: 560,
            lineHeight: 1.65,
            margin: 0,
          }}
        >
          CareCircle organises medications, lab results, and appointments for your loved ones - with AI that reads documents and speaks your language. Morning and evening digests, straight to WhatsApp.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          <Link href="/signup" style={btn.primary}>
            Get started <ArrowRight size={16} />
          </Link>
          <Link href="/login" style={btn.ghost}>
            Log In
          </Link>
        </div>

        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.05em",
          }}
        >
        </p>

        {/* Floating dashboard preview */}
        <DashboardPreview />
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   DASHBOARD PREVIEW (decorative)
   ───────────────────────────────────────────── */
function DashboardPreview() {
  return (
    <div
      style={{
        marginTop: 16,
        width: "100%",
        maxWidth: 760,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 20,
        padding: 20,
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Status strip */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <StatusPill label="HbA1c" value="7.2%" status="watch" note="Last checked 12 days ago" />
        <StatusPill label="Creatinine" value="1.1 mg/dL" status="ok" note="Apollo, Jan 3" />
        <StatusPill label="Drug interactions" value="1 flagged" status="alert" note="Requires review" />
        <StatusPill label="Refill" value="Metformin" status="watch" note="8 days remaining" />
      </div>

      {/* Morning digest preview */}
      <div
        style={{
          background: "rgba(29,158,117,0.08)",
          border: "1px solid rgba(29,158,117,0.2)",
          borderRadius: 14,
          padding: "14px 18px",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          textAlign: "left",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "#25D366",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <MessageCircle size={18} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              marginBottom: 4,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Morning digest · 7:30 AM
          </p>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              color: "rgba(255,255,255,0.8)",
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: T.white }}>Good morning!</strong> Rajan has a Cardiology appointment at Apollo tomorrow at 10:30 AM. Metformin refill needed within 8 days. HbA1c trending up - last 3 readings: 6.8 → 7.1 → 7.2.
          </p>
        </div>
      </div>
    </div>
  );
}

interface StatusPillProps {
  label: string;
  value: string;
  status: "ok" | "watch" | "alert";
  note: string;
}

function StatusPill({ label, value, status, note }: StatusPillProps) {
  const colors = {
    ok: { bg: "rgba(99,153,34,0.15)", border: "rgba(99,153,34,0.3)", dot: T.ok, text: "#8DC847" },
    watch: { bg: "rgba(239,159,39,0.15)", border: "rgba(239,159,39,0.3)", dot: T.watch, text: "#F5BE6A" },
    alert: { bg: "rgba(226,75,74,0.15)", border: "rgba(226,75,74,0.3)", dot: T.alert, text: "#EF8080" },
  };
  const c = colors[status];
  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 10,
        padding: "8px 12px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flex: "1 1 160px",
        minWidth: 0,
      }}
    >
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: c.text,
            lineHeight: 1.2,
          }}
        >
          {value}
        </p>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            color: "rgba(255,255,255,0.3)",
          }}
        >
          {note}
        </p>
      </div>
    </div>
  );
}


/* ─────────────────────────────────────────────
   HOW IT WORKS
   ───────────────────────────────────────────── */
interface StepItem {
  step: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

const STEPS: StepItem[] = [
  {
    step: "01",
    icon: Upload,
    title: "Upload your first document",
    description:
      "Photo a prescription, lab report, or doctor note. Or record a voice note. Any format, any language.",
  },
  {
    step: "02",
    icon: Sparkles,
    title: "AI extracts and structures",
    description:
      "Our AI reads the document and extracts every medication, lab value, and date in seconds. You review and confirm before anything is saved.",
  },
  {
    step: "03",
    icon: TrendingUp,
    title: "Track, act, and coordinate",
    description:
      "See trends, get refill alerts, prepare for appointments with auto-generated briefings. Your care team stays in sync via WhatsApp.",
  },
];

function HowItWorks() {
  return (
    <section style={{ background: T.bg, padding: "96px 24px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <SectionHeader
          mono="How it works"
          title="From paper to insight in three steps"
          sub="No manual entry. No app for caregivers. Just forward a photo and CareCircle handles the rest."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
            marginTop: 56,
          }}
        >
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                style={{
                  background: T.white,
                  borderRadius: 18,
                  padding: 32,
                  border: `1px solid ${T.border}`,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Step number watermark */}
                <span
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 20,
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 56,
                    fontWeight: 500,
                    color: T.tealLight,
                    lineHeight: 1,
                    userSelect: "none",
                  }}
                >
                  {s.step}
                </span>

                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: T.tealLight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                  }}
                >
                  <Icon size={22} color={T.teal} />
                </div>
                <h3
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: 18,
                    color: T.navy,
                    marginBottom: 10,
                    lineHeight: 1.3,
                  }}
                >
                  {s.title}
                </h3>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    color: T.muted,
                    lineHeight: 1.65,
                  }}
                >
                  {s.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FEATURES GRID
   ───────────────────────────────────────────── */
interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
  tag: string | null;
}

const FEATURES: FeatureItem[] = [
  {
    icon: Pill,
    title: "Medication tracking",
    description:
      "Upload prescriptions and CareCircle extracts every medication, dose, and schedule automatically. Brand-to-generic translation built in.",
    tag: null,
  },
  {
    icon: FlaskConical,
    title: "Lab result trends",
    description:
      "Track HbA1c, creatinine, and 100+ markers over time. Spot changes before they become problems. Every reading attributed to its source and date.",
    tag: null,
  },
  {
    icon: Mic,
    title: "Voice logging",
    description:
      "Record a voice note about today's symptoms. Saravam AI transcribes and structures the data for you  in Hindi-English code-switching handled.",
    tag: null,
  },
  {
    icon: Bot,
    title: "AI assistant",
    description:
      'Ask anything "When was his last HbA1c?" or "Which medications were prescribed by a cardiologist?" The AI knows your full history.',
    tag: null,
  },
  {
    icon: Users,
    title: "Caregiver network",
    description:
      "Invite family or professional caregivers via WhatsApp. No app install needed. They send voice updates; you see everything in your dashboard.",
    tag: null,
  },
  {
    icon: ShieldAlert,
    title: "Crisis mode",
    description:
      "One tap shows emergency contacts, critical medications, allergies, and de-escalation steps. Pre-computed. Zero generation delay when it matters most.",
    tag: "Emergency",
  },
];

function Features() {
  return (
    <section style={{ background: T.white, padding: "96px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <SectionHeader
          mono="Features"
          title="Everything in one place"
          sub="From prescriptions to voice notes - CareCircle handles it all, so you don't have to juggle five apps."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 18,
            marginTop: 56,
          }}
        >
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                style={{
                  background: T.bg,
                  borderRadius: 18,
                  padding: "28px 28px",
                  border: `1px solid ${T.border}`,
                  transition: "border-color .2s",
                  position: "relative",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.teal)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.border)}
              >
                {f.tag && (
                  <span
                    style={{
                      position: "absolute",
                      top: 20,
                      right: 20,
                      background: "rgba(226,75,74,0.12)",
                      color: T.alert,
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 10,
                      fontWeight: 500,
                      padding: "3px 8px",
                      borderRadius: 6,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    {f.tag}
                  </span>
                )}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: T.tealLight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <Icon size={20} color={T.teal} />
                </div>
                <h3
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: 16,
                    color: T.navy,
                    marginBottom: 8,
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13.5,
                    color: T.muted,
                    lineHeight: 1.65,
                  }}
                >
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   STATUS CARD EXPLAINER
   ───────────────────────────────────────────── */
function StatusExplainer() {
  return (
    <section style={{ background: T.navy, padding: "96px 24px" }}>
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 56,
          alignItems: "center",
        }}
      >
        {/* Left copy */}
        <div>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: T.teal,
              marginBottom: 14,
              display: "block",
            }}
          >
            At-a-glance status
          </span>
          <h2
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(26px, 3.5vw, 40px)",
              color: T.white,
              lineHeight: 1.15,
              marginBottom: 18,
              letterSpacing: "-0.5px",
            }}
          >
            Know instantly
            <br />
            how your loved one is doing
          </h2>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 15,
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1.7,
              marginBottom: 28,
            }}
          >
            Every dimension of health - medications, lab results, caregiver reports gets a single word status. No guessing. No reading through reports. Just open the app and see.
          </p>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: "rgba(255,255,255,0.4)",
              fontStyle: "italic",
            }}
          >
            Status cards degrade visually as data gets stale. So you always know how fresh the information is.
          </p>
        </div>

        {/* Right — status cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            {
              label: "Medications",
              status: "OK",
              color: T.ok,
              bg: "rgba(99,153,34,0.12)",
              border: "rgba(99,153,34,0.25)",
              detail: "All 4 medications on schedule · No interactions flagged",
            },
            {
              label: "Lab Results",
              status: "WATCH",
              color: T.watch,
              bg: "rgba(239,159,39,0.12)",
              border: "rgba(239,159,39,0.25)",
              detail: "HbA1c trending up — 6.8 → 7.1 → 7.2 over 3 months",
            },
            {
              label: "Drug Interactions",
              status: "ALERT",
              color: T.alert,
              bg: "rgba(226,75,74,0.12)",
              border: "rgba(226,75,74,0.25)",
              detail: "Amlodipine + Grapefruit — moderate interaction detected",
            },
            {
              label: "Caregiver Reports",
              status: "OK",
              color: T.ok,
              bg: "rgba(99,153,34,0.12)",
              border: "rgba(99,153,34,0.25)",
              detail: "Voice note received yesterday evening",
            },
          ].map((c) => (
            <div
              key={c.label}
              style={{
                background: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: 14,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  fontWeight: 500,
                  color: c.color as string,
                  background: `${c.color}22`,
                  border: `1px solid ${c.color}55`,
                  padding: "4px 10px",
                  borderRadius: 6,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  flexShrink: 0,
                }}
              >
                {c.status}
              </span>
              <div>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: 13,
                    color: T.white,
                    marginBottom: 2,
                  }}
                >
                  {c.label}
                </p>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.5)",
                    lineHeight: 1.4,
                  }}
                >
                  {c.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   WHATSAPP SECTION
   ───────────────────────────────────────────── */
function WhatsAppSection() {
  return (
    <section style={{ background: T.bg, padding: "96px 24px" }}>
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 64,
          alignItems: "center",
        }}
      >
        {/* WhatsApp mock */}
        <div
          style={{
            background: "#0A1929",
            borderRadius: 22,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          }}
        >
          {/* WA header */}
          <div
            style={{
              background: "#075E54",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: T.teal,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Activity size={16} color="#fff" />
            </div>
            <div>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#fff",
                  lineHeight: 1.2,
                }}
              >
                CareCircle
              </p>
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 10,
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                +91 98765 00001
              </p>
            </div>
          </div>

          {/* Messages */}
          <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            <WaMessage
              text="Good morning! Rajan has a Cardiology appointment at Apollo tomorrow at 10:30 AM. Metformin refill needed within 8 days. HbA1c trending up — last 3: 6.8 → 7.1 → 7.2."
              time="7:31 AM"
              cta="Upload File"
            />
            <WaMessage
              text="🔴 Drug interaction flagged: Amlodipine + Grapefruit (moderate). Please consult Dr. Suresh before next dose."
              time="7:31 AM"
              alert
            />
          </div>
        </div>

        {/* Copy */}
        <div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(37,211,102,0.1)",
              border: "1px solid rgba(37,211,102,0.25)",
              color: "#25D366",
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              padding: "5px 14px",
              borderRadius: 999,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              marginBottom: 18,
            }}
          >
            <MessageCircle size={12} />
            WhatsApp-native
          </span>
          <h2
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(24px, 3.5vw, 38px)",
              color: T.navy,
              lineHeight: 1.15,
              marginBottom: 16,
              letterSpacing: "-0.5px",
            }}
          >
            Works where your family already is
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 32 }}>
            {[
              {
                icon: Clock,
                title: "Morning & evening digest",
                desc: "Rajan's health summary delivered to your WhatsApp every day at your chosen time. Tap to upload a new document - no login needed.",
              },
              {
                icon: Users,
                title: "Caregiver via WhatsApp only",
                desc: "Your caregiver never needs to install an app. They send voice notes to CareCircle's number and you see everything structured in your dashboard.",
              },
              {
                icon: Bell,
                title: "Instant alerts",
                desc: "Drug interactions, refill reminders, and missed appointment gaps all come to WhatsApp the moment they're detected.",
              },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: T.tealLight,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={16} color={T.teal} />
                  </div>
                  <div>
                    <p
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontWeight: 600,
                        fontSize: 14,
                        color: T.navy,
                        marginBottom: 3,
                      }}
                    >
                      {f.title}
                    </p>
                    <p
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        color: T.muted,
                        lineHeight: 1.6,
                      }}
                    >
                      {f.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

interface WaMessageProps {
  text: string;
  time: string;
  cta?: string;
  alert?: boolean;
}

function WaMessage({ text, time, cta, alert: isAlert }: WaMessageProps) {
  return (
    <div
      style={{
        background: isAlert ? "rgba(226,75,74,0.12)" : "rgba(255,255,255,0.06)",
        border: isAlert ? "1px solid rgba(226,75,74,0.3)" : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "12px 14px",
        maxWidth: "90%",
      }}
    >
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          color: "rgba(255,255,255,0.85)",
          lineHeight: 1.5,
          marginBottom: cta ? 10 : 0,
        }}
      >
        {text}
      </p>
      {cta && (
        <div
          style={{
            background: T.teal,
            color: "#fff",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            fontSize: 13,
            padding: "7px 14px",
            borderRadius: 8,
            textAlign: "center",
            display: "inline-block",
          }}
        >
          📎 {cta}
        </div>
      )}
      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          color: "rgba(255,255,255,0.3)",
          marginTop: 6,
          textAlign: "right",
        }}
      >
        {time}
      </p>
    </div>
  );
}


/* ─────────────────────────────────────────────
   FAQ
   ───────────────────────────────────────────── */
interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: "Does the caregiver need to install an app?",
    a: "No. The caregiver only needs WhatsApp. They receive visit reminders and send voice note updates via the CareCircle WhatsApp number. They never need to download anything.",
  },
  {
    q: "Is my health data secure?",
    a: "All documents are stored in private, encrypted storage. Files are accessed via signed URLs that expire - they are never publicly accessible. JWT tokens for authentication expire every hour.",
  },
  {
    q: "What if the AI extracts something incorrectly?",
    a: "Nothing is saved automatically. After every document upload, you see all extracted fields on an approval screen. You can edit any field before confirming. You are always in control.",
  },
  {
    q: "Can I manage multiple family members?",
    a: "Yes. You can add multiple patients - for example, both parents - and switch between them. Each patient has their own dashboard, medication list, and status cards.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section style={{ background: T.bg, padding: "96px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <SectionHeader mono="FAQ" title="Common questions" sub="" />
        <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 8 }}>
          {FAQS.map((f, i) => (
            <div
              key={i}
              style={{
                background: T.white,
                borderRadius: 14,
                border: `1px solid ${open === i ? T.teal : T.border}`,
                overflow: "hidden",
                transition: "border-color .2s",
              }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: "100%",
                  padding: "18px 22px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: 15,
                    color: T.navy,
                    lineHeight: 1.4,
                  }}
                >
                  {f.q}
                </span>
                <ChevronDown
                  size={18}
                  color={T.teal}
                  style={{
                    transform: open === i ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform .2s",
                    flexShrink: 0,
                  }}
                />
              </button>
              {open === i && (
                <div style={{ padding: "0 22px 18px" }}>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 14,
                      color: T.muted,
                      lineHeight: 1.7,
                    }}
                  >
                    {f.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   CTA SECTION
   ───────────────────────────────────────────── */
function CTASection() {
  return (
    <section style={{ background: T.navy, padding: "96px 24px" }}>
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 18,
            background: T.teal,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Activity size={28} color="#fff" />
        </div>
        <h2
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(28px, 4vw, 44px)",
            color: T.white,
            lineHeight: 1.15,
            letterSpacing: "-0.5px",
          }}
        >
          Start managing health
          <br />
          with clarity
        </h2>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 16,
            color: "rgba(255,255,255,0.6)",
            lineHeight: 1.65,
            maxWidth: 460,
          }}
        >
          Join families who use CareCircle to organise medications, track lab results, and keep their entire care team in sync  all via WhatsApp.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          <Link href="/signup" style={{ ...btn.primary, fontSize: 16, padding: "14px 32px" }}>
            Get started <ArrowRight size={17} />
          </Link>
          <Link href="/login" style={{ ...btn.ghost, fontSize: 16, padding: "14px 28px" }}>
            Log In
          </Link>
        </div>
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.05em",
          }}
        >
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FOOTER
   ───────────────────────────────────────────── */
function Footer() {
  return (
    <footer
      style={{
        background: "#081F3D",
        padding: "48px 24px 32px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 32,
          marginBottom: 40,
        }}
      >
        {/* Brand */}
        <div style={{ maxWidth: 280 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: T.teal,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Activity size={15} color="#fff" />
            </div>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700,
                fontSize: 16,
                color: T.white,
              }}
            >
              CareCircle
            </span>
          </div>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              color: "rgba(255,255,255,0.4)",
              lineHeight: 1.65,
            }}
          >
            AI-powered health management for Indian families. Medications, lab results, and care coordination
          </p>
        </div>

        {/* Links */}
        {[
          {
            title: "Product",
            links: [
              { label: "Features", href: "#features" },
              { label: "How it works", href: "#how" },
              { label: "WhatsApp", href: "#whatsapp" },
              { label: "Crisis mode", href: "#crisis" },
            ],
          },
          {
            title: "Account",
            links: [
              { label: "Sign up", href: "/signup" },
              { label: "Log In", href: "/login" },
            ],
          },
        ].map((col) => (
          <div key={col.title}>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                color: "rgba(255,255,255,0.35)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              {col.title}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {col.links.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.5)",
                    textDecoration: "none",
                    transition: "color .15s",
                  }}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: 24,
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
        }}
      >
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            color: "rgba(255,255,255,0.2)",
          }}
        >
          © {new Date().getFullYear()} CareCircle. All rights reserved.
        </p>
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            color: "rgba(255,255,255,0.2)",
          }}
        >
          Made with care in India
        </p>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────
   SHARED: SECTION HEADER
   ───────────────────────────────────────────── */
interface SectionHeaderProps {
  mono?: string;
  title: string;
  sub?: string;
}

function SectionHeader({ mono, title, sub }: SectionHeaderProps) {
  return (
    <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto" }}>
      {mono && (
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: T.teal,
            marginBottom: 14,
            display: "block",
          }}
        >
          {mono}
        </span>
      )}
      <h2
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 700,
          fontSize: "clamp(26px, 3.5vw, 40px)",
          color: T.navy,
          lineHeight: 1.15,
          letterSpacing: "-0.5px",
          marginBottom: sub ? 14 : 0,
        }}
      >
        {title}
      </h2>
      {sub && (
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 16,
            color: T.muted,
            lineHeight: 1.65,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE ROOT
   ───────────────────────────────────────────── */
export default function RootPage() {
  return (
    <div style={{ background: T.bg, minHeight: "100vh" }}>
      {/* Font import — add to your globals.css or layout.tsx instead */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,300;1,9..40,400&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { margin: 0; padding: 0; }
      ` }} />

      <Navbar />
      <main style={{ margin: 0, padding: 0 }}>
        <Hero />
        <HowItWorks />
        <Features />
        <StatusExplainer />
        <WhatsAppSection />
        <FAQ />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
