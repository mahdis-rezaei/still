import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import type { DateMemory } from "../lib/memories";

// A date-based resurfaced page (On This Day / Look Back) — a raw excerpt, not a
// voiced engine pick. The heading carries the "when" ("A year ago today"); tap
// to read the full page. Quiet and plain; the engine never speaks here.
export function DateMemoryCard({
  heading,
  memory,
}: {
  heading: string;
  memory: DateMemory;
}) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/entry/${memory.entryId}`)}
      className="border border-border rounded-2xl bg-surface/70 p-5"
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="font-sans text-xs uppercase tracking-widest text-faint-ink">
          {heading}
        </Text>
        {memory.favorite && <Text className="text-accent-sepia">★</Text>}
      </View>
      {!!memory.title && (
        <Text className="font-display text-lg text-deep-brown mb-1">
          {memory.title}
        </Text>
      )}
      <Text className="font-body text-soft-ink leading-relaxed" numberOfLines={4}>
        {memory.excerpt}
      </Text>
    </Pressable>
  );
}
