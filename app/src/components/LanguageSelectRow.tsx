import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";
import { atoms } from "../theme/atoms";
import { spacing } from "../theme/theme";

export function LanguageSelectRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: c.text, fontSize: 14, fontWeight: "500" }}>{label}</Text>
      <Pressable
        style={[atoms.flexRow, atoms.itemsCenter, atoms.justifyBetween, { backgroundColor: c.surface }, atoms.border1, { borderColor: c.border, borderRadius: 14, minHeight: 50, paddingHorizontal: spacing.md, paddingVertical: 15 }]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
      >
        <Text style={{ color: c.text, fontSize: 15 }}>{value}</Text>
        <Ionicons name="chevron-down" size={18} color={c.muted} />
      </Pressable>
    </View>
  );
}
