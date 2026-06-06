import { useEffect, useState } from "react";
import { isNativeApp, prefGet, prefSet } from "@/lib/native";
import { APP_LOCK_KEY } from "./lock-gate";

// Native-only toggle (renders nothing on web) for the biometric app lock.
export function AppLockSetting() {
  const [native] = useState(() => isNativeApp());
  const [on, setOn] = useState(false);

  useEffect(() => {
    void (async () => {
      const v = await prefGet(APP_LOCK_KEY);
      setOn(v === "on");
    })();
  }, []);

  if (!native) return null;

  async function toggle() {
    const next = !on;
    setOn(next);
    await prefSet(APP_LOCK_KEY, next ? "on" : "off");
  }

  return (
    <section className="mb-10">
      <p className="font-sans text-xs uppercase tracking-[0.18em] text-faint-ink mb-3">
        Privacy
      </p>
      <button
        onClick={() => void toggle()}
        className="w-full text-left border border-border rounded-xl bg-surface/60 p-5 hover:border-accent-sepia transition-colors flex items-center justify-between gap-4"
        data-testid="toggle-app-lock"
      >
        <span>
          <span className="font-body text-lg text-ink block">
            Lock with Face ID / biometrics
          </span>
          <span className="font-body text-soft-ink text-sm mt-1 block">
            Require your face, fingerprint, or passcode to open Yadegar.
          </span>
        </span>
        <span
          className={
            "shrink-0 rounded-full w-11 h-6 flex items-center transition-colors " +
            (on ? "bg-accent-sepia" : "bg-border")
          }
          aria-hidden="true"
        >
          <span
            className={
              "w-5 h-5 bg-surface rounded-full shadow transition-transform " +
              (on ? "translate-x-5" : "translate-x-0.5")
            }
          />
        </span>
      </button>
    </section>
  );
}
