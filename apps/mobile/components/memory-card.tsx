import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { LENS_LABELS, type Memory } from "../lib/memories";
import { longDate } from "../lib/entries";

// A returned page, rendered as a card. The lens becomes a plain heading, the
// writer's own quote is the payoff (80/20 — the quote carries it), the
// observation points at it. Mirrors the web MemoryCard. Optional star/dismiss
// (shown in the Returns archive; hidden on the just-now Today result).
export function MemoryCard({
  memory,
  onFavorite,
  onDismiss,
}: {
  memory: Memory;
  onFavorite?: () => void;
  onDismiss?: () => void;
}) {
  const router = useRouter();
  const heading = LENS_LABELS[memory.lens ?? ""] ?? "A page worth returning to";
  const date = memory.quoteDate ? longDate(memory.quoteDate) : null;

  return (
    <View className="border border-border rounded-2xl bg-surface/70 p-6">
      <View className="flex-row items-start justify-between gap-4 mb-4">
        <Text className="flex-1 font-sans text-xs uppercase tracking-widest text-faint-ink">
          {heading}
        </Text>
        {(onFavorite || onDismiss) && (
          <View className="flex-row items-center gap-4">
            {onFavorite && (
              <Pressable onPress={onFavorite} hitSlop={8}>
                <Text
                  className={
                    "text-lg " +
                    (memory.favorite ? "text-accent-sepia" : "text-faint-ink")
                  }
                >
                  {memory.favorite ? "★" : "☆"}
                </Text>
              </Pressable>
            )}
            {onDismiss && (
              <Pressable onPress={onDismiss} hitSlop={8}>
                <Text className="font-sans text-xs text-faint-ink">dismiss</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {date && <Text className="font-sans text-xs text-faint-ink mb-3">{date}</Text>}

      {!!memory.quote && (
        <Text className="font-display italic text-xl text-deep-brown leading-snug mb-4">
          “{memory.quote}”
        </Text>
      )}

      {!!memory.observation && (
        <Text className="font-body text-soft-ink leading-relaxed">
          {memory.observation}
        </Text>
      )}

      {!!memory.journalEntryId && (
        <Pressable
          onPress={() => router.push(`/entry/${memory.journalEntryId}`)}
          className="self-start mt-5 border-b border-accent-sepia/40"
        >
          <Text className="font-sans text-sm text-accent-sepia">
            Read the full page →
          </Text>
        </Pressable>
      )}
    </View>
  );
}
