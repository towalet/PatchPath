/**
 * Authentication context.
 *
 * Holds the current user + auth status and exposes login/register/logout. On
 * mount it restores the session by calling /auth/me/ when an access token is
 * present (see docs/AGENT_PLAN.md §14).
 */
import { createContext, useEffect, useState, type ReactNode } from "react";

import { fetchMe, login as apiLogin, register as apiRegister } from "../api/auth";
import { tokenStore } from "../api/client";
import type { User } from "../types/api";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    tokenStore.getAccess() ? "loading" : "anonymous",
  );

  // Restore the session from a stored access token (refresh-and-retry handles
  // an expired access token transparently inside the API client).
  useEffect(() => {
    let active = true;
    if (!tokenStore.getAccess()) return;

    fetchMe()
      .then((me) => {
        if (!active) return;
        setUser(me);
        setStatus("authenticated");
      })
      .catch(() => {
        if (!active) return;
        tokenStore.clear();
        setUser(null);
        setStatus("anonymous");
      });

    return () => {
      active = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiLogin({ email, password });
    tokenStore.set(res.access, res.refresh);
    setUser(res.user);
    setStatus("authenticated");
  };

  const register = async (email: string, name: string, password: string) => {
    const res = await apiRegister({ email, name, password });
    tokenStore.set(res.access, res.refresh);
    setUser(res.user);
    setStatus("authenticated");
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
    setStatus("anonymous");
  };

  const value: AuthContextValue = { user, status, login, register, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
