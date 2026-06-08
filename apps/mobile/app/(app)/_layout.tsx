import { Tabs } from "expo-router";

// The signed-in tab bar: Today (write) · Library (read) · Returns (the engine's
// archive) · Look back (browse your pages by date). entries/[id] is a hidden
// stack route (pushed from a list), not a tab.
//
// Label-only (no icon library) on purpose: @expo/vector-icons pulls in the
// native expo-font module, which isn't in the current dev build — using it would
// require a rebuild. Plain labels need no native module, work on the existing
// build, and suit the calm/minimal brand. (Icons can come later with the next
// native rebuild.)
const ACTIVE = "#3A2F25"; // deep-brown
const INACTIVE = "#A59B8D"; // faint-ink

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: "#FFFDF8", // surface
          borderTopColor: "#E6DCC9", // border
          height: 56,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 13 },
      }}
    >
      <Tabs.Screen name="today" options={{ title: "Today" }} />
      <Tabs.Screen name="library" options={{ title: "Library" }} />
      <Tabs.Screen name="returns" options={{ title: "Returns" }} />
      <Tabs.Screen name="look-back" options={{ title: "Look back" }} />
      <Tabs.Screen name="entries/[id]" options={{ href: null }} />
    </Tabs>
  );
}
