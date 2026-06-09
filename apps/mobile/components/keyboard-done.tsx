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
// iOS only. Attach an input with inputAccessoryViewID={KEYBOARD_DONE_ID} and
// render <KeyboardDone/> once in the screen.
//
// Uses explicit inline styles (not NativeWind className): the accessory view is a
// separate native overlay where Tailwind classes don't reliably apply, which made
// an earlier className-styled bar render blank.
export const KEYBOARD_DONE_ID = "yadegar-keyboard-done";

export function KeyboardDone() {
  if (Platform.OS !== "ios") return null;
  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_ID}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          alignItems: "center",
          backgroundColor: "#FFFDF8",
          borderTopWidth: 1,
          borderTopColor: "#E6DCC9",
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <Pressable onPress={() => Keyboard.dismiss()} hitSlop={10}>
          <Text style={{ color: "#3A2F25", fontSize: 16, fontWeight: "600" }}>
            Done
          </Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}
