"use client";

/**
 * PhoneInput — shows a fixed "+91" prefix badge.
 * User types 10-digit number only.
 * `value` / `onChange` always deal with the full E.164 string ("+91XXXXXXXXXX").
 */
interface PhoneInputProps {
  value: string;            // Full E.164 value e.g. "+919876543210" (or "" when empty)
  onChange: (e164: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function PhoneInput({
  value,
  onChange,
  id,
  placeholder = "98765 43210",
  className = "",
  disabled,
  autoFocus,
  onKeyDown,
}: PhoneInputProps) {
  // Strip +91 or + prefix to show only the local digits in the input
  const localDigits = value.startsWith("+91")
    ? value.slice(3)
    : value.startsWith("+")
    ? value.slice(1)
    : value;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Keep only digits
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    // Always send full E.164 value upstream (empty string when no digits)
    onChange(digits ? `+91${digits}` : "");
  }

  return (
    <div className={`flex h-11 rounded-xl border-2 overflow-hidden bg-white transition-colors duration-150 border-[var(--color-border)] focus-within:border-[var(--color-action)] ${className}`}>
      {/* Fixed +91 badge */}
      <div className="flex items-center px-3 bg-[var(--color-surface)] border-r border-[var(--color-border)] shrink-0 select-none">
        <span className="text-sm font-semibold text-[var(--color-text)]">+91</span>
      </div>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder={placeholder}
        value={localDigits}
        onChange={handleChange}
        disabled={disabled}
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
        autoComplete="tel-national"
        className="flex-1 px-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)]/60 focus:outline-none font-mono bg-transparent"
      />
    </div>
  );
}
