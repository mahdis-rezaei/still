import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";

// A "Done" bar above the keyboard so multiline inputs (where Return makes a new
// line, as journaling needs) still have a clear way to dismiss the keyboard.
// iOS only — Android shows a system keyboard-dismiss affordance. Attach an input
// to it with inputAccessoryViewID={KEYBOARD_DONE_ID}, and render <KeyboardDone/>
// once in the screen.
export const KEYBOARD_DONE_ID = "yadegar-keyboard-done";

export function KeyboardDone() {
  if (Platform.OS !== "ios") return null;
  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_ID}>
      <View className="flex-row justify-end border-t border-border bg-surface px-4 py-2">
        <Pressable onPress={() => Keyboard.dismiss()} hitSlop={8}>
          <Text className="text-deep-brown text-base">Done</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}
