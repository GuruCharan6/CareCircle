"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { authStorage } from "@/lib/auth-storage";
import type { UserResponse } from "@/lib/types";

interface AuthState {
  user: UserResponse | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: authStorage.getUser(),
    loading: false,
    error: null,
  });

  function setError(error: string | null) {
    setState(prev => ({ ...prev, error, loading: false }));
  }

  function setLoading(loading: boolean) {
    setState(prev => ({ ...prev, loading, error: null }));
  }

  const sendOtp = useCallback(async (phone: string) => {
    setLoading(true);
    try {
      await authApi.sendOtp({ phone_number: phone });
      setState(prev => ({ ...prev, loading: false }));
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
      return false;
    }
  }, []);

  const verifyOtp = useCallback(async (phone: string, token: string) => {
    setLoading(true);
    try {
      const auth = await authApi.verifyOtp({ phone_number: phone, token });
      authStorage.save(auth);
      setState({ user: auth.user, loading: false, error: null });
      return auth;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid OTP");
      return null;
    }
  }, []);

  const googleSignIn = useCallback(async (idToken: string) => {
    setLoading(true);
    try {
      const auth = await authApi.googleSignIn({ id_token: idToken });
      authStorage.save(auth);
      setState({ user: auth.user, loading: false, error: null });
      return auth;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Google sign-in failed");
      return null;
    }
  }, []);

  const logout = useCallback(() => {
    authStorage.clear();
    setState({ user: null, loading: false, error: null });
    router.replace("/login");
  }, [router]);

  const refreshUser = useCallback(async () => {
    if (!authStorage.isLoggedIn()) return;
    try {
      const user = await authApi.me();
      const stored = authStorage.getUser();
      if (stored) localStorage.setItem("cc_user", JSON.stringify({ ...stored, ...user }));
      setState(prev => ({ ...prev, user }));
    } catch {
      // Silently fail — client.ts handles 401 + redirect
    }
  }, []);

  const updateProfile = useCallback(async (data: { name?: string; preferences?: Record<string, unknown> }) => {
    setLoading(true);
    try {
      const updated = await authApi.updateProfile(data);
      // Patch localStorage user cache
      const stored = authStorage.getUser();
      if (stored) {
        const merged = { ...stored, ...updated };
        localStorage.setItem("cc_user", JSON.stringify(merged));
      }
      setState(prev => ({ ...prev, user: updated, loading: false }));
      return updated;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update profile");
      return null;
    }
  }, []);

  // Hydrate user from storage on mount
  useEffect(() => {
    const user = authStorage.getUser();
    if (user) setState(prev => ({ ...prev, user }));
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    isLoggedIn: !!state.user,
    sendOtp,
    verifyOtp,
    googleSignIn,
    logout,
    refreshUser,
    updateProfile,
  };
}
