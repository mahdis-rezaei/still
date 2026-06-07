import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useAuth } from "../../lib/auth";

// Email/password auth. Google + Sign in with Apple land in Phase 0.x (native
// flows). The look mirrors the web's calm auth screen.
export default function SignIn() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === "in") await signIn(email.trim(), password);
      else await signUp(email.trim(), password, name.trim() || undefined);
    } catch {
      setError("That didn't work. Check your details and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-background px-6 justify-center">
      <Text className="text-3xl text-deep-brown text-center">Yadegar</Text>
      <Text className="text-soft-ink text-center mt-1 mb-8">
        {mode === "in" ? "Welcome back." : "Begin your journal."}
      </Text>

      {mode === "up" && (
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name (optional)"
          placeholderTextColor="#A59B8D"
          className="bg-surface border border-border rounded-xl px-4 py-3 mb-3 text-ink"
        />
      )}
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="#A59B8D"
        autoCapitalize="none"
        keyboardType="email-address"
        className="bg-surface border border-border rounded-xl px-4 py-3 mb-3 text-ink"
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#A59B8D"
        secureTextEntry
        className="bg-surface border border-border rounded-xl px-4 py-3 mb-4 text-ink"
      />

      {error && <Text className="text-accent-sepia text-sm mb-3">{error}</Text>}

      <Pressable
        onPress={submit}
        disabled={busy || !email || !password}
        className="bg-deep-brown rounded-full py-3.5 items-center disabled:opacity-50"
      >
        {busy ? (
          <ActivityIndicator color="#F7F1E6" />
        ) : (
          <Text className="text-background text-base">
            {mode === "in" ? "Sign in" : "Create account"}
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => setMode(mode === "in" ? "up" : "in")}
        className="mt-6 items-center"
      >
        <Text className="text-soft-ink text-sm">
          {mode === "in"
            ? "New to Yadegar? Create one"
            : "Already have an account? Sign in"}
        </Text>
      </Pressable>
    </View>
  );
}
