import { Pressable, Text, View } from "react-native";

// A small segmented control (Off · Weekly · Monthly, Open · Gentle · Protected…).
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row gap-2">
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            className={
              "flex-1 items-center rounded-full border px-3 py-2 " +
              (sel ? "bg-deep-brown border-deep-brown" : "bg-surface border-border")
            }
          >
            <Text
              style={{ fontSize: 13 }}
              className={sel ? "text-background" : "text-soft-ink"}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
