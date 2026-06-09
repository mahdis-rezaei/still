import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

// True only on a build that actually includes the speech native module. Checked
// via expo-modules-core (always present, returns null instead of throwing) so we
// never even import expo-speech-recognition on a build that lacks it — importing
// it throws "Cannot find native module" out of band, which escapes try/catch.
function speechAvailable(): boolean {
  try {
    return requireOptionalNativeModule("ExpoSpeechRecognition") != null;
  } catch {
    return false;
  }
}

// Voice → text: tap to dictate, the transcription streams into the editor; tap
// again to stop. expo-speech-recognition is a NATIVE module, imported lazily and
// guarded so this is safe to load on a build that doesn't include it yet (the
// button just reports "needs the latest build" until rebuilt).
//
// `value`/`onChangeText` mirror a TextInput: we snapshot the text at start, then
// append the live transcript so dictation flows into whatever's already written.
export function MicButton({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (t: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const baseRef = useRef("");
  const valueRef = useRef(value);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subsRef = useRef<any[]>([]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  function cleanup() {
    subsRef.current.forEach((s) => s?.remove?.());
    subsRef.current = [];
  }

  async function stop() {
    try {
      const Speech = await import("expo-speech-recognition");
      Speech.ExpoSpeechRecognitionModule.stop();
    } catch {
      // ignore
    }
    cleanup();
    setListening(false);
  }

  async function start() {
    setStarting(true);
    try {
      const Speech = await import("expo-speech-recognition");
      const perm =
        await Speech.ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Microphone access needed",
          "Enable microphone + speech recognition in Settings to dictate.",
        );
        return;
      }
      baseRef.current = valueRef.current;

      const onResult = Speech.ExpoSpeechRecognitionModule.addListener(
        "result",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e: any) => {
          const transcript = e?.results?.[0]?.transcript ?? "";
          const base = baseRef.current;
          const sep = base && transcript && !base.endsWith(" ") ? " " : "";
          onChangeText(base + sep + transcript);
        },
      );
      const onEnd = Speech.ExpoSpeechRecognitionModule.addListener("end", () =>
        void stop(),
      );
      const onError = Speech.ExpoSpeechRecognitionModule.addListener("error", () =>
        void stop(),
      );
      subsRef.current = [onResult, onEnd, onError];

      Speech.ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: true,
      });
      setListening(true);
    } catch {
      Alert.alert(
        "Dictation unavailable",
        "Voice needs the latest build of the app.",
      );
    } finally {
      setStarting(false);
    }
  }

  useEffect(() => () => cleanup(), []);

  // Hide the button entirely on a build without the speech module (so tapping it
  // can never crash). It reappears once the app is rebuilt with voice.
  if (!speechAvailable()) return null;

  return (
    <Pressable
      onPress={() => (listening ? void stop() : void start())}
      className={
        "flex-row items-center gap-2 self-start rounded-full border px-4 py-2 " +
        (listening
          ? "border-accent-sepia bg-accent-sepia/10"
          : "border-border bg-surface")
      }
    >
      {starting ? (
        <ActivityIndicator color="#8A6F4D" />
      ) : (
        <Text className={listening ? "text-accent-sepia" : "text-soft-ink"}>
          {listening ? "● Stop" : "🎙  Dictate"}
        </Text>
      )}
    </Pressable>
  );
}
