import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../../lib/api";

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
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function EntryDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const id = useMemo(() => {
    const value = params.id;
    return Array.isArray(value) ? value[0] : value;
  }, [params.id]);

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) {
        setError("Entry not found.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const row = await api<JournalEntry>(`/entries/${id}`);
        if (!cancelled) setEntry(row);
      } catch {
        if (!cancelled) setError("Could not load this page.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 24,
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 48,
      }}
    >
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => router.back()}>
          <Text className="text-soft-ink">Back</Text>
        </Pressable>

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
          <Pressable onPress={() => router.back()} className="mt-4">
            <Text className="text-deep-brown">Return to Library</Text>
          </Pressable>
        </View>
      ) : entry ? (
        <>
          <Text className="mt-10 text-4xl text-deep-brown">
            {entry.title || "Page"}
          </Text>
          <Text className="mt-2 text-soft-ink">
            {formatEntryDate(entry.entryDate)}
          </Text>

          <View className="mt-8 rounded-3xl border border-border bg-surface p-5">
            <Text className="text-lg leading-8 text-ink">{entry.body}</Text>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
