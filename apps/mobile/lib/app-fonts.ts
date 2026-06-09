import { Text as RNText } from "react-native";
import { useFonts, Fraunces_400Regular, Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import {
  Newsreader_400Regular,
  Newsreader_500Medium,
  Newsreader_600SemiBold,
  Newsreader_400Regular_Italic,
} from "@expo-google-fonts/newsreader";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";

// Loads the brand fonts (Fraunces · Newsreader · Inter — exactly the web's set)
// and makes the serif body font (Newsreader) the global default, so every Text
// reads like the web without touching each component. Headings can be lifted to
// Fraunces with the `font-display` class; UI labels to Inter with `font-sans`.
export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
    Newsreader_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (loaded) {
    // Set once: the default font for every <Text>. className styles (size/color)
    // still win; only the font family is supplied here.
    const T = RNText as unknown as { defaultProps?: { style?: unknown } };
    T.defaultProps = T.defaultProps ?? {};
    if (!T.defaultProps.style) {
      T.defaultProps.style = [{ fontFamily: "Newsreader_400Regular" }];
    }
  }

  return loaded;
}
