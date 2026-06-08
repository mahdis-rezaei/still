import * as AppleAuthentication from "expo-apple-authentication";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { API_ORIGIN, api, setToken } from "./api";
import { registerForPush, unregisterForPush } from "./push";

WebBrowser.maybeCompleteAuthSession();

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
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
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

  const signInWithGoogle = async () => {
    const returnTo = Linking.createURL("auth/google");
    const startUrl = `${API_ORIGIN}/api/auth/google?client=mobile&returnTo=${encodeURIComponent(returnTo)}`;
    const result = await WebBrowser.openAuthSessionAsync(startUrl, returnTo);

    if (result.type !== "success") return;

    const url = new URL(result.url);
    const error = url.searchParams.get("error");
    const token = url.searchParams.get("token");

    if (error || !token) {
      throw new Error(error ?? "Google sign-in failed");
    }

    await setToken(token);
    const me = await api<MobileUser>("/auth/me");
    setUser(me);
    void registerForPush();
  };

  const signInWithApple = async () => {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error("Apple sign-in did not return an identity token");
    }

    const r = await api<MobileUser & { token?: string }>("/auth/apple/mobile", {
      method: "POST",
      body: {
        identityToken: credential.identityToken,
        fullName: credential.fullName,
      },
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

  const completeOnboarding = async () => {
    await api("/auth/complete-onboarding", { method: "POST" });
    setUser((u) => (u ? { ...u, onboardingCompleted: true } : u));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        signInWithApple,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
