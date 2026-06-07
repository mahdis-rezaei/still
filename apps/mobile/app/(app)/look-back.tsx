import { ScrollView, View, Text, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  getLookBack,
  onThisDayLabel,
  localTodayISO,
  type DateMemory,
} from "../../lib/memories";
import { DateMemoryCard } from "../../components/date-memory-card";

// Look Back: every date-based way a page returns, gathered into quiet sections.
// On this day + around this time are dated; favorites are the ones you treasured;
// forgotten are pages you haven't opened in a long while. Each section is silent
// when empty — never an empty shelf. The engine doesn't speak here; these are
// your own pages, surfaced by date.
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
    <View className="mb-10">
      <Text className="font-display text-2xl text-deep-brown mb-4">{title}</Text>
      <View className="gap-4">
        {items.map((m) => (
          <DateMemoryCard key={m.entryId} heading={heading(m)} memory={m} />
        ))}
      </View>
    </View>
  );
}

export default function LookBack() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const date = localTodayISO();
  const { data, isLoading } = useQuery({
    queryKey: ["look-back", date],
    queryFn: () => getLookBack(date),
    staleTime: 60 * 60 * 1000,
  });

  const empty =
    data &&
    data.onThisDay.length === 0 &&
    data.aroundThisTime.length === 0 &&
    data.favorites.length === 0 &&
    data.forgotten.length === 0;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingHorizontal: 24,
        paddingBottom: 32,
      }}
    >
      <Pressable onPress={() => router.back()} className="mb-4" hitSlop={8}>
        <Text className="text-soft-ink">← Back</Text>
      </Pressable>

      <Text className="text-4xl text-deep-brown mb-2">Look back</Text>
      <Text className="text-soft-ink mb-8 leading-relaxed">
        Your own pages, by date and by the ones you treasured.
      </Text>

      {isLoading ? (
        <ActivityIndicator color="#8A6F4D" />
      ) : empty ? (
        <Text className="text-soft-ink leading-relaxed">
          Nothing to look back on yet. As your pages span more time, this fills in
          on its own.
        </Text>
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
