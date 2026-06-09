import { Pressable, Text, View } from "react-native";
import type { FormatAction } from "../lib/markup";

// A calm formatting toolbar for the writer. Presentational only — it just calls
// back with the action; the screen owns the text + selection and applies it.
// Tapping a button formats the current selection (bold/italic) or the current
// line (heading/list/quote), using lightweight markers the writer can see.

const BUTTONS: { action: FormatAction; label: string; hint: string }[] = [
  { action: "bold", label: "B", hint: "Bold" },
  { action: "italic", label: "I", hint: "Italic" },
  { action: "h2", label: "H", hint: "Heading" },
  { action: "h3", label: "H₃", hint: "Subheading" },
  { action: "ul", label: "•", hint: "Bulleted list" },
  { action: "ol", label: "1.", hint: "Numbered list" },
  { action: "quote", label: "❝", hint: "Quote" },
];

export function FormatToolbar({ onAction }: { onAction: (a: FormatAction) => void }) {
  return (
    <View className="flex-row flex-wrap items-center gap-2">
      {BUTTONS.map((b) => (
        <Pressable
          key={b.action}
          onPress={() => onAction(b.action)}
          accessibilityLabel={b.hint}
          hitSlop={6}
          className="h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-background px-2.5"
        >
          <Text
            className="text-soft-ink"
            style={{
              fontSize: 15,
              fontWeight: b.action === "bold" ? "700" : "500",
              fontStyle: b.action === "italic" ? "italic" : "normal",
            }}
          >
            {b.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
