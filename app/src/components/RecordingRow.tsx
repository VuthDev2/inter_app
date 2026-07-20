import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";
import { atoms } from "../theme/atoms";
import { spacing } from "../theme/theme";
import { uiStyles } from "./ui";

export function RecordingRow({ icon, title, meta }: { icon: keyof typeof Ionicons.glyphMap; title: string; meta: string }) {
  const c = useTheme();
  return (
    <View style={[atoms.flexRow, atoms.itemsCenter, atoms.gapMd, { borderTopColor: c.border, borderTopWidth: 1, paddingVertical: spacing.md }]}>
      <View style={{ alignItems: "center", backgroundColor: c.secondary, borderRadius: 8, flexShrink: 0, height: 38, justifyContent: "center", width: 38 }}>
        <Ionicons name={icon} color={c.muted} size={17} />
      </View>
      <View style={[atoms.flex1, { gap: 2, minWidth: 0 }]}>
        <Text style={{ color: c.text, fontSize: 14, fontWeight: "500" }}>{title}</Text>
        <Text style={uiStyles.rowMeta}>{meta}</Text>
      </View>
      <Pressable style={[atoms.flexRow, atoms.itemsCenter, { backgroundColor: c.surface }, atoms.border1, { borderColor: c.border, borderRadius: 8, gap: 4, paddingHorizontal: 10, paddingVertical: 6 }]} accessibilityRole="button">
        <Ionicons name="download-outline" size={13} color={c.text} />
        <Text style={{ color: c.text, fontSize: 12, fontWeight: "500" }}>Export</Text>
      </Pressable>
    </View>
  );
}
