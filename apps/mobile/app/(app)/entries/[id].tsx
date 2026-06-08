import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../../lib/api";

type JournalEntry = {
  id: string;
  title?: string | null;
  body: string;
  entryDate: string | null;
  source: string;
  favorite?: boolean;
  createdAt: string;
  updatedAt: string;
};

type Reflection = {
  id: string;
  journalEntryId: string;
  body: string;
  reflectionDate: string;
  createdAt: string;
  updatedAt: string;
};

type SaveStatus = "loading" | "saved" | "draft" | "saving" | "offline" | "error";

function formatEntryDate(value: string | null): string {
  if (!value) return "Undated";

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function statusLabel(status: SaveStatus): string {
  switch (status) {
    case "loading":
      return "Loading…";
    case "draft":
      return "Draft";
    case "saving":
      return "Saving…";
    case "offline":
      return "Offline draft";
    case "error":
      return "Could not save";
    default:
      return "Saved";
  }
}

export default function EntryDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const id = useMemo(() => {
    const value = params.id;
    return Array.isArray(value) ? value[0] : value;
  }, [params.id]);

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [body, setBody] = useState("");
  const [lastSavedBody, setLastSavedBody] = useState("");
  const [status, setStatus] = useState<SaveStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [reflectionText, setReflectionText] = useState("");
  const [reflectionBusy, setReflectionBusy] = useState(false);
  const [reflectionError, setReflectionError] = useState<string | null>(null);

  const loadedRef = useRef(false);
  const latestBodyRef = useRef("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSequenceRef = useRef(0);

  useEffect(() => {
    latestBodyRef.current = body;
  }, [body]);

  const loadReflections = useCallback(async () => {
    if (!id) return;
    const rows = await api<Reflection[]>(`/entries/${id}/reflections`);
    setReflections(rows);
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) {
        setError("Entry not found.");
        setStatus("error");
        return;
      }

      loadedRef.current = false;
      setStatus("loading");
      setError(null);
      setReflectionError(null);

      try {
        const [row, reflectionRows] = await Promise.all([
          api<JournalEntry>(`/entries/${id}`),
          api<Reflection[]>(`/entries/${id}/reflections`),
        ]);

        if (cancelled) return;

        setEntry(row);
        setBody(row.body);
        setLastSavedBody(row.body);
        latestBodyRef.current = row.body;
        setReflections(reflectionRows);
        setStatus("saved");
      } catch {
        if (cancelled) return;
        setError("Could not load this page.");
        setStatus("error");
      } finally {
        loadedRef.current = true;
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [id]);

  const saveBody = useCallback(
    async (nextBody: string) => {
      if (!id || !nextBody.trim()) {
        setStatus("draft");
        return;
      }

      const sequence = saveSequenceRef.current + 1;
      saveSequenceRef.current = sequence;
      setStatus("saving");

      try {
        const saved = await api<JournalEntry>(`/entries/${id}`, {
          method: "PATCH",
          body: { body: nextBody },
        });

        if (saveSequenceRef.current !== sequence) return;

        setEntry(saved);
        setLastSavedBody(saved.body);
        setStatus(latestBodyRef.current === saved.body ? "saved" : "draft");
      } catch {
        if (saveSequenceRef.current !== sequence) return;
        setStatus("offline");
      }
    },
    [id],
  );

  useEffect(() => {
    if (!loadedRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    if (body === lastSavedBody) {
      setStatus(body.trim() ? "saved" : "draft");
      return;
    }

    if (!body.trim()) {
      setStatus("draft");
      return;
    }

    setStatus("draft");

    saveTimerRef.current = setTimeout(() => {
      void saveBody(body);
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [body, lastSavedBody, saveBody]);

  async function submitReflection() {
    if (!id || reflectionBusy) return;

    const trimmed = reflectionText.trim();
    if (!trimmed) return;

    setReflectionBusy(true);
    setReflectionError(null);

    try {
      const created = await api<Reflection>(`/entries/${id}/reflections`, {
        method: "POST",
        body: { body: trimmed },
      });

      setReflections((current) => [...current, created]);
      setReflectionText("");
    } catch {
      setReflectionError("Could not save this reflection. Please try again.");
    } finally {
      setReflectionBusy(false);
    }
  }

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
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()}>
            <Text className="text-soft-ink">Back</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(app)/today")}
            className="rounded-full border border-border bg-surface px-4 py-2"
          >
            <Text className="text-soft-ink">Today</Text>
          </Pressable>
        </View>

        {status === "loading" ? (
          <View className="min-h-80 items-center justify-center">
            <ActivityIndicator color="#3A2F25" />
          </View>
        ) : error ? (
          <View className="mt-10 rounded-3xl border border-border bg-surface p-5">
            <Text className="text-ink">{error}</Text>
            <Pressable onPress={() => router.back()} className="mt-4">
              <Text className="text-deep-brown">Return to Library</Text>
            </Pressable>
          </View>
        ) : entry ? (
          <>
            <View className="mt-10 flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-4xl text-deep-brown">
                  {entry.title || "Page"}
                </Text>
                <Text className="mt-2 text-soft-ink">
                  {formatEntryDate(entry.entryDate)}
                </Text>
              </View>

              <View className="rounded-full border border-border bg-surface px-3 py-1.5">
                <Text className="text-xs text-soft-ink">
                  {statusLabel(status)}
                </Text>
              </View>
            </View>

            <View className="mt-8 rounded-3xl border border-border bg-surface px-5 py-4">
              <TextInput
                value={body}
                onChangeText={setBody}
                multiline
                textAlignVertical="top"
                placeholder="Write more…"
                placeholderTextColor="#A59B8D"
                className="min-h-80 text-lg leading-7 text-ink"
                autoCorrect
                scrollEnabled={false}
              />
            </View>

            <View className="mt-4 flex-row items-center justify-between">
              <Text className="text-faint-ink text-sm">
                Edits autosave after you pause.
              </Text>

              <Pressable
                onPress={() => void saveBody(body)}
                disabled={status === "saving" || body === lastSavedBody || !body.trim()}
              >
                <Text className="text-soft-ink">
                  {status === "saving" ? "Saving…" : "Save now"}
                </Text>
              </Pressable>
            </View>

            <View className="mt-12">
              <Text className="text-3xl text-deep-brown">Reflections</Text>
              <Text className="mt-2 text-soft-ink leading-relaxed">
                Add a note to this page without changing the original writing.
              </Text>

              <View className="mt-5 gap-4">
                {reflections.length === 0 ? (
                  <View className="rounded-3xl border border-border bg-surface p-5">
                    <Text className="text-soft-ink">
                      No reflections yet.
                    </Text>
                  </View>
                ) : (
                  reflections.map((reflection) => (
                    <View
                      key={reflection.id}
                      className="rounded-3xl border border-border bg-surface p-5"
                    >
                      <Text className="text-sm text-soft-ink">
                        {formatShortDate(reflection.reflectionDate)}
                      </Text>
                      <Text className="mt-3 text-base leading-7 text-ink">
                        {reflection.body}
                      </Text>
                    </View>
                  ))
                )}
              </View>

              <View className="mt-6 rounded-full border border-border bg-surface px-4 py-3">
                <View className="flex-row items-center gap-3">
                  <TextInput
                    value={reflectionText}
                    onChangeText={setReflectionText}
                    placeholder="Write a reflection…"
                    placeholderTextColor="#A59B8D"
                    className="flex-1 text-base text-ink"
                    autoCorrect
                    returnKeyType="done"
                    onSubmitEditing={submitReflection}
                  />

                  <Pressable
                    onPress={submitReflection}
                    disabled={reflectionBusy || !reflectionText.trim()}
                    className="rounded-full bg-deep-brown px-4 py-2 disabled:opacity-50"
                  >
                    {reflectionBusy ? (
                      <ActivityIndicator color="#F7F1E6" />
                    ) : (
                      <Text className="text-sm text-background">Add</Text>
                    )}
                  </Pressable>
                </View>
              </View>

              {reflectionError ? (
                <Text className="mt-3 text-sm text-accent-sepia">
                  {reflectionError}
                </Text>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
