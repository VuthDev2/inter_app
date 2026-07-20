import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";
import { spacing } from "../theme/theme";
import { uiStyles } from "./ui";

export function Bucket({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const c = useTheme();
  return (
    <View style={[{ backgroundColor: c.surface, borderColor: c.border, borderRadius: 14, borderWidth: 1, flexBasis: "47%", flexGrow: 1, gap: 6, padding: spacing.md, shadowColor: c.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }]}>
      <View style={{ alignItems: "center", backgroundColor: c.secondary, borderRadius: 8, height: 36, justifyContent: "center", width: 36 }}>
        <Ionicons name={icon} color={c.muted} size={17} />
      </View>
      <Text style={{ color: c.text, fontSize: 22, fontWeight: "700", letterSpacing: -0.3 }}>{value}</Text>
      <Text style={uiStyles.rowMeta}>{label}</Text>
    </View>
  );
}
