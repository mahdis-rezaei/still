import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getLookBack,
  onThisDayLabel,
  type DateMemory,
  type LookBack as LookBackData,
} from "../../lib/memories";
import { DateMemoryCard } from "../../components/date-memory-card";

// Look Back: every date-based way a page returns, gathered into quiet sections —
// on this day, around this time, the ones you treasured, and pages long unopened.
// These are your OWN pages surfaced by date; the engine doesn't speak here. Each
// section is silent when empty, so it's never an empty shelf.
function yearsAgoLabel(m: DateMemory): string {
  return m.yearsAgo === 1 ? "A year ago" : `${m.yearsAgo} years ago`;
}

function Section({
  title,
  items,
  heading,
}: {
  title: string;
  items: DateMemory[];
  heading: (m: DateMemory) => string;
}) {
  if (items.length === 0) return null;
  return (
    <View className="mt-10">
      <Text className="text-2xl text-deep-brown mb-4">{title}</Text>
      <View className="gap-4">
        {items.map((m) => (
          <DateMemoryCard key={m.entryId} heading={heading(m)} memory={m} />
        ))}
      </View>
    </View>
  );
}

export default function LookBack() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<LookBackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setData(await getLookBack());
    } catch {
      setError("Could not load your pages. Please try again.");
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

  const empty =
    data != null &&
    data.onThisDay.length === 0 &&
    data.aroundThisTime.length === 0 &&
    data.favorites.length === 0 &&
    data.forgotten.length === 0;

  return (
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load({ refresh: true })}
        />
      }
      contentContainerStyle={{
        paddingTop: insets.top + 24,
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 48,
      }}
    >
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text className="text-4xl text-deep-brown">Look back</Text>
          <Text className="text-soft-ink mt-1 leading-relaxed">
            Your own pages, by date and by the ones you treasured.
          </Text>
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
      ) : empty ? (
        <View className="mt-10 rounded-3xl border border-border bg-surface p-6">
          <Text className="text-lg text-ink">Nothing to look back on yet.</Text>
          <Text className="mt-2 text-soft-ink leading-relaxed">
            As your pages span more time, this fills in on its own.
          </Text>
        </View>
      ) : (
        <>
          <Section
            title="On this day"
            items={data!.onThisDay}
            heading={onThisDayLabel}
          />
          <Section
            title="Around this time"
            items={data!.aroundThisTime}
            heading={yearsAgoLabel}
          />
          <Section
            title="Pages you treasured"
            items={data!.favorites}
            heading={yearsAgoLabel}
          />
          <Section
            title="Long unopened"
            items={data!.forgotten}
            heading={yearsAgoLabel}
          />
        </>
      )}
    </ScrollView>
  );
}
