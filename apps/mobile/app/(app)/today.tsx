import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";

type JournalEntry = {
  id: string;
  body: string;
  entryDate: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
};

type DraftEnvelope = {
  body: string;
  updatedAt: string;
};

type SaveStatus =
  | "loading"
  | "idle"
  | "draft"
  | "saving"
  | "saved"
  | "offline"
  | "error";

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function friendlyDate(date = new Date()): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

async function readDraft(key: string): Promise<DraftEnvelope | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<DraftEnvelope>;
    if (typeof parsed.body === "string" && typeof parsed.updatedAt === "string") {
      return { body: parsed.body, updatedAt: parsed.updatedAt };
    }
  } catch {
    // Older/dev drafts may be plain strings.
    return { body: raw, updatedAt: new Date(0).toISOString() };
  }

  return null;
}

async function writeDraft(key: string, body: string): Promise<void> {
  await AsyncStorage.setItem(
    key,
    JSON.stringify({
      body,
      updatedAt: new Date().toISOString(),
    } satisfies DraftEnvelope),
  );
}

function statusLabel(status: SaveStatus): string {
  switch (status) {
    case "loading":
      return "Loading…";
    case "draft":
      return "Draft saved on this phone";
    case "saving":
      return "Saving…";
    case "saved":
      return "Saved";
    case "offline":
      return "Offline draft";
    case "error":
      return "Could not save";
    default:
      return "Start writing";
  }
}

export default function Today() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const entryDate = useMemo(() => localDateKey(), []);
  const today = useMemo(() => friendlyDate(), []);
  const draftKey = useMemo(
    () => `yadegar.today.${user?.email ?? "unknown"}.${entryDate}`,
    [entryDate, user?.email],
  );

  const [entryId, setEntryId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [lastSavedBody, setLastSavedBody] = useState("");
  const [status, setStatus] = useState<SaveStatus>("loading");

  const loadedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSequenceRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function loadToday() {
      loadedRef.current = false;
      setStatus("loading");

      const [year, month] = entryDate.split("-");

      try {
        const [draft, entries] = await Promise.all([
          readDraft(draftKey),
          api<JournalEntry[]>(`/entries?year=${year}&month=${Number(month)}`),
        ]);

        if (cancelled) return;

        const todayEntry =
          entries.find(
            (entry) => entry.entryDate === entryDate && entry.source === "manual",
          ) ?? null;

        const serverBody = todayEntry?.body ?? "";
        const serverUpdatedAt = todayEntry?.updatedAt ?? new Date(0).toISOString();

        const draftIsNewer =
          draft &&
          draft.body !== serverBody &&
          new Date(draft.updatedAt).getTime() > new Date(serverUpdatedAt).getTime();

        setEntryId(todayEntry?.id ?? null);
        setLastSavedBody(serverBody);
        setBody(draftIsNewer ? draft.body : serverBody);

        if (draftIsNewer) setStatus("offline");
        else setStatus(serverBody.trim() ? "saved" : "idle");
      } catch {
        const draft = await readDraft(draftKey);
        if (cancelled) return;

        setBody(draft?.body ?? "");
        setLastSavedBody("");
        setStatus(draft?.body ? "offline" : "idle");
      } finally {
        loadedRef.current = true;
      }
    }

    void loadToday();

    return () => {
      cancelled = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [draftKey, entryDate]);

  useEffect(() => {
    if (!loadedRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    void writeDraft(draftKey, body);

    if (body === lastSavedBody) {
      setStatus(body.trim() ? "saved" : "idle");
      return;
    }

    if (!body.trim()) {
      setStatus("draft");
      return;
    }

    setStatus("draft");

    saveTimerRef.current = setTimeout(() => {
      const sequence = saveSequenceRef.current + 1;
      saveSequenceRef.current = sequence;

      async function save() {
        setStatus("saving");

        try {
          const saved = entryId
            ? await api<JournalEntry>(`/entries/${entryId}`, {
                method: "PATCH",
                body: { body, entryDate },
              })
            : await api<JournalEntry>("/entries", {
                method: "POST",
                body: { body, entryDate },
              });

          if (saveSequenceRef.current !== sequence) return;

          setEntryId(saved.id);
          setLastSavedBody(saved.body);
          await writeDraft(draftKey, saved.body);
          setStatus("saved");
        } catch {
          if (saveSequenceRef.current !== sequence) return;
          setStatus("offline");
        }
      }

      void save();
    }, 1200);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [body, draftKey, entryDate, entryId, lastSavedBody]);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 48,
        }}
      >
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="text-4xl text-deep-brown">Today</Text>
            <Text className="text-soft-ink mt-1">{today}</Text>
          </View>

          <View className="rounded-full border border-border bg-surface px-3 py-1.5">
            <Text className="text-xs text-soft-ink">{statusLabel(status)}</Text>
          </View>
        </View>

        <Text className="text-ink text-lg mt-10 leading-relaxed">
          {user?.name ? `Hello, ${user.name}.` : "Hello."} What do you want to
          remember about today?
        </Text>

        <View className="mt-6 rounded-3xl border border-border bg-surface px-5 py-4">
          {status === "loading" ? (
            <View className="min-h-80 items-center justify-center">
              <ActivityIndicator color="#3A2F25" />
            </View>
          ) : (
            <TextInput
              value={body}
              onChangeText={setBody}
              multiline
              textAlignVertical="top"
              placeholder="Start with one sentence…"
              placeholderTextColor="#A59B8D"
              className="min-h-80 text-lg leading-7 text-ink"
              autoCorrect
              scrollEnabled={false}
            />
          )}
        </View>

        <Text className="text-faint-ink text-sm mt-4 leading-relaxed">
          Your words save privately to this phone first, then sync to Yadegar when
          the connection is available.
        </Text>

        <Pressable onPress={signOut} className="mt-12">
          <Text className="text-soft-ink">Sign out</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
