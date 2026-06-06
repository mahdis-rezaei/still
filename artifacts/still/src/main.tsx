import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initNative } from "./lib/native-init";
import { isNativeApp } from "./lib/native";

// Initialise the native bridge (API base URL + Bearer token + native shell)
// before React mounts, so the first /auth/me check is authenticated correctly.
// On web this resolves immediately and changes nothing.
void initNative().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);

  // Progressive web app: register the service worker on the web (production only).
  // Skipped inside the native shell, which serves assets locally.
  if (!isNativeApp() && import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
});
