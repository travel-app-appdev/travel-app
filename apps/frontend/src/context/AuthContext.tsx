import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/src/lib/firebase";
import { loginWithToken } from "@/src/api/auth";
import type { AuthResponse } from "@/src/api/auth";

type AuthContextValue = {
  user: AuthResponse | null;
  idToken: string | null;
  setUser: (user: AuthResponse | null) => void;
  setIdToken: (token: string | null) => void;
  isBootstrapping: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const backendLoginKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let hasResolvedOnce = false;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get Firebase token
          const token = await firebaseUser.getIdToken();
          setIdToken(token);
          const backendLoginKey = `${firebaseUser.uid}:${token}`;

          if (backendLoginKeyRef.current === backendLoginKey) {
            return;
          }

          backendLoginKeyRef.current = backendLoginKey;

          // Kick off backend login, but DON'T block bootstrap on it
          loginWithToken(token)
            .then((backendUser) => {
              if (backendLoginKeyRef.current !== backendLoginKey) return;
              setUser(backendUser);
            })
            .catch(() => {
              if (backendLoginKeyRef.current !== backendLoginKey) return;
              backendLoginKeyRef.current = null;
              setUser(null);
              setIdToken(null);
            });
        } else {
          backendLoginKeyRef.current = null;
          setUser(null);
          setIdToken(null);
        }
      } finally {
        if (!hasResolvedOnce) {
          hasResolvedOnce = true;
          setIsBootstrapping(false); // we’re done with initial auth check
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, setUser, idToken, setIdToken, isBootstrapping }}
    >
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
