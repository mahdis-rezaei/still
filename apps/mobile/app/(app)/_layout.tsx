import { Tabs } from "expo-router";
import { TabBar } from "../../components/tab-bar";

// Navigation mirrors the web: primary destinations are Today · Look back ·
// Explore (the bottom tabs), and the full menu — Explore's sub-sections, Returns,
// Shop, and account — lives in the ☰ AppHeader on each screen. Everything else is
// a hidden route reached from the menu, the Explore hub, or a list.
export default function AppLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="today" options={{ title: "Today" }} />
      <Tabs.Screen name="look-back" options={{ title: "Look back" }} />
      <Tabs.Screen name="explore" options={{ title: "Explore" }} />
      {/* Hidden routes — reached via the ☰ menu, the Explore hub, or a list. */}
      <Tabs.Screen name="library" options={{ href: null }} />
      <Tabs.Screen name="returns" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="calendar" options={{ href: null }} />
      <Tabs.Screen name="collections" options={{ href: null }} />
      <Tabs.Screen name="collection/[id]" options={{ href: null }} />
      <Tabs.Screen name="shelf" options={{ href: null }} />
      <Tabs.Screen name="capsules" options={{ href: null }} />
      <Tabs.Screen name="year" options={{ href: null }} />
      <Tabs.Screen name="import" options={{ href: null }} />
      <Tabs.Screen name="entries/[id]" options={{ href: null }} />
    </Tabs>
  );
}
