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
import { registerForPushNotifications } from "@/src/lib/notifications";

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
          const token = await firebaseUser.getIdToken();
          setIdToken(token);
          const backendLoginKey = `${firebaseUser.uid}:${token}`;

          if (backendLoginKeyRef.current === backendLoginKey) {
            return;
          }

          backendLoginKeyRef.current = backendLoginKey;

          loginWithToken(token)
            .then((backendUser) => {
              if (backendLoginKeyRef.current !== backendLoginKey) return;
              setUser(backendUser);

              // Register push token after successful login.
              // Fire-and-forget: never blocks or breaks the auth flow.
              registerForPushNotifications(token).catch((err) =>
                console.warn("[notifications] registration failed:", err)
              );
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
          setIsBootstrapping(false);
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
