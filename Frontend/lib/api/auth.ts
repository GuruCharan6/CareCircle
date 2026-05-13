import { api } from "./client";
import type {
  OTPSendRequest, OTPSendResponse,
  OTPVerifyRequest, AuthResponse,
  GoogleAuthRequest, RefreshTokenRequest,
  UserResponse,
} from "../types";

export const authApi = {
  sendOtp(data: OTPSendRequest) {
    return api.post<OTPSendResponse>("/auth/otp/send", data);
  },

  verifyOtp(data: OTPVerifyRequest) {
    return api.post<AuthResponse>("/auth/otp/verify", data);
  },

  googleSignIn(data: GoogleAuthRequest) {
    return api.post<AuthResponse>("/auth/google", data);
  },

  refresh(data: RefreshTokenRequest) {
    return api.post<AuthResponse>("/auth/refresh", data);
  },

  me() {
    return api.get<UserResponse>("/auth/me");
  },

  updateProfile(data: { name?: string; preferences?: Record<string, unknown> }) {
    return api.patch<UserResponse>("/auth/me", data);
  },

  sendPhoneOtp(phone_number: string) {
    return api.post<{ message: string; phone_number: string }>("/auth/me/phone/send-otp", { phone_number });
  },

  verifyPhoneOtp(phone_number: string, otp: string) {
    return api.post<UserResponse>("/auth/me/phone/verify-otp", { phone_number, otp });
  },

  removePhone() {
    return api.delete<UserResponse>("/auth/me/phone");
  },

  verifyWhatsApp() {
    return api.post<{ connected: boolean; error?: string }>("/auth/me/whatsapp/verify", {});
  },
};
