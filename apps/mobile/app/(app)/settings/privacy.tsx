import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../lib/auth";
import { exportText, deleteAccount } from "../../../lib/settings";

// Your data → Privacy & your pages: export everything, or delete the account.
export default function Privacy() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);

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
      <Text className="text-4xl text-deep-brown">Privacy & your pages</Text>
      <Text className="text-soft-ink mt-1 leading-relaxed">
        Your pages are private, encrypted at rest, and yours to export or delete
        whenever you like.
      </Text>

      <View className="mt-8 rounded-3xl border border-border bg-surface p-5 gap-5">
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
      </View>

      {busy ? (
        <View className="mt-6 items-center">
          <ActivityIndicator color="#3A2F25" />
        </View>
      ) : null}
    </ScrollView>
  );
}
