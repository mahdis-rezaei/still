import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth";
import {
  getNotifications,
  getPreferences,
  updateNotifications,
  updatePreferences,
  updateProfileName,
  deleteAccount,
  exportText,
  type NudgeFreq,
  type MemorySensitivity,
} from "../../lib/settings";

// A single sectioned Settings screen: Profile · Notifications · Resurfacing ·
// Privacy (export + delete) · Sign out. One screen (no sub-routes) keeps mobile
// navigation simple. All on existing backend endpoints.

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-8">
      <Text className="text-xs uppercase tracking-widest text-faint-ink mb-3">
        {title}
      </Text>
      <View className="rounded-3xl border border-border bg-surface p-5 gap-5">
        {children}
      </View>
    </View>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row gap-2">
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            className={
              "flex-1 items-center rounded-full border px-3 py-2 " +
              (sel
                ? "bg-deep-brown border-deep-brown"
                : "bg-surface border-border")
            }
          >
            <Text
              style={{ fontSize: 13 }}
              className={sel ? "text-background" : "text-soft-ink"}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const FREQ: { value: NudgeFreq; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const SENSITIVITY: { value: MemorySensitivity; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "gentle", label: "Gentle" },
  { value: "protected", label: "Protected" },
];

export default function Settings() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [writing, setWriting] = useState<NudgeFreq>("off");
  const [memory, setMemory] = useState<NudgeFreq>("off");
  const [sensitivity, setSensitivity] = useState<MemorySensitivity>("open");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [n, p] = await Promise.all([getNotifications(), getPreferences()]);
        if (cancelled) return;
        setWriting(n.writingFrequency);
        setMemory(n.memoryFrequency);
        setSensitivity(p.memorySensitivity);
      } catch {
        // leave defaults; the controls still work and persist on change
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Optimistic setters: update UI now, persist; revert on failure.
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
  function setSens(v: MemorySensitivity) {
    const prev = sensitivity;
    setSensitivity(v);
    updatePreferences(v).catch(() => setSensitivity(prev));
  }

  function saveName() {
    const trimmed = name.trim();
    if (trimmed === (user?.name ?? "")) return;
    updateProfileName(trimmed).catch(() => {});
  }

  async function onExport() {
    setBusy(true);
    try {
      const text = await exportText();
      await Share.share({ message: text });
    } catch {
      Alert.alert("Export failed", "Couldn't prepare your export. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  function onDelete() {
    Alert.alert(
      "Delete account?",
      "This permanently erases all your pages, reflections, and returns. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await deleteAccount();
              await signOut();
            } catch {
              setBusy(false);
              Alert.alert("Couldn't delete", "Something went wrong. Please try again.");
            }
          },
        },
      ],
    );
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
      <Text className="text-4xl text-deep-brown">Settings</Text>

      {loading ? (
        <View className="min-h-80 items-center justify-center">
          <ActivityIndicator color="#3A2F25" />
        </View>
      ) : (
        <>
          <Section title="Profile">
            <View>
              <Text className="text-soft-ink mb-2">Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                onEndEditing={saveName}
                placeholder="Your name"
                placeholderTextColor="#A59B8D"
                className="rounded-xl border border-border bg-background px-4 py-3 text-ink"
              />
            </View>
            <View>
              <Text className="text-soft-ink">Email</Text>
              <Text className="text-ink mt-1">{user?.email}</Text>
            </View>
            <View>
              <Text className="text-soft-ink">Plan</Text>
              <Text className="text-ink mt-1">
                {user?.plan === "member" ? "Member" : "Free"}
              </Text>
            </View>
          </Section>

          <Section title="Notifications">
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
          </Section>

          <Section title="Resurfacing">
            <View>
              <Text className="text-ink mb-1">How memories resurface</Text>
              <Text className="text-faint-ink text-sm mb-3 leading-relaxed">
                Open surfaces freely; Gentle is more careful; Protected never
                surfaces a page unbidden.
              </Text>
              <Segmented
                value={sensitivity}
                options={SENSITIVITY}
                onChange={setSens}
              />
            </View>
          </Section>

          <Section title="Privacy">
            <Pressable onPress={onExport} disabled={busy}>
              <Text className="text-deep-brown">Export my data</Text>
              <Text className="text-faint-ink text-sm mt-1 leading-relaxed">
                A readable copy of everything you've written.
              </Text>
            </Pressable>
            <View className="h-px bg-border" />
            <Pressable onPress={onDelete} disabled={busy}>
              <Text style={{ color: "#B4453A" }}>Delete account</Text>
              <Text className="text-faint-ink text-sm mt-1 leading-relaxed">
                Permanently erase your account and everything in it.
              </Text>
            </Pressable>
          </Section>

          <Pressable
            onPress={signOut}
            className="mt-8 items-center rounded-full border border-border bg-surface py-4"
          >
            <Text className="text-soft-ink">Sign out</Text>
          </Pressable>

          {busy && (
            <View className="mt-6 items-center">
              <ActivityIndicator color="#3A2F25" />
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
