import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// The signed-in tab bar: Today (write) · Library (read) · Returns (the engine's
// archive) · Look back (browse your pages by date). entries/[id] is a hidden
// stack route (pushed from a list), not a tab. Brand-matched colors.
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
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: "Today",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="create-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="returns"
        options={{
          title: "Returns",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="look-back"
        options={{
          title: "Look back",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="entries/[id]" options={{ href: null }} />
    </Tabs>
  );
}
