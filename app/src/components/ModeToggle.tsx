import { Pressable, Text, View } from "react-native";

import { dark } from "../theme/dark";

export function ModeToggle({
  mode,
  busy,
  onChange,
}: {
  mode: "one-way" | "two-way";
  busy: boolean;
  onChange: (mode: "one-way" | "two-way") => void;
}) {
  return (
    <View style={[{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 99, flexDirection: "row", padding: 4 }, busy && { opacity: 0.4 }]}>
      <Pressable
        onPress={() => !busy && onChange("one-way")}
        style={[{ borderRadius: 99, paddingHorizontal: 16, paddingVertical: 8 }, mode === "one-way" && { backgroundColor: dark.white }]}
      >
        <Text style={[{ color: dark.dim, fontSize: 13, fontWeight: "600" }, mode === "one-way" && { color: dark.bg }]}>1-way</Text>
      </Pressable>
      <Pressable
        onPress={() => !busy && onChange("two-way")}
        style={[{ borderRadius: 99, paddingHorizontal: 16, paddingVertical: 8 }, mode === "two-way" && { backgroundColor: dark.indigo }]}
      >
        <Text style={[{ color: dark.dim, fontSize: 13, fontWeight: "600" }, mode === "two-way" && { color: dark.white }]}>2-way</Text>
      </Pressable>
    </View>
  );
}
