import { FlatList, View, Text, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listMemories, updateMemory, type Memory } from "../../lib/memories";
import { MemoryCard } from "../../components/memory-card";

// Returns: the archive of pages the engine has brought back. They stay here to
// revisit (revisiting is always free). Star to keep, dismiss to retire. A quiet
// link leads to Look Back — your own pages by date and the ones you treasured.
export default function Returns() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["memories"],
    queryFn: listMemories,
  });
  const memories = (data ?? []).filter((m) => !m.dismissed);

  const mutate = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Memory> }) =>
      updateMemory(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memories"] }),
  });

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={memories}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 24,
          paddingBottom: 32,
        }}
        ListHeaderComponent={
          <View className="mb-6">
            <Text className="text-4xl text-deep-brown">Returns</Text>
            <Text className="text-soft-ink mt-2 leading-relaxed">
              Pages Yadegar has brought back. They stay here for you to revisit.
            </Text>
            <Pressable
              onPress={() => router.push("/look-back")}
              className="mt-3"
              hitSlop={8}
            >
              <Text className="font-sans text-sm text-soft-ink">
                Or look back through your own pages, by date and by the ones you
                treasured →
              </Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color="#8A6F4D" />
          ) : (
            <View className="border border-border rounded-2xl bg-surface/60 p-8 items-center">
              <Text className="font-body text-xl text-soft-ink mb-2 text-center">
                Nothing has returned yet.
              </Text>
              <Text className="font-body text-soft-ink text-center leading-relaxed">
                Write or bring in pages, and Yadegar will return something when
                there is something honest to return.
              </Text>
            </View>
          )
        }
        ItemSeparatorComponent={() => <View className="h-5" />}
        renderItem={({ item }) => (
          <MemoryCard
            memory={item}
            onFavorite={() =>
              mutate.mutate({ id: item.id, patch: { favorite: !item.favorite } })
            }
            onDismiss={() =>
              mutate.mutate({ id: item.id, patch: { dismissed: true } })
            }
          />
        )}
      />
    </View>
  );
}
