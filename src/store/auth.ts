import { create } from "zustand";

export interface GmailUser {
  email?: string;
  name?: string;
  picture?: string;
}

interface AuthState {
  /** Short-lived Gmail access token. Kept in memory ONLY — never persisted. */
  accessToken: string | null;
  /** Epoch ms when the access token expires. */
  expiresAt: number | null;
  user: GmailUser | null;
  status: "idle" | "authenticating" | "authenticated" | "error";
  error: string | null;

  setSession: (token: string, expiresInSec: number, user?: GmailUser) => void;
  setStatus: (s: AuthState["status"], error?: string | null) => void;
  clear: () => void;
  /** True if we have a token that isn't within 60s of expiring. */
  isTokenValid: () => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  accessToken: null,
  expiresAt: null,
  user: null,
  status: "idle",
  error: null,

  setSession: (token, expiresInSec, user) =>
    set((prev) => ({
      accessToken: token,
      expiresAt: Date.now() + expiresInSec * 1000,
      user: user ?? prev.user,
      status: "authenticated",
      error: null,
    })),

  setStatus: (status, error = null) => set({ status, error }),

  clear: () =>
    set({
      accessToken: null,
      expiresAt: null,
      user: null,
      status: "idle",
      error: null,
    }),

  isTokenValid: () => {
    const { accessToken, expiresAt } = get();
    return !!accessToken && !!expiresAt && Date.now() < expiresAt - 60_000;
  },
}));
