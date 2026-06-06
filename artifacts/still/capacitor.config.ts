import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor wraps the existing Vite web build (webDir) in the native iOS/Android
// shells. Generate the native projects with `npx cap add ios` / `npx cap add
// android` after a `pnpm build` — see docs/MOBILE-BUILD-RUNBOOK.md.
const config: CapacitorConfig = {
  appId: "com.yadegarjournal.app",
  appName: "Yadegar",
  webDir: "dist/public",
  backgroundColor: "#F7F1E6",
  ios: {
    contentInset: "always",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#F7F1E6",
      showSpinner: false,
    },
    Keyboard: {
      resize: "native",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
