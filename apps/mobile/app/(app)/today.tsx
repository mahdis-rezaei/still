import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { createEntry, updateEntry, todayISO, longDate } from "../../lib/entries";

type Status = "idle" | "saving" | "saved";

// Real Today: a calm writing surface that autosaves (debounced), with a deliberate
// "Keep this page" to start a fresh one. Mirrors the web. (Offline-draft cache and
// Bring-a-page-back come in the next steps.)
export default function Today() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [keptToday, setKeptToday] = useState(0);

  const entryIdRef = useRef<string | null>(null);
  const latest = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);

  async function flush() {
    const body = latest.current;
    if (!body.trim() || saving.current) return;
    saving.current = true;
    setStatus("saving");
    try {
      if (!entryIdRef.current) {
        const row = await createEntry({ body, entryDate: todayISO() });
        entryIdRef.current = row.id;
      } else {
        await updateEntry(entryIdRef.current, { body });
      }
      setStatus("saved");
      qc.invalidateQueries({ queryKey: ["entries"] });
    } catch {
      setStatus("idle");
    } finally {
      saving.current = false;
    }
  }

  function onChange(t: string) {
    setText(t);
    latest.current = t;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 900);
  }

  async function keep() {
    if (timer.current) clearTimeout(timer.current);
    await flush();
    if (latest.current.trim()) setKeptToday((n) => n + 1);
    setText("");
    latest.current = "";
    entryIdRef.current = null;
    setStatus("idle");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 24,
          paddingBottom: 32,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-4xl text-deep-brown">Today</Text>
        <Text className="text-soft-ink mt-1">{longDate(todayISO())}</Text>

        <TextInput
          value={text}
          onChangeText={onChange}
          placeholder="What wants to be written today?"
          placeholderTextColor="#A59B8D"
          multiline
          textAlignVertical="top"
          className="mt-8 min-h-[280px] text-lg leading-relaxed text-ink"
        />
      </ScrollView>

      <View
        style={{ paddingBottom: insets.bottom + 8 }}
        className="px-6 pt-2 flex-row items-center justify-between"
      >
        <Text className="text-faint-ink text-sm">
          {status === "saving"
            ? "saving…"
            : status === "saved"
              ? "saved"
              : keptToday > 0
                ? `${keptToday} kept today`
                : ""}
        </Text>
        {!!text.trim() && (
          <Pressable
            onPress={keep}
            className="rounded-full border border-border px-5 py-2"
          >
            <Text className="text-soft-ink">Keep this page →</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
