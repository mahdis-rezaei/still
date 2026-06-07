import { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEntry,
  listReflections,
  addReflection,
  longDate,
} from "../../../lib/entries";

// Read a page + its reflections (letters across time), and write a new one.
export default function EntryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");

  const entry = useQuery({
    queryKey: ["entry", id],
    queryFn: () => getEntry(id!),
    enabled: !!id,
  });
  const reflections = useQuery({
    queryKey: ["reflections", id],
    queryFn: () => listReflections(id!),
    enabled: !!id,
  });

  const add = useMutation({
    mutationFn: (body: string) => addReflection(id!, body),
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["reflections", id] });
    },
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 24,
          paddingBottom: 32,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} className="mb-4">
          <Text className="text-soft-ink">← Library</Text>
        </Pressable>

        {entry.isLoading ? (
          <ActivityIndicator color="#8A6F4D" />
        ) : !entry.data ? (
          <Text className="text-soft-ink">That page couldn't be found.</Text>
        ) : (
          <>
            <Text className="text-faint-ink text-xs uppercase tracking-widest">
              {longDate(entry.data.entryDate)}
            </Text>
            {!!entry.data.title && (
              <Text className="text-2xl text-deep-brown mt-2">
                {entry.data.title}
              </Text>
            )}
            <Text className="text-ink text-lg leading-relaxed mt-3 whitespace-pre-line">
              {entry.data.body}
            </Text>

            {/* reflections — letters across time */}
            <View className="mt-10 pt-6 border-t border-border/60">
              <Text className="text-deep-brown text-xl mb-3">Reflections</Text>
              {(reflections.data ?? []).map((r) => (
                <View key={r.id} className="mb-4">
                  <Text className="text-faint-ink text-xs">
                    {longDate(r.reflectionDate ?? r.createdAt)}
                  </Text>
                  <Text className="text-soft-ink leading-relaxed mt-1 whitespace-pre-line">
                    {r.body}
                  </Text>
                </View>
              ))}

              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Write to the person who wrote this…"
                placeholderTextColor="#A59B8D"
                multiline
                textAlignVertical="top"
                className="bg-surface border border-border rounded-xl p-3 mt-2 min-h-[90px] text-ink"
              />
              <Pressable
                onPress={() => draft.trim() && add.mutate(draft.trim())}
                disabled={!draft.trim() || add.isPending}
                className="self-start mt-3 rounded-full bg-deep-brown px-5 py-2 disabled:opacity-50"
              >
                <Text className="text-background text-sm">
                  {add.isPending ? "Saving…" : "Add reflection"}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
