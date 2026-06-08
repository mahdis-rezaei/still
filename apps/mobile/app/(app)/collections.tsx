import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  listCollections,
  createCollection,
  type Collection,
} from "../../lib/extras";

// Collections: group pages by a person, place, theme — whatever you choose. List
// + create here; tap one to read its pages. (Adding pages to a collection happens
// from a page, a later refinement; create + browse is the core.)
export default function Collections() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listCollections());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function create() {
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      const c = await createCollection(trimmed);
      setName("");
      setItems((list) => [...list, c].sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      // ignore; the field keeps the text so they can retry
    } finally {
      setCreating(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: insets.top + 24,
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 48,
      }}
    >
      <Text className="text-4xl text-deep-brown">Collections</Text>
      <Text className="text-soft-ink mt-1 leading-relaxed">
        Gather pages by a person, a place, a thread.
      </Text>

      <View className="mt-6 flex-row gap-2">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="New collection…"
          placeholderTextColor="#A59B8D"
          className="flex-1 rounded-full border border-border bg-surface px-5 py-3 text-ink"
        />
        <Pressable
          onPress={create}
          disabled={!name.trim() || creating}
          style={{ opacity: !name.trim() || creating ? 0.5 : 1 }}
          className="items-center justify-center rounded-full bg-deep-brown px-5"
        >
          <Text className="text-background">Add</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="min-h-80 items-center justify-center">
          <ActivityIndicator color="#3A2F25" />
        </View>
      ) : items.length === 0 ? (
        <View className="mt-10 rounded-3xl border border-border bg-surface p-5">
          <Text className="text-soft-ink leading-relaxed">
            No collections yet. Make one above, then add pages to it from any page.
          </Text>
        </View>
      ) : (
        <View className="mt-8 gap-4">
          {items.map((c) => (
            <Pressable
              key={c.id}
              onPress={() =>
                router.push({
                  pathname: "/(app)/collection/[id]",
                  params: { id: c.id },
                })
              }
              className="flex-row items-center justify-between rounded-3xl border border-border bg-surface p-5"
            >
              <Text className="text-xl text-deep-brown">{c.name}</Text>
              <Text className="text-sm text-faint-ink">
                {c.itemCount} {c.itemCount === 1 ? "page" : "pages"}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
