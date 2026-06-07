import { View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth";

// The first signed-in screen. Phase 1 turns this into the real Today (write +
// autosave) and adds Bring a page back / On this day.
export default function Today() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 24, paddingBottom: 48 }}
    >
      <Text className="text-4xl text-deep-brown">Today</Text>
      <Text className="text-soft-ink mt-1">{today}</Text>

      <Text className="text-ink text-lg mt-10 leading-relaxed">
        {user?.name ? `Hello, ${user.name}.` : "Hello."} This is the start of the
        Yadegar app — your journal, in your pocket.
      </Text>

      <Text className="text-faint-ink mt-4 leading-relaxed">
        Writing, On this day, and Bring a page back arrive next. For now, you're
        signed in{user?.plan ? ` on the ${user.plan} plan` : ""}.
      </Text>

      <Pressable onPress={signOut} className="mt-12">
        <Text className="text-soft-ink">Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
