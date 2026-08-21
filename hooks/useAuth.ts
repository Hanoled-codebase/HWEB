"use client";

import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import { useOrganization } from "@/hooks/useOrganization";

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role?: string;
  studentId?: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  checkAuth: (options?: { force?: boolean }) => Promise<User | null>;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  checkAuth: async (options = {}) => {
    const { force = false } = options;
    const state = get();

    if (!force && (state.isInitialized || state.isLoading)) {
      return state.user;
    }

    try {
      set({ isLoading: true, error: null });
      const rawUser = await apiFetch<any>("/me");
      const user = {
        ...rawUser,
        name: rawUser.displayName,
        email: rawUser.primaryEmail,
      } as User;
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        error: null,
      });
      return user;
    } catch (error: unknown) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : "Authentication failed",
        isInitialized: true,
      });
      return null;
    }
  },

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
      error: null,
      isInitialized: true,
      isLoading: false,
    });
  },

  logout: async () => {
    set({ isLoading: true, isInitialized: true });
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout failed", e);
    } finally {
      useOrganization.getState().clear();
      set({ user: null, isAuthenticated: false, error: null });
      if (typeof window !== "undefined") {
        window.location.assign("/signin");
      }
    }
  }
}));
