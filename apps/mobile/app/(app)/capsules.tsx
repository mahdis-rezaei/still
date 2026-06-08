import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  listCapsules,
  createCapsule,
  openCapsule,
  longDate,
  type Capsule,
} from "../../lib/extras";
import { KeyboardDone, KEYBOARD_DONE_ID } from "../../components/keyboard-done";

// Memory Capsules: seal a letter to your future self; it stays locked until its
// delivery date, then you can open it. Delivery is chosen from presets (a native
// date picker would need a rebuild; presets keep this JS-only).
const PRESETS = [
  { label: "In 1 year", years: 1 },
  { label: "In 5 years", years: 5 },
  { label: "In 10 years", years: 10 },
];

function isoYearsFromNow(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString();
}

export default function Capsules() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Capsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [years, setYears] = useState(1);
  const [sealing, setSealing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listCapsules());
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

  async function seal() {
    if (!body.trim() || sealing) return;
    setSealing(true);
    try {
      const c = await createCapsule(body.trim(), isoYearsFromNow(years));
      setBody("");
      setItems((list) =>
        [c, ...list].sort((a, b) => a.deliverAt.localeCompare(b.deliverAt)),
      );
    } catch {
      // keep text for retry
    } finally {
      setSealing(false);
    }
  }

  async function open(c: Capsule) {
    try {
      const updated = await openCapsule(c.id);
      setItems((list) => list.map((x) => (x.id === c.id ? updated : x)));
    } catch {
      // ignore
    }
  }

  return (
    <>
    <ScrollView
      className="flex-1 bg-background"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: 14,
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 48,
      }}
    >
      <Text className="text-4xl text-deep-brown">Capsules</Text>
      <Text className="text-soft-ink mt-1 leading-relaxed">
        Seal a letter to your future self. It stays closed until its day.
      </Text>

      {/* compose */}
      <View className="mt-6 rounded-3xl border border-border bg-surface p-5 gap-4">
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Dear future me…"
          placeholderTextColor="#A59B8D"
          multiline
          textAlignVertical="top"
          inputAccessoryViewID={KEYBOARD_DONE_ID}
          className="min-h-[120px] text-base leading-6 text-ink"
        />
        <View className="flex-row gap-2">
          {PRESETS.map((p) => {
            const sel = p.years === years;
            return (
              <Pressable
                key={p.years}
                onPress={() => setYears(p.years)}
                className={
                  "flex-1 items-center rounded-full border px-3 py-2 " +
                  (sel ? "bg-deep-brown border-deep-brown" : "bg-surface border-border")
                }
              >
                <Text
                  style={{ fontSize: 13 }}
                  className={sel ? "text-background" : "text-soft-ink"}
                >
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={seal}
          disabled={!body.trim() || sealing}
          style={{ opacity: !body.trim() || sealing ? 0.5 : 1 }}
          className="items-center rounded-full bg-deep-brown py-3"
        >
          <Text className="text-background">{sealing ? "Sealing…" : "Seal it"}</Text>
        </Pressable>
      </View>

      {/* list */}
      {loading ? (
        <View className="min-h-60 items-center justify-center">
          <ActivityIndicator color="#3A2F25" />
        </View>
      ) : items.length === 0 ? null : (
        <View className="mt-8 gap-4">
          {items.map((c) => (
            <View key={c.id} className="rounded-3xl border border-border bg-surface p-5">
              {!c.delivered ? (
                <>
                  <Text className="text-faint-ink text-xs uppercase tracking-widest">
                    Sealed
                  </Text>
                  <Text className="text-deep-brown mt-2 text-lg">
                    Opens {longDate(c.deliverAt)}
                  </Text>
                </>
              ) : c.body && c.openedAt ? (
                <>
                  <Text className="text-faint-ink text-xs uppercase tracking-widest">
                    Delivered {longDate(c.deliverAt)}
                  </Text>
                  <Text className="text-ink mt-3 text-base leading-6 whitespace-pre-line">
                    {c.body}
                  </Text>
                </>
              ) : (
                <>
                  <Text className="text-deep-brown text-lg">
                    A capsule has arrived.
                  </Text>
                  <Pressable
                    onPress={() => open(c)}
                    className="self-start mt-4 rounded-full bg-deep-brown px-5 py-2"
                  >
                    <Text className="text-background">Open it</Text>
                  </Pressable>
                </>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
    <KeyboardDone />
    </>
  );
}
