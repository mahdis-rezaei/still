import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getYearInPages, type YearInPages } from "../../lib/extras";
import { EntryRefCard } from "../../components/entry-ref-card";

// Year in Pages: a quiet look back at a year — how much you wrote, how much you
// reflected, and the pages you marked favorite. Step across years.
export default function Year() {
  const insets = useSafeAreaInsets();
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<YearInPages | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (y: number) => {
    setLoading(true);
    try {
      setData(await getYearInPages(y));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(year);
    }, [load, year]),
  );

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: 14,
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 48,
      }}
    >
      <Text className="text-4xl text-deep-brown">Year in Pages</Text>

      <View className="mt-6 flex-row items-center justify-between">
        <Pressable
          onPress={() => setYear((y) => y - 1)}
          className="rounded-full border border-border bg-surface px-4 py-2"
        >
          <Text className="text-soft-ink">‹</Text>
        </Pressable>
        <Text className="text-2xl text-deep-brown">{year}</Text>
        <Pressable
          onPress={() => setYear((y) => y + 1)}
          className="rounded-full border border-border bg-surface px-4 py-2"
        >
          <Text className="text-soft-ink">›</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="min-h-80 items-center justify-center">
          <ActivityIndicator color="#3A2F25" />
        </View>
      ) : !data ? (
        <Text className="text-soft-ink mt-10">Couldn't load that year.</Text>
      ) : (
        <>
          <View className="mt-8 flex-row gap-4">
            <View className="flex-1 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-3xl text-deep-brown">{data.pageCount}</Text>
              <Text className="text-soft-ink mt-1">
                {data.pageCount === 1 ? "page" : "pages"}
              </Text>
            </View>
            <View className="flex-1 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-3xl text-deep-brown">
                {data.reflectionCount}
              </Text>
              <Text className="text-soft-ink mt-1">
                {data.reflectionCount === 1 ? "reflection" : "reflections"}
              </Text>
            </View>
          </View>

          {data.pageCount === 0 ? (
            <View className="mt-8 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-soft-ink leading-relaxed">
                No pages from {year} yet.
              </Text>
            </View>
          ) : data.favorites.length > 0 ? (
            <View className="mt-8">
              <Text className="text-xs uppercase tracking-widest text-faint-ink mb-3">
                Pages you treasured
              </Text>
              <View className="gap-4">
                {data.favorites.map((f) => (
                  <EntryRefCard key={f.entryId} {...f} />
                ))}
              </View>
            </View>
          ) : (
            <Text className="text-soft-ink mt-8 leading-relaxed">
              Mark pages as favorite and they'll gather here.
            </Text>
          )}
        </>
      )}
    </ScrollView>
  );
}
