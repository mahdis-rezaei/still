import { Capacitor } from "@capacitor/core";

// Single source of truth for "are we running inside the Capacitor native shell?"
// Everything native is guarded by this so the web build behaves exactly as before.
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function nativePlatform(): "ios" | "android" | "web" {
  try {
    const p = Capacitor.getPlatform();
    return p === "ios" || p === "android" ? p : "web";
  } catch {
    return "web";
  }
}

// On native the app is served from capacitor://localhost, so relative "/api"
// paths don't resolve — they must be prefixed with the real API origin. This is
// the *origin only* (no /api suffix); the app's own paths already start "/api".
// Configurable at build time via VITE_API_BASE_URL; defaults to production.
export function apiBaseUrl(): string {
  const env = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return (env && env.trim()) || "https://yadegarjournal.com";
}

// ── Session token (native only) ───────────────────────────────────────────────
// Web keeps using the httpOnly session cookie. Native has no reliable cross-origin
// cookie, so it stores the opaque session token and sends it as a Bearer header.
// @capacitor/preferences is the baseline; the runbook covers upgrading to the
// Keychain/Keystore-backed secure-storage plugin.
const TOKEN_KEY = "yadegar_session_token";

export async function getStoredToken(): Promise<string | null> {
  if (!isNativeApp()) return null;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: TOKEN_KEY });
    return value ?? null;
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string | null): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    if (token) await Preferences.set({ key: TOKEN_KEY, value: token });
    else await Preferences.remove({ key: TOKEN_KEY });
  } catch {
    /* best-effort */
  }
}

// ── Small native niceties ─────────────────────────────────────────────────────
export async function haptic(
  style: "light" | "medium" | "heavy" = "light",
): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    const map = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    } as const;
    await Haptics.impact({ style: map[style] });
  } catch {
    /* haptics are optional */
  }
}

// A generic key/value read/write for small native flags (e.g. app-lock setting).
export async function prefGet(key: string): Promise<string | null> {
  if (!isNativeApp()) return null;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key });
    return value ?? null;
  } catch {
    return null;
  }
}

export async function prefSet(key: string, value: string): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key, value });
  } catch {
    /* best-effort */
  }
}
