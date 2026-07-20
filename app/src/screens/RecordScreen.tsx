import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { TemplateCard } from "../components/TemplateCard";
import { recordingTemplates } from "../constants/data";
import type { RecordingTemplate } from "../constants/data";
import { atoms } from "../theme/atoms";
import { useTheme } from "../theme/ThemeProvider";
import { spacing } from "../theme/theme";
import { RecordingSessionScreen } from "./RecordingSessionScreen";

type ViewMode = "grid" | "list";

export function RecordScreen() {
  const [activeTemplate, setActiveTemplate] = useState<RecordingTemplate | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const c = useTheme();

  if (activeTemplate) {
    return (
      <RecordingSessionScreen
        template={activeTemplate}
        onBack={() => setActiveTemplate(null)}
      />
    );
  }

  return (
    <View style={atoms.gapLg}>
      <View style={{ gap: 6 }}>
        <Text style={{ color: c.primary, fontSize: 13, fontWeight: "600", letterSpacing: 0.2 }}>Recording templates</Text>
        <Text style={{ color: c.text, fontSize: 30, fontWeight: "700", letterSpacing: -0.5, lineHeight: 36 }}>Record</Text>
        <Text style={{ color: c.muted, fontSize: 14, lineHeight: 21, marginTop: 2 }}>
          Record the
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [atoms.flexRow, atoms.itemsCenter, { alignSelf: "flex-start", backgroundColor: c.primary, borderRadius: 8, gap: 7, paddingHorizontal: 16, paddingVertical: 10 }, pressed && { backgroundColor: c.primaryPressed }]}
        onPress={() => setActiveTemplate(recordingTemplates[0])}
        accessibilityRole="button"
      >
        <Ionicons name="mic-outline" size={16} color="#fff" />
        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>Start Recording</Text>
      </Pressable>

      <View style={{ gap: spacing.sm }}>
        <View style={[atoms.flexRow, atoms.itemsCenter, atoms.justifyBetween]}>
          <Text style={{ color: c.muted, fontSize: 12, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" }}>Templates</Text>
          <Pressable
            onPress={() => setViewMode((v) => (v === "grid" ? "list" : "grid"))}
            style={[atoms.flexRow, atoms.itemsCenter, { backgroundColor: c.secondary, borderRadius: 6, gap: 5, paddingHorizontal: 10, paddingVertical: 6 }]}
          >
            <Ionicons name={viewMode === "grid" ? "list-outline" : "grid-outline"} size={14} color={c.muted} />
            <Text style={{ color: c.muted, fontSize: 12, fontWeight: "500" }}>{viewMode === "grid" ? "List" : "Grid"}</Text>
          </Pressable>
        </View>
        <View style={viewMode === "grid" ? [atoms.flexRow, atoms.flexWrap, atoms.gapMd] : { gap: 8 }}>
          {recordingTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              viewMode={viewMode}
              onPress={() => setActiveTemplate(template)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
