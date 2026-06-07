import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, AppState, Pressable, Text, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { useAuth } from "./auth";

type LockStatus = "checking" | "locked" | "unlocked";

export function BiometricLockGate({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const { signOut } = useAuth();
  const [status, setStatus] = useState<LockStatus>("unlocked");
  const [message, setMessage] = useState<string | null>(null);

  const unlock = useCallback(async () => {
    if (!enabled) {
      setStatus("unlocked");
      setMessage(null);
      return;
    }

    setStatus("checking");
    setMessage(null);

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      // Simulator/devices without biometrics should not trap the user.
      // They can still use the app while the feature remains enabled on real devices.
      if (!hasHardware || !isEnrolled) {
        setStatus("unlocked");
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Yadegar",
        fallbackLabel: "Use passcode",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });

      if (result.success) {
        setStatus("unlocked");
        return;
      }

      setStatus("locked");
      setMessage("Yadegar is locked.");
    } catch {
      // Graceful dev fallback: never strand the user behind a native-module error.
      setStatus("unlocked");
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setStatus("unlocked");
      setMessage(null);
      return;
    }

    void unlock();
  }, [enabled, unlock]);

  useEffect(() => {
    if (!enabled) return;

    let shouldLockOnReturn = false;

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "inactive" || nextState === "background") {
        shouldLockOnReturn = true;
        setStatus("locked");
      }

      if (nextState === "active" && shouldLockOnReturn) {
        shouldLockOnReturn = false;
        void unlock();
      }
    });

    return () => subscription.remove();
  }, [enabled, unlock]);

  if (!enabled || status === "unlocked") {
    return <>{children}</>;
  }

  return (
    <View className="flex-1 items-center justify-center bg-background px-8">
      <Text className="text-center text-3xl text-deep-brown">
        Yadegar is locked
      </Text>

      <Text className="mt-3 text-center text-soft-ink leading-relaxed">
        {message ?? "Use Face ID, Touch ID, or your device passcode to open your journal."}
      </Text>

      {status === "checking" ? (
        <ActivityIndicator size="large" />
      ) : (
        <Pressable
          onPress={unlock}
          className="mt-8 w-full rounded-full bg-deep-brown px-5 py-4"
        >
          <Text className="text-center text-base text-background">Unlock</Text>
        </Pressable>
      )}

      <Pressable onPress={signOut} className="mt-6">
        <Text className="text-soft-ink">Sign out</Text>
      </Pressable>
    </View>
  );
}
