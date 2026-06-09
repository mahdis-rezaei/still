import { useEffect, useState } from "react";
import { Text as RNText } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

// Loads the brand fonts (Fraunces · Newsreader · Inter) and makes Newsreader the
// global serif body default. Everything is GUARDED: a build without expo-font's
// native module (ExpoFontLoader) simply keeps system fonts instead of crashing —
// we never even import the font packages unless the module is present (importing
// them otherwise throws "Cannot find native module 'ExpoFontLoader'").
function fontModuleAvailable(): boolean {
  try {
    return requireOptionalNativeModule("ExpoFontLoader") != null;
  } catch {
    return false;
  }
}

export function useAppFonts(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!fontModuleAvailable()) {
        if (!cancelled) setReady(true); // system fonts; never block the app
        return;
      }
      try {
        const Font = await import("expo-font");
        const [fraunces, newsreader, inter] = await Promise.all([
          import("@expo-google-fonts/fraunces"),
          import("@expo-google-fonts/newsreader"),
          import("@expo-google-fonts/inter"),
        ]);
        await Font.loadAsync({
          Fraunces_400Regular: fraunces.Fraunces_400Regular,
          Fraunces_600SemiBold: fraunces.Fraunces_600SemiBold,
          Newsreader_400Regular: newsreader.Newsreader_400Regular,
          Newsreader_500Medium: newsreader.Newsreader_500Medium,
          Newsreader_600SemiBold: newsreader.Newsreader_600SemiBold,
          Newsreader_400Regular_Italic: newsreader.Newsreader_400Regular_Italic,
          Inter_400Regular: inter.Inter_400Regular,
          Inter_500Medium: inter.Inter_500Medium,
          Inter_600SemiBold: inter.Inter_600SemiBold,
        });
        const T = RNText as unknown as { defaultProps?: { style?: unknown } };
        T.defaultProps = T.defaultProps ?? {};
        if (!T.defaultProps.style) {
          T.defaultProps.style = [{ fontFamily: "Newsreader_400Regular" }];
        }
      } catch {
        // Any font trouble → fall back to system fonts, never crash.
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
