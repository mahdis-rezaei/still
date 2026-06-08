import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import { AppHeader } from "../../components/app-header";

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
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client-side search over title + body (matches the web's search behavior).
  const q = query.trim().toLowerCase();
  const filtered = q
    ? entries.filter(
        (e) =>
          (e.title ?? "").toLowerCase().includes(q) ||
          e.body.toLowerCase().includes(q),
      )
    : entries;

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

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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
      <AppHeader />
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text className="text-4xl text-deep-brown">Library</Text>
          <Text className="text-soft-ink mt-1">Your saved pages</Text>
        </View>
        <Pressable
          onPress={() => router.push("/(app)/import")}
          className="mt-2"
          hitSlop={8}
        >
          <Text className="text-accent-sepia">Bring old journals →</Text>
        </Pressable>
      </View>

      {/* Ways to browse the library. */}
      <View className="mt-5 flex-row gap-2">
        {[
          { label: "Calendar", to: "/(app)/calendar" },
          { label: "Collections", to: "/(app)/collections" },
          { label: "Shelf", to: "/(app)/shelf" },
        ].map((b) => (
          <Pressable
            key={b.to}
            onPress={() => router.push(b.to as never)}
            className="flex-1 items-center rounded-full border border-border bg-surface px-3 py-2"
          >
            <Text className="text-soft-ink" style={{ fontSize: 13 }}>
              {b.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {!loading && !error && entries.length > 0 ? (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search your pages…"
          placeholderTextColor="#A59B8D"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          className="mt-6 rounded-full border border-border bg-surface px-5 py-3 text-ink"
        />
      ) : null}

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
      ) : filtered.length === 0 ? (
        <View className="mt-10 rounded-3xl border border-border bg-surface p-5">
          <Text className="text-soft-ink leading-relaxed">
            No pages match “{query.trim()}”.
          </Text>
        </View>
      ) : (
        <View className="mt-8 gap-4">
          {filtered.map((entry) => (
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
