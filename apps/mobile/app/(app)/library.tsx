import { FlatList, View, Text, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { listEntries, longDate, type Entry } from "../../lib/entries";

// The Library: every page, newest first. Tap one to read it.
export default function Library() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["entries"],
    queryFn: listEntries,
  });
  const entries = data ?? [];

  function preview(e: Entry): string {
    const line = e.title?.trim() || e.body.trim().split("\n")[0];
    return line.length > 120 ? line.slice(0, 119).trimEnd() + "…" : line;
  }

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 24,
          paddingBottom: 32,
        }}
        ListHeaderComponent={
          <Text className="text-4xl text-deep-brown mb-6">Library</Text>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color="#8A6F4D" />
          ) : (
            <Text className="text-soft-ink">
              No pages yet. Write your first on Today.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/entry/${item.id}`)}
            className="border border-border rounded-xl bg-surface/70 p-4 mb-3"
          >
            <Text className="text-faint-ink text-xs">
              {longDate(item.entryDate)}
              {item.source !== "manual" ? ` · ${item.source}` : ""}
            </Text>
            <Text className="text-ink mt-1 leading-snug">{preview(item)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
