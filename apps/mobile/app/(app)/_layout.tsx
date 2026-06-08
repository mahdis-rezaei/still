import { Tabs } from "expo-router";
import { TabBar } from "../../components/tab-bar";

// The signed-in tab bar: Today (write) · Library (read) · Returns (the engine's
// archive) · Look back (browse your pages by date). entries/[id] is a hidden
// stack route (pushed from a list), not a tab.
//
// We render a CUSTOM tab bar (components/tab-bar) instead of the default one: it's
// safe-area-aware (labels never clip into the home indicator), text-only with no
// stray icon placeholders, and brand-matched. Dependency-free (no icon font), so
// it works on the current dev build.
export default function AppLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="today" options={{ title: "Today" }} />
      <Tabs.Screen name="library" options={{ title: "Library" }} />
      <Tabs.Screen name="returns" options={{ title: "Returns" }} />
      <Tabs.Screen name="look-back" options={{ title: "Look back" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      {/* Hidden routes, pushed from a list / a browse link (not tabs). */}
      <Tabs.Screen name="entries/[id]" options={{ href: null }} />
      <Tabs.Screen name="calendar" options={{ href: null }} />
      <Tabs.Screen name="collections" options={{ href: null }} />
      <Tabs.Screen name="collection/[id]" options={{ href: null }} />
      <Tabs.Screen name="shelf" options={{ href: null }} />
      <Tabs.Screen name="capsules" options={{ href: null }} />
      <Tabs.Screen name="year" options={{ href: null }} />
    </Tabs>
  );
}
