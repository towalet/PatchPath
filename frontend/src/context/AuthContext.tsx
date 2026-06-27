/**
 * Authentication context.
 *
 * Holds the current user + auth status and exposes login/register/logout. On
 * mount it should restore the session by calling /auth/me/ (see AGENT_PLAN §14).
 * This is the structural skeleton; the network wiring is a TODO.
 */
import { createContext, useState, type ReactNode } from "react";

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
  const [status, setStatus] = useState<AuthStatus>("anonymous");

  // TODO: on mount, attempt session restore via fetchMe().

  const value: AuthContextValue = {
    user,
    status,
    login: async () => {
      throw new Error("AuthContext.login not implemented");
    },
    register: async () => {
      throw new Error("AuthContext.register not implemented");
    },
    logout: () => {
      setUser(null);
      setStatus("anonymous");
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
