import { useEffect, useState, type ReactNode } from "react";
import { isNativeApp, prefGet } from "@/lib/native";

export const APP_LOCK_KEY = "yadegar_app_lock";

// Biometric/passcode verification via the optional capacitor-native-biometric
// plugin. A *variable* import specifier keeps TypeScript/Vite from hard-requiring
// the package at build time — install it for native builds (see the runbook). On
// web this is never reached.
async function biometricVerify(): Promise<boolean> {
  try {
    const spec = "capacitor-native-biometric";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import(/* @vite-ignore */ spec);
    const NativeBiometric = mod?.NativeBiometric;
    if (!NativeBiometric) return true;
    const avail = await NativeBiometric.isAvailable();
    if (!avail?.isAvailable) return true; // no hardware → don't lock the user out
    await NativeBiometric.verifyIdentity({
      reason: "Unlock your journal",
      title: "Yadegar",
    });
    return true;
  } catch {
    return false;
  }
}

// Gates the app behind a biometric/passcode unlock when the user has enabled
// "lock with Face ID" (native only). No-op on web and when disabled.
export function LockGate({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!isNativeApp()) return;
      const v = await prefGet(APP_LOCK_KEY);
      if (cancelled) return;
      if (v === "on") {
        setEnabled(true);
        setLocked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-lock whenever the app is backgrounded.
  useEffect(() => {
    if (!enabled) return;
    let remove: (() => void) | undefined;
    void (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("appStateChange", ({ isActive }) => {
          if (!isActive) setLocked(true);
        });
        remove = () => void handle.remove();
      } catch {
        /* ignore */
      }
    })();
    return () => remove?.();
  }, [enabled]);

  async function unlock() {
    if (checking) return;
    setChecking(true);
    const ok = await biometricVerify();
    setChecking(false);
    if (ok) setLocked(false);
  }

  // Auto-prompt as soon as we enter the locked state.
  useEffect(() => {
    if (locked) void unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  if (!enabled || !locked) return <>{children}</>;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 px-8 text-center">
      <div className="font-display text-3xl text-deep-brown">Yadegar</div>
      <p className="font-body text-soft-ink">Your journal is locked.</p>
      <button
        onClick={() => void unlock()}
        disabled={checking}
        className="font-sans text-sm border border-border hover:border-accent-sepia rounded-full px-6 py-2 text-soft-ink hover:text-ink transition-colors disabled:opacity-50"
        data-testid="button-unlock"
      >
        {checking ? "Unlocking…" : "Unlock"}
      </button>
    </div>
  );
}
