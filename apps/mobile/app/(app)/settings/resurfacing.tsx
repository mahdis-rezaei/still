import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getPreferences,
  updatePreferences,
  listMutes,
  addMute,
  deleteMute,
  type MemorySensitivity,
  type ResurfaceMute,
} from "../../../lib/settings";
import { Segmented } from "../../../components/segmented";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SENSITIVITY: { value: MemorySensitivity; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "gentle", label: "Gentle" },
  { value: "protected", label: "Protected" },
];

// What returns → Resurfacing: how freely memories resurface, plus muted periods
// (date ranges that never resurface).
export default function Resurfacing() {
  const insets = useSafeAreaInsets();
  const [sensitivity, setSensitivity] = useState<MemorySensitivity>("open");
  const [mutes, setMutes] = useState<ResurfaceMute[]>([]);
  const [muteStart, setMuteStart] = useState("");
  const [muteEnd, setMuteEnd] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, m] = await Promise.all([
          getPreferences(),
          listMutes().catch(() => [] as ResurfaceMute[]),
        ]);
        if (cancelled) return;
        setSensitivity(p.memorySensitivity);
        setMutes(m);
      } catch {
        // defaults stand
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function setSens(v: MemorySensitivity) {
    const prev = sensitivity;
    setSensitivity(v);
    updatePreferences(v).catch(() => setSensitivity(prev));
  }

  async function onAddMute() {
    if (!ISO_DATE.test(muteStart) || !ISO_DATE.test(muteEnd)) {
      Alert.alert("Check the dates", "Use the format YYYY-MM-DD for both dates.");
      return;
    }
    if (muteStart > muteEnd) {
      Alert.alert("Check the dates", "The start date must be on or before the end date.");
      return;
    }
    try {
      const row = await addMute(muteStart, muteEnd);
      setMutes((list) => [row, ...list]);
      setMuteStart("");
      setMuteEnd("");
    } catch {
      Alert.alert("Couldn't mute that period", "Please try again in a moment.");
    }
  }

  function onRemoveMute(m: ResurfaceMute) {
    setMutes((list) => list.filter((x) => x.id !== m.id));
    void deleteMute(m.id).catch(() => setMutes((list) => [m, ...list]));
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: 14,
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 48,
      }}
    >
      <Text className="text-4xl text-deep-brown">What returns</Text>

      {loading ? (
        <View className="min-h-60 items-center justify-center">
          <ActivityIndicator color="#3A2F25" />
        </View>
      ) : (
        <>
          <View className="mt-8 rounded-3xl border border-border bg-surface p-5">
            <Text className="text-ink mb-1">How memories resurface</Text>
            <Text className="text-faint-ink text-sm mb-3 leading-relaxed">
              Open surfaces freely; Gentle is more careful; Protected never
              surfaces a page unbidden.
            </Text>
            <Segmented value={sensitivity} options={SENSITIVITY} onChange={setSens} />
          </View>

          <View className="mt-6 rounded-3xl border border-border bg-surface p-5">
            <Text className="text-ink mb-1">Muted periods</Text>
            <Text className="text-faint-ink text-sm mb-3 leading-relaxed">
              Pages from a muted stretch of time never resurface — gentle for a
              grief window or a hard year. Nothing is deleted.
            </Text>

            {mutes.length > 0 ? (
              <View className="gap-2 mb-3">
                {mutes.map((m) => (
                  <View
                    key={m.id}
                    className="flex-row items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5"
                  >
                    <Text className="text-ink" style={{ fontSize: 14 }}>
                      {m.startDate} → {m.endDate}
                    </Text>
                    <Pressable onPress={() => onRemoveMute(m)} hitSlop={8}>
                      <Text className="text-faint-ink" style={{ fontSize: 13 }}>
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            <View className="flex-row gap-2">
              <TextInput
                value={muteStart}
                onChangeText={setMuteStart}
                placeholder="Start (YYYY-MM-DD)"
                placeholderTextColor="#A59B8D"
                autoCapitalize="none"
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-ink"
                style={{ fontSize: 13 }}
              />
              <TextInput
                value={muteEnd}
                onChangeText={setMuteEnd}
                placeholder="End (YYYY-MM-DD)"
                placeholderTextColor="#A59B8D"
                autoCapitalize="none"
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-ink"
                style={{ fontSize: 13 }}
              />
            </View>
            <Pressable
              onPress={onAddMute}
              className="mt-2 items-center rounded-full border border-border bg-background py-2.5"
            >
              <Text className="text-soft-ink" style={{ fontSize: 13 }}>
                Mute this period
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
  );
}
