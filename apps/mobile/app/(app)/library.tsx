import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../lib/api";

type JournalEntry = {
  id: string;
  title?: string | null;
  body: string;
  entryDate: string | null;
  source: string;
  favorite?: boolean;
  createdAt: string;
  updatedAt: string;
};

function formatEntryDate(value: string | null): string {
  if (!value) return "Undated";

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function excerpt(body: string): string {
  const compact = body.replace(/\s+/g, " ").trim();
  if (!compact) return "No text yet.";
  return compact.length > 140 ? `${compact.slice(0, 140)}…` : compact;
}

export default function Library() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const rows = await api<JournalEntry[]>("/entries");
      setEntries(rows);
    } catch {
      setError("Could not load your library. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load({ refresh: true })} />
      }
      contentContainerStyle={{
        paddingTop: insets.top + 24,
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 48,
      }}
    >
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text className="text-4xl text-deep-brown">Library</Text>
          <Text className="text-soft-ink mt-1">Your saved pages</Text>
        </View>

        <Pressable
          onPress={() => router.push("/(app)/today")}
          className="rounded-full border border-border bg-surface px-4 py-2"
        >
          <Text className="text-soft-ink">Today</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="min-h-80 items-center justify-center">
          <ActivityIndicator color="#3A2F25" />
        </View>
      ) : error ? (
        <View className="mt-10 rounded-3xl border border-border bg-surface p-5">
          <Text className="text-ink">{error}</Text>
          <Pressable onPress={() => void load()} className="mt-4">
            <Text className="text-deep-brown">Try again</Text>
          </Pressable>
        </View>
      ) : entries.length === 0 ? (
        <View className="mt-10 rounded-3xl border border-border bg-surface p-5">
          <Text className="text-lg text-ink">No pages yet.</Text>
          <Text className="mt-2 text-soft-ink leading-relaxed">
            Write something on Today and it will appear here.
          </Text>
        </View>
      ) : (
        <View className="mt-8 gap-4">
          {entries.map((entry) => (
            <Pressable
              key={entry.id}
              onPress={() =>
                router.push({
                  pathname: "/(app)/entries/[id]",
                  params: { id: entry.id },
                })
              }
              className="rounded-3xl border border-border bg-surface p-5"
            >
              <View className="flex-row items-center justify-between gap-3">
                <Text className="text-sm text-soft-ink">
                  {formatEntryDate(entry.entryDate)}
                </Text>
                {entry.favorite ? (
                  <Text className="text-sm text-accent-sepia">Favorite</Text>
                ) : null}
              </View>

              {entry.title ? (
                <Text className="mt-3 text-xl text-deep-brown">{entry.title}</Text>
              ) : null}

              <Text className="mt-3 text-base leading-6 text-ink">
                {excerpt(entry.body)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
