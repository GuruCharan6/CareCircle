"use client";

/**
 * DEV ONLY — Preview bypass
 * Seeds fake auth into localStorage so the app layout renders without a real backend.
 * Delete this file before production.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const FAKE_USER = {
  id: "dev-user-001",
  phone_number: "+91 98765 43210",
  email: null,
  auth_provider: "phone",
  name: "Dev User",
  role: "family_caregiver",
  preferences: {},
  created_at: new Date().toISOString(),
  last_login_at: new Date().toISOString(),
};

const FAKE_AUTH = {
  access_token:  "dev_fake_token",
  refresh_token: "dev_fake_refresh",
  expires_in:    86400, // 24h
};

export default function DevBypassPage() {
  const router = useRouter();

  useEffect(() => {
    // Seed auth storage
    const expiresAt = Date.now() + FAKE_AUTH.expires_in * 1000;
    localStorage.setItem("cc_access_token",  FAKE_AUTH.access_token);
    localStorage.setItem("cc_refresh_token", FAKE_AUTH.refresh_token);
    localStorage.setItem("cc_expires_at",    String(expiresAt));
    localStorage.setItem("cc_user",          JSON.stringify(FAKE_USER));

    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <p className="text-[var(--color-muted)] text-sm">Seeding dev auth…</p>
    </div>
  );
}
