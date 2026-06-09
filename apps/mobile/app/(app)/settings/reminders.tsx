import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getNotifications,
  updateNotifications,
  type NudgeFreq,
} from "../../../lib/settings";
import { Segmented } from "../../../components/segmented";

// Nudges → Reminders: cadence for the write nudge and the page-brought-back
// nudge. Off by default; optimistic save.
const FREQ: { value: NudgeFreq; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export default function Reminders() {
  const insets = useSafeAreaInsets();
  const [writing, setWriting] = useState<NudgeFreq>("off");
  const [memory, setMemory] = useState<NudgeFreq>("off");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const n = await getNotifications();
        if (cancelled) return;
        setWriting(n.writingFrequency);
        setMemory(n.memoryFrequency);
      } catch {
        // defaults stand; controls still persist on change
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function setWritingFreq(v: NudgeFreq) {
    const prev = writing;
    setWriting(v);
    updateNotifications({ writingFrequency: v }).catch(() => setWriting(prev));
  }
  function setMemoryFreq(v: NudgeFreq) {
    const prev = memory;
    setMemory(v);
    updateNotifications({ memoryFrequency: v }).catch(() => setMemory(prev));
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: 14,
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 48,
      }}
    >
      <Text className="text-4xl text-deep-brown">Reminders</Text>
      <Text className="text-soft-ink mt-1 leading-relaxed">
        A gentle nudge to write, or a page brought back. Off by default.
      </Text>

      {loading ? (
        <View className="min-h-60 items-center justify-center">
          <ActivityIndicator color="#3A2F25" />
        </View>
      ) : (
        <View className="mt-8 rounded-3xl border border-border bg-surface p-5 gap-6">
          <View>
            <Text className="text-ink mb-1">A reminder to write</Text>
            <Text className="text-faint-ink text-sm mb-3 leading-relaxed">
              A gentle nudge to put something down.
            </Text>
            <Segmented value={writing} options={FREQ} onChange={setWritingFreq} />
          </View>
          <View>
            <Text className="text-ink mb-1">A page brought back</Text>
            <Text className="text-faint-ink text-sm mb-3 leading-relaxed">
              When something honest surfaces, Yadegar can let you know.
            </Text>
            <Segmented value={memory} options={FREQ} onChange={setMemoryFreq} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}
