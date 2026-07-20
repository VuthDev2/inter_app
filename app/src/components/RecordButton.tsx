import { Pressable, View } from "react-native";

import { atoms } from "../theme/atoms";
import { dark } from "../theme/dark";

export function RecordButton({
  isListening,
  onPress,
}: {
  isListening: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: isListening ? "#c53030" : dark.red,
        borderRadius: 99,
        elevation: 10,
        height: 62,
        justifyContent: "center",
        shadowColor: dark.red,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 18,
        width: 62,
        transform: pressed ? [{ scale: 0.91 }] : isListening ? [{ scale: 1.08 }] : [],
      })}
      accessibilityRole="button"
      accessibilityLabel={isListening ? "Stop listening" : "Start listening"}
    >
      {isListening ? (
        <View style={[atoms.flexRow, atoms.itemsCenter, { gap: 5 }]}>
          <View style={{ backgroundColor: dark.white, borderRadius: 3, height: 20, width: 4 }} />
          <View style={{ backgroundColor: dark.white, borderRadius: 3, height: 20, width: 4 }} />
        </View>
      ) : (
        <View style={{ backgroundColor: dark.white, borderRadius: 99, height: 18, width: 18 }} />
      )}
    </Pressable>
  );
}
