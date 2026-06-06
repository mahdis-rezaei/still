import { createContext, useContext, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCurrentUser,
  useLogin,
  useRegister,
  useLogout,
  useCompleteOnboarding,
  getGetCurrentUserQueryKey,
  type AuthUser,
} from "@workspace/api-client-react";
import { isNativeApp, apiBaseUrl } from "@/lib/native";
import { nativeLogin, nativeRegister, nativeLogout } from "@/lib/native-auth";

interface AuthState {
  user: AuthUser | null;
  /** True only while the initial "am I logged in?" check is in flight. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => void;
  completeOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // GET /auth/me — a 401 means "not signed in", which is an expected state,
  // not a failure to retry. We treat any error as user = null.
  const meQuery = useGetCurrentUser({
    query: {
      retry: false,
      staleTime: 60_000,
      queryKey: getGetCurrentUserQueryKey(),
    },
  });

  const loginMut = useLogin();
  const registerMut = useRegister();
  const logoutMut = useLogout();
  const onboardingMut = useCompleteOnboarding();

  const cacheUser = (user: AuthUser) => {
    queryClient.setQueryData(getGetCurrentUserQueryKey(), user);
  };

  const login = async (email: string, password: string) => {
    const user = isNativeApp()
      ? await nativeLogin(email, password)
      : await loginMut.mutateAsync({ data: { email, password } });
    cacheUser(user);
  };

  const register = async (email: string, password: string, name?: string) => {
    const user = isNativeApp()
      ? await nativeRegister(email, password, name)
      : await registerMut.mutateAsync({
          data: { email, password, ...(name ? { name } : {}) },
        });
    cacheUser(user);
  };

  const logout = async () => {
    if (isNativeApp()) await nativeLogout();
    else await logoutMut.mutateAsync();
    queryClient.setQueryData(getGetCurrentUserQueryKey(), null);
    queryClient.clear();
  };

  const loginWithGoogle = () => {
    // Web: full-page navigation into the server-side OAuth redirect flow.
    // Native: open the absolute flow (a proper native OAuth/deep-link exchange is
    // a documented follow-up — see docs/MOBILE-BUILD-RUNBOOK.md).
    window.location.href = isNativeApp()
      ? `${apiBaseUrl()}/api/auth/google`
      : "/api/auth/google";
  };

  const completeOnboarding = async () => {
    const user = await onboardingMut.mutateAsync();
    cacheUser(user);
  };

  const value: AuthState = {
    user: meQuery.data ?? null,
    isLoading: meQuery.isLoading,
    login,
    register,
    logout,
    loginWithGoogle,
    completeOnboarding,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
