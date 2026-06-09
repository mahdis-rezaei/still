import "../global.css";
import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../lib/auth";
import { BiometricLockGate } from "../lib/biometric-lock";

const queryClient = new QueryClient();

// Auth gate: route signed-out → sign-in, brand-new users → onboarding, everyone
// else → the app.
function Gate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const inAuthGroup = segments[0] === "(auth)";
  const inOnboarding = segments[0] === "onboarding";
  // Only force onboarding when the flag is EXPLICITLY false — a missing flag
  // (older accounts) is treated as done, so no one gets trapped.
  const needsOnboarding = !!user && user.onboardingCompleted === false;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (!inAuthGroup) router.replace("/(auth)/welcome");
      return;
    }
    if (needsOnboarding) {
      if (!inOnboarding) router.replace("/onboarding");
      return;
    }
    if (inAuthGroup || inOnboarding) router.replace("/(app)/today");
  }, [user, loading, inAuthGroup, inOnboarding, needsOnboarding, router]);

  return (
    <BiometricLockGate
      enabled={!loading && Boolean(user) && !inAuthGroup && !inOnboarding}
    >
      <Slot />
    </BiometricLockGate>
  );
}

export default function RootLayout() {
  // Brand fonts are embedded in the binary (expo-font config plugin +
  // components/text.tsx) — nothing to load at runtime.
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
