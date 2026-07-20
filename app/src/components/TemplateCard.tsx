import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import type { RecordingTemplate } from "../constants/data";
import { useTheme } from "../theme/ThemeProvider";
import { atoms } from "../theme/atoms";
import { spacing } from "../theme/theme";

type ViewMode = "grid" | "list";

export function TemplateCard({
  template,
  viewMode,
  onPress,
}: {
  template: RecordingTemplate;
  viewMode: ViewMode;
  onPress: () => void;
}) {
  const c = useTheme();
  const [pressed, setPressed] = useState(false);

  if (viewMode === "list") {
    return (
      <Pressable
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onPress={onPress}
        accessibilityRole="button"
        style={[atoms.flexRow, atoms.itemsCenter, {
          backgroundColor: c.surface, borderColor: pressed ? c.primary + "80" : c.border,
          borderRadius: 10, borderWidth: 1,
          gap: 12, padding: spacing.md,
        }, pressed && { backgroundColor: c.secondary }]}
      >
        <View style={[{ alignItems: "center", backgroundColor: c.secondary, borderRadius: 6, height: 36, justifyContent: "center", width: 36 }, pressed && { backgroundColor: c.primary }]}>
          <Ionicons name={template.icon as any} size={18} color={pressed ? "#fff" : c.muted} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ color: c.text, fontSize: 15, fontWeight: "600" }}>{template.title}</Text>
          <Text style={{ color: c.muted, fontSize: 12, lineHeight: 16 }} numberOfLines={1}>{template.description}</Text>
        </View>
        <Ionicons name="arrow-forward" size={14} color={c.muted} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      accessibilityRole="button"
      style={[{ backgroundColor: c.surface, borderColor: c.border, borderRadius: 14, borderWidth: 1, flexBasis: "47%", flexGrow: 1, gap: 8, minHeight: 160, padding: spacing.lg, shadowColor: c.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }, pressed && { backgroundColor: c.secondary, borderColor: c.primary + "80" }]}
    >
      <View style={[{ alignItems: "center", backgroundColor: c.secondary, borderRadius: 8, height: 44, justifyContent: "center", width: 44 }, pressed && { backgroundColor: c.primary }]}>
        <Ionicons name={template.icon as any} size={22} color={pressed ? "#fff" : c.muted} />
      </View>
      <Text style={{ color: c.text, fontSize: 17, fontWeight: "700", letterSpacing: -0.2, lineHeight: 22, marginTop: 4 }}>{template.title}</Text>
      <Text style={{ color: c.muted, fontSize: 13, lineHeight: 18 }}>{template.description}</Text>
      <View style={[atoms.flexRow, atoms.itemsCenter, { gap: 4, marginTop: "auto", paddingTop: 8 }]}>
        <Text style={{ color: c.primary, fontSize: 13, fontWeight: "600" }}>Use template</Text>
        <Ionicons name="arrow-forward" size={14} color={c.primary} />
      </View>
    </Pressable>
  );
}
