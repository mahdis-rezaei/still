import "../global.css";
import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../lib/auth";
import { BiometricLockGate } from "../lib/biometric-lock";

const queryClient = new QueryClient();

// Auth gate: send signed-out users to sign-in, signed-in users into the app.
function Gate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const inAuthGroup = segments[0] === "(auth)";

  useEffect(() => {
    if (loading) return;
    if (!user && !inAuthGroup) router.replace("/(auth)/sign-in");
    else if (user && inAuthGroup) router.replace("/(app)/today");
  }, [user, loading, inAuthGroup, router]);

  return (
    <BiometricLockGate enabled={!loading && Boolean(user) && !inAuthGroup}>
      <Slot />
    </BiometricLockGate>
  );
}

export default function RootLayout() {
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
