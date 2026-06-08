import { ScrollView, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Explore: the home for everything that isn't Today or Look back — mirrors the
// web's Explore section (Library · Shelf · Collections · Capsules), plus the
// date/keepsake views. A simple hub of cards.
const SECTIONS: { title: string; items: { label: string; sub: string; to: string }[] }[] = [
  {
    title: "Your pages",
    items: [
      { label: "Library", sub: "Every page you've kept, searchable", to: "/(app)/library" },
      { label: "Calendar", sub: "Browse month by month", to: "/(app)/calendar" },
    ],
  },
  {
    title: "Gathered",
    items: [
      { label: "Shelf", sub: "Pages you set aside to keep close", to: "/(app)/shelf" },
      { label: "Collections", sub: "Group pages by person, place, thread", to: "/(app)/collections" },
    ],
  },
  {
    title: "Keepsakes",
    items: [
      { label: "Capsules", sub: "Sealed letters to your future self", to: "/(app)/capsules" },
      { label: "Year in Pages", sub: "A look back at a year", to: "/(app)/year" },
    ],
  },
];

export default function Explore() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: 14,
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 48,
      }}
    >
      <Text className="text-4xl text-deep-brown">Explore</Text>

      {SECTIONS.map((s) => (
        <View key={s.title} className="mt-8">
          <Text className="text-xs uppercase tracking-widest text-faint-ink mb-3">
            {s.title}
          </Text>
          <View className="gap-3">
            {s.items.map((it) => (
              <Pressable
                key={it.to}
                onPress={() => router.push(it.to as never)}
                className="rounded-3xl border border-border bg-surface p-5"
              >
                <Text className="text-xl text-deep-brown">{it.label}</Text>
                <Text className="text-soft-ink mt-1 leading-relaxed">{it.sub}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
