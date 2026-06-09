import { ScrollView, View } from "react-native";
import { Text } from "../../components/text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth";

// Membership. Intentionally price-free with no external checkout link: App Store
// rules require digital subscriptions to go through in-app purchase, which lands
// with the RevenueCat work. This screen explains the value; the Subscribe button
// arrives with IAP.
function Bullet({ children }: { children: string }) {
  return (
    <View className="flex-row gap-2">
      <Text className="text-faint-ink">·</Text>
      <Text className="flex-1 text-soft-ink leading-relaxed">{children}</Text>
    </View>
  );
}

export default function Membership() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isMember = user?.plan === "member";

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: 16,
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 48,
      }}
    >
      <Text className="text-4xl text-deep-brown leading-tight">
        {isMember ? "You're a member." : "Free to keep. Yours to deepen."}
      </Text>
      <Text className="text-soft-ink mt-3 leading-relaxed">
        Your journal is always free: write, keep, import, export, and revisit the
        pages that return to you, without limit. Membership lifts the cap on new
        returns — Yadegar reading across your years, whenever you like.
      </Text>

      <View className="mt-8 rounded-3xl border border-border bg-surface p-5">
        <Text className="text-xs uppercase tracking-widest text-faint-ink mb-3">
          Your journal · Free
        </Text>
        <View className="gap-2.5">
          <Bullet>Unlimited writing, keeping & importing</Bullet>
          <Bullet>Your whole archive, private & encrypted</Bullet>
          <Bullet>Export everything, anytime</Bullet>
          <Bullet>A few fresh returns a month</Bullet>
          <Bullet>Revisit anything that's returned, always free</Bullet>
        </View>
      </View>

      <View className="mt-5 rounded-3xl border border-accent-sepia/30 bg-surface p-5">
        <Text className="text-xs uppercase tracking-widest text-faint-ink mb-3">
          Membership
        </Text>
        <View className="gap-2.5">
          <Bullet>Unlimited fresh returns across your years</Bullet>
          <Bullet>Read across all your time, whenever you like</Bullet>
        </View>
        {user?.usage && user.usage.limit != null ? (
          <Text className="text-faint-ink text-sm mt-4">
            Fresh returns this month: {user.usage.used} of about {user.usage.limit}.
          </Text>
        ) : null}
      </View>

      <Text className="text-faint-ink text-sm mt-6 leading-relaxed">
        We gate the AI, never your journal. Your words are always yours to write,
        keep, and take with you.
      </Text>

      {!isMember ? (
        <Text className="text-soft-ink text-sm mt-6 leading-relaxed">
          Membership is coming to the app soon. Until then, everything that
          matters — your writing, your archive, and revisiting what's returned —
          stays free and unlimited.
        </Text>
      ) : null}
    </ScrollView>
  );
}
