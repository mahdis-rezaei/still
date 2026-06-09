import { cloneElement, useEffect, useState } from "react";
import { Text as RNText, StyleSheet } from "react-native";

// Brand typography to match the web: Fraunces (display) · Newsreader (body) ·
// Inter (UI). React Native won't auto-swap weight/italic font files like a
// browser, so we patch <Text> once to choose the right loaded font family by
// role — inferred from size + weight + style — unless a fontFamily is set
// explicitly. The actual font files load asynchronously (useAppFonts); until
// they're ready the OS falls back, then a re-render swaps them in. Everything is
// wrapped in try/catch so a load failure quietly leaves system fonts (no crash).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickFamily(flat: any): string {
  const size: number | undefined = typeof flat?.fontSize === "number" ? flat.fontSize : undefined;
  const w = flat?.fontWeight;
  const bold =
    w === "bold" ||
    w === "600" || w === "700" || w === "800" || w === "900" ||
    (typeof w === "number" && w >= 600);
  const medium = w === "500" || w === "600" || (typeof w === "number" && w >= 500);
  const italic = flat?.fontStyle === "italic";

  // Large text → Fraunces (the display face, like the web's headings & wordmark).
  if (size != null && size >= 22) return "Fraunces_600SemiBold";
  // Small text → Inter (UI labels, chips, tab labels).
  if (size != null && size <= 13) return bold || medium ? "Inter_600SemiBold" : "Inter_400Regular";
  // Body → Newsreader, honouring italic / weight.
  if (italic) return "Newsreader_400Regular_Italic";
  if (bold) return "Newsreader_600SemiBold";
  if (medium) return "Newsreader_500Medium";
  return "Newsreader_400Regular";
}

function patchText() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const T = RNText as any;
  if (T.__fontPatched) return;
  // RN's Text is a forwardRef component, so its render fn lives on `.render`.
  const orig = T.render;
  if (typeof orig !== "function") return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T.render = function (...args: any[]) {
    const el = orig.apply(this, args);
    try {
      const childStyle = el?.props?.style;
      const flat = StyleSheet.flatten(childStyle) || {};
      // Respect an explicit fontFamily; otherwise pick by role.
      const family = flat.fontFamily || pickFamily(flat);
      return cloneElement(el, { style: [{ fontFamily: family }, childStyle] });
    } catch {
      return el;
    }
  };
  T.__fontPatched = true;
}

// Patch as early as this module is imported (before the first render), so the
// role-based font family is in place from the first frame — the files below then
// load and take effect on the next render.
patchText();

export function useAppFonts(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
        patchText(); // idempotent — ensures the patch is in place post-load
      } catch {
        // Any trouble → system fonts, never crash.
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
