"use client";

import { useState, useRef, KeyboardEvent, ClipboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface OtpFormProps {
  phone: string;
  onVerify: (token: string) => Promise<void>;
  onResend: () => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

function OtpForm({ phone, onVerify, onResend, loading, error }: OtpFormProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function updateDigit(index: number, value: string) {
    const d = [...digits];
    d[index] = value.slice(-1);
    setDigits(d);
    if (value && index < 5) inputs.current[index + 1]?.focus();
    if (d.every(Boolean)) onVerify(d.join(""));
  }

  function handleKey(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const d = [...digits];
    pasted.split("").forEach((ch, i) => { d[i] = ch; });
    setDigits(d);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) onVerify(pasted);
  }

  async function handleResend() {
    await onResend();
    setResendCooldown(30);
    const t = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(t); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  const filled = digits.filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* OTP digit inputs */}
      <div role="group" aria-label="One-time password" className="flex gap-2 justify-center">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={el => { inputs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            aria-label={`Digit ${i + 1}`}
            onChange={e => updateDigit(i, e.target.value.replace(/\D/g, ""))}
            onKeyDown={e => handleKey(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            onFocus={e => e.target.select()}
            className={cn(
              "w-11 h-14 text-center text-xl font-bold rounded-xl border-2 font-mono",
              "transition-all duration-150 focus:outline-none",
              "cursor-pointer select-none",
              error
                ? "border-[var(--color-alert)] bg-red-50 text-[var(--color-alert)]"
                : digit
                  ? "border-[var(--color-action)] bg-[var(--color-surface)] text-[var(--color-primary)]"
                  : "border-[var(--color-border)] bg-white text-[var(--color-text)] focus:border-[var(--color-action)]"
            )}
          />
        ))}
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-200",
              i < filled
                ? "bg-[var(--color-action)] scale-110"
                : "bg-[var(--color-border)]"
            )}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-[var(--color-alert)] text-center font-medium">
          {error}
        </p>
      )}

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        loading={loading}
        onClick={() => onVerify(digits.join(""))}
        disabled={digits.some(d => !d)}
      >
        Verify code
      </Button>

      <p className="text-sm text-center text-[var(--color-muted)]">
        Didn&apos;t receive it?{" "}
        {resendCooldown > 0 ? (
          <span className="text-[var(--color-action)] font-mono text-xs">
            Resend in {resendCooldown}s
          </span>
        ) : (
          <button
            onClick={handleResend}
            className="text-[var(--color-action)] font-semibold hover:underline cursor-pointer"
          >
            Resend
          </button>
        )}
      </p>
    </div>
  );
}

export { OtpForm };
