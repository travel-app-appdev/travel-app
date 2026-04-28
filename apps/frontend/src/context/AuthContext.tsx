import { createContext, useContext, useState, ReactNode } from "react";
import type { AuthResponse } from "@/src/api/auth";

type AuthContextValue = {
  user: AuthResponse | null;
  idToken: string | null;
  setUser: (user: AuthResponse | null) => void;
  setIdToken: (token: string | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);

  return (
    <AuthContext.Provider value={{ user, setUser, idToken, setIdToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}