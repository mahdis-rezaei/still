import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { isNativeApp, apiBaseUrl, getStoredToken } from "./native";

let initialized = false;

// Called once before React mounts (see main.tsx). On web it's a no-op so the
// existing relative-URL + cookie behaviour is untouched. On native it wires the
// API client to the remote origin + Bearer token and sets up the native shell.
export async function initNative(): Promise<void> {
  if (initialized) return;
  initialized = true;
  if (!isNativeApp()) return;

  // Route the API client at the real backend, authenticated by stored token.
  setBaseUrl(apiBaseUrl());
  setAuthTokenGetter(() => getStoredToken());

  // Mark the document so CSS can apply native-only safe-area insets.
  try {
    document.documentElement.classList.add("cap-native");
  } catch {
    /* ignore */
  }

  // Status bar: dark content over the light paper background.
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    try {
      await StatusBar.setBackgroundColor({ color: "#F7F1E6" }); // Android only
    } catch {
      /* iOS ignores background colour */
    }
  } catch {
    /* status bar plugin unavailable */
  }

  // Let the webview resize for the keyboard natively (better editor behaviour).
  try {
    const { Keyboard, KeyboardResize } = await import("@capacitor/keyboard");
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
  } catch {
    /* keyboard plugin unavailable */
  }

  // Universal/deep links → in-app navigation.
  try {
    const { App } = await import("@capacitor/app");
    App.addListener("appUrlOpen", (data) => {
      try {
        const url = new URL(data.url);
        const path = `${url.pathname}${url.search}${url.hash}`;
        if (path && path !== "/") {
          window.history.pushState({}, "", path);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
      } catch {
        /* ignore malformed deep links */
      }
    });
    // Android hardware back button: navigate back, or exit at the root.
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack && window.history.length > 1) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch {
    /* @capacitor/app unavailable */
  }

  // Dismiss the native splash once the web layer is ready.
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* splash plugin unavailable */
  }
}
