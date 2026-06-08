import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { API_ORIGIN, getToken } from "../lib/api";
import {
  listAttachments,
  pickImage,
  uploadAttachment,
  deleteAttachment,
  type Attachment,
} from "../lib/photos";

// A photos strip for a saved page: tap to add (library or camera), long-press a
// thumbnail to remove. Image bytes are auth'd, so each <Image> carries the token.
export function EntryPhotos({ entryId }: { entryId: string }) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, rows] = await Promise.all([getToken(), listAttachments(entryId)]);
      setToken(t);
      setItems(rows);
    } catch {
      // leave as-is
    }
  }, [entryId]);

  useEffect(() => {
    void load();
  }, [load]);

  function source(id: string) {
    return {
      uri: `${API_ORIGIN}/api/attachments/${id}`,
      headers: {
        "X-Yadegar-Client": "mobile",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    };
  }

  async function add(from: "library" | "camera") {
    setBusy(true);
    try {
      const picked = await pickImage(from);
      if (picked) {
        const row = await uploadAttachment(
          entryId,
          picked.uri,
          picked.width,
          picked.height,
        );
        if (row) setItems((list) => [...list, row]);
        else Alert.alert("Couldn't add the photo", "Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  function onAdd() {
    Alert.alert("Add a photo", undefined, [
      { text: "Photo Library", onPress: () => void add("library") },
      { text: "Take Photo", onPress: () => void add("camera") },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function onRemove(a: Attachment) {
    Alert.alert("Remove this photo?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setItems((list) => list.filter((x) => x.id !== a.id));
          void deleteAttachment(a.id).catch(() => void load());
        },
      },
    ]);
  }

  return (
    <View className="mt-6">
      <View className="flex-row flex-wrap gap-3">
        {items.map((a) => (
          <Pressable key={a.id} onLongPress={() => onRemove(a)}>
            <Image
              source={source(a.id)}
              style={{ width: 96, height: 96, borderRadius: 14 }}
            />
          </Pressable>
        ))}
        <Pressable
          onPress={onAdd}
          disabled={busy}
          className="h-24 w-24 items-center justify-center rounded-2xl border border-border bg-surface"
        >
          {busy ? (
            <ActivityIndicator color="#3A2F25" />
          ) : (
            <Text className="text-soft-ink text-2xl">＋</Text>
          )}
        </Pressable>
      </View>
      {items.length > 0 ? (
        <Text className="text-faint-ink text-xs mt-2">
          Long-press a photo to remove it.
        </Text>
      ) : null}
    </View>
  );
}
