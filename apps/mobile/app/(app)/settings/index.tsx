import { Pressable, ScrollView, View } from "react-native";
import { Text } from "../../../components/text";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../lib/auth";

// Settings hub — mirrors the web: section cards (Account · Membership · Nudges ·
// What returns · Your data · Help) that open sub-pages, then Sign out.

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-xs uppercase tracking-widest text-faint-ink mb-3">
      {children}
    </Text>
  );
}

function NavCard({
  onPress,
  children,
}: {
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl border border-border bg-surface p-5"
    >
      {children}
    </Pressable>
  );
}

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingTop: 14,
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 48,
      }}
    >
      <Text className="text-4xl text-deep-brown">Settings</Text>

      <View className="mt-8">
        <SectionLabel>Account</SectionLabel>
        <NavCard onPress={() => router.push("/(app)/settings/profile")}>
          {user?.name ? <Text className="text-lg text-ink">{user.name}</Text> : null}
          <Text className="text-soft-ink">{user?.email}</Text>
          <Text className="text-soft-ink mt-2" style={{ fontSize: 13 }}>
            Edit your profile →
          </Text>
        </NavCard>
      </View>

      <View className="mt-8">
        <SectionLabel>Membership</SectionLabel>
        <NavCard onPress={() => router.push("/(app)/membership")}>
          {user?.plan === "member" ? (
            <>
              <Text className="text-lg text-ink">Member</Text>
              <Text className="text-soft-ink text-sm mt-1 leading-relaxed">
                Unlimited fresh returns across your years. Manage membership →
              </Text>
            </>
          ) : (
            <>
              <Text className="text-lg text-ink">Your journal, free</Text>
              <Text className="text-soft-ink text-sm mt-1 leading-relaxed">
                Writing, keeping, importing, and revisiting the pages that return
                to you are always free and unlimited.
              </Text>
              {user?.usage && user.usage.limit != null ? (
                <Text className="text-faint-ink text-sm mt-3">
                  Fresh returns this month: {user.usage.used} of about{" "}
                  {user.usage.limit}.
                </Text>
              ) : null}
              <Text className="text-soft-ink mt-3" style={{ fontSize: 13 }}>
                See membership →
              </Text>
            </>
          )}
        </NavCard>
      </View>

      <View className="mt-8">
        <SectionLabel>Nudges</SectionLabel>
        <NavCard onPress={() => router.push("/(app)/settings/reminders")}>
          <Text className="text-lg text-ink">Reminders</Text>
          <Text className="text-soft-ink text-sm mt-1 leading-relaxed">
            A gentle nudge to write, or a page brought back — your cadence, off by
            default.
          </Text>
        </NavCard>
      </View>

      <View className="mt-8">
        <SectionLabel>What returns</SectionLabel>
        <NavCard onPress={() => router.push("/(app)/settings/resurfacing")}>
          <Text className="text-lg text-ink">Muted periods</Text>
          <Text className="text-soft-ink text-sm mt-1 leading-relaxed">
            Fence off a season you'd rather not have return, without deleting a
            thing.
          </Text>
        </NavCard>
      </View>

      <View className="mt-8">
        <SectionLabel>Your data</SectionLabel>
        <NavCard onPress={() => router.push("/(app)/settings/privacy")}>
          <Text className="text-lg text-ink">Privacy & your pages</Text>
          <Text className="text-soft-ink text-sm mt-1 leading-relaxed">
            Export everything, or delete your account, anytime.
          </Text>
        </NavCard>
        <Text className="text-faint-ink text-sm mt-3 leading-relaxed">
          Your pages are private. Yadegar never shares your journals — they're
          encrypted at rest, and yours to export or delete whenever you like.
        </Text>
        <Pressable
          onPress={() => router.push("/(app)/philosophy")}
          className="mt-3 self-start"
        >
          <Text className="text-soft-ink" style={{ fontSize: 13 }}>
            The Yadegar philosophy →
          </Text>
        </Pressable>
      </View>

      <View className="mt-8">
        <SectionLabel>Help</SectionLabel>
        <NavCard onPress={() => router.push("/(app)/help")}>
          <Text className="text-lg text-ink">Help & FAQ</Text>
          <Text className="text-soft-ink text-sm mt-1 leading-relaxed">
            Answers to common questions about every part of Yadegar.
          </Text>
        </NavCard>
      </View>

      <Pressable onPress={signOut} className="mt-10 self-start">
        <Text className="text-soft-ink">Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
