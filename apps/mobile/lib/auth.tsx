import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, setToken } from "./api";
import { registerForPush, unregisterForPush } from "./push";

// Token auth for the native app. Mirrors the web's auth context shape, but the
// session lives as a bearer token in SecureStore (see lib/api).

export interface MobileUser {
  id: string;
  email: string;
  name?: string | null;
  plan?: "free" | "member";
  onboardingCompleted?: boolean;
  emailVerified?: boolean;
  usage?: { used: number; limit: number | null; atLimit: boolean };
}

interface AuthState {
  user: MobileUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate from a stored token on launch.
  useEffect(() => {
    (async () => {
      try {
        const me = await api<MobileUser>("/auth/me");
        setUser(me);
        // Refresh this device's push registration on every authenticated launch
        // (the backend upserts; a rotated token self-heals). Fire-and-forget.
        void registerForPush();
      } catch {
        setUser(null); // no/invalid token
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    const r = await api<MobileUser & { token?: string }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    if (r.token) await setToken(r.token);
    setUser(r);
    void registerForPush();
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const r = await api<MobileUser & { token?: string }>("/auth/register", {
      method: "POST",
      body: { email, password, ...(name ? { name } : {}) },
    });
    if (r.token) await setToken(r.token);
    setUser(r);
    void registerForPush();
  };

  const signOut = async () => {
    // Unregister BEFORE logout/clearing the token — the DELETE call still needs
    // the bearer token, and logout invalidates the session server-side.
    await unregisterForPush();
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // ignore network errors on sign-out
    }
    await setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
