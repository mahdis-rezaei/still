import { useEffect, useRef, useState } from "react";
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
import { bringPageBack, type MemoryRunResult } from "../../lib/memories";
import { MemoryCard } from "../../components/memory-card";
import { OnThisDay } from "../../components/on-this-day";

type Status = "idle" | "saving" | "saved";

// Real Today: a calm writing surface that autosaves (debounced), plus the engine
// — "Bring a page back" (a scoped two-pass read of your years) and the quiet
// "On this day" ladder. Mirrors the web. (Offline-draft cache + push nudges come
// later; push needs the backend device_tokens table + cron.)
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

  // The engine run (Bring a page back). A long archive is a two-pass model read
  // and can take a couple of minutes, so we show calm, time-aware reassurance
  // while pending — a silent wait reads as "broken."
  const [run, setRun] = useState<MemoryRunResult | null>(null);
  const [pending, setPending] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!pending) {
      setElapsed(0);
      return;
    }
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [pending]);

  async function onBringPageBack() {
    setRun(null);
    setPending(true);
    try {
      setRun(await bringPageBack());
    } catch {
      setRun({ surfaced: false, reason: "error" });
    } finally {
      setPending(false);
    }
  }

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
        <View className="flex-row items-end justify-between mb-8">
          <View>
            <Text className="text-4xl text-deep-brown">Today</Text>
            <Text className="text-soft-ink mt-1">{longDate(todayISO())}</Text>
          </View>
          <Pressable
            onPress={onBringPageBack}
            disabled={pending}
            className="rounded-full border border-border px-4 py-2 disabled:opacity-50"
          >
            <Text className="text-soft-ink text-sm">
              {pending ? "reading…" : "✦ Bring a page back"}
            </Text>
          </Pressable>
        </View>

        {/* While reading, calm time-aware reassurance so the long read never
            reads as a failure. */}
        {pending && (
          <View className="border border-border/70 rounded-2xl bg-surface/50 p-6 mb-8">
            <Text className="text-soft-ink leading-relaxed">
              {elapsed < 10
                ? "Reading through your pages…"
                : elapsed < 35
                  ? "Still reading, looking across the years…"
                  : elapsed < 90
                    ? "Your archive is large, so this takes a moment. Hang tight, Yadegar is still reading."
                    : "Almost there, a long archive takes a little longer to read."}
            </Text>
          </View>
        )}

        {/* A returned page (or honest silence), shown only after asking. */}
        {run && (
          <View className="mb-8">
            {run.surfaced && run.memory ? (
              <View className="gap-3">
                <MemoryCard memory={run.memory} />
                <Pressable onPress={() => setRun(null)} hitSlop={8}>
                  <Text className="text-faint-ink text-xs">close</Text>
                </Pressable>
              </View>
            ) : (
              <View className="border border-border/70 rounded-2xl bg-surface/50 p-6">
                <Text className="text-soft-ink leading-relaxed">
                  {run.reason === "crisis"
                    ? run.supportMessage
                    : run.reason === "quota"
                      ? "You've used this month's returns. Revisiting what's already returned to you is always free."
                      : run.reason === "not_enough"
                        ? "Write or bring in a few pages first, and Yadegar will have something to return."
                        : run.reason === "error"
                          ? "Something interrupted the reading. Try again in a moment."
                          : "Nothing honest surfaced this time. That's okay, Yadegar is better quiet than false."}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Date-based returns from this day in years past, quiet when empty. */}
        <OnThisDay />

        <TextInput
          value={text}
          onChangeText={onChange}
          placeholder="What wants to be written today?"
          placeholderTextColor="#A59B8D"
          multiline
          textAlignVertical="top"
          className="min-h-[280px] text-lg leading-relaxed text-ink"
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
