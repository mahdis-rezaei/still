import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../lib/auth";
import { updateProfileName } from "../../../lib/settings";

// Account → Edit your profile: name (saved on blur), email, plan.
export default function Profile() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? "");

  function saveName() {
    const trimmed = name.trim();
    if (trimmed === (user?.name ?? "")) return;
    updateProfileName(trimmed).catch(() => {});
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
      <Text className="text-4xl text-deep-brown">Profile</Text>

      <View className="mt-8 rounded-3xl border border-border bg-surface p-5 gap-5">
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
      </View>
    </ScrollView>
  );
}
