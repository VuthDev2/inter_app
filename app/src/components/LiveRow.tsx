import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, Text, View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";
import { atoms } from "../theme/atoms";
import { spacing } from "../theme/theme";
import { uiStyles } from "./ui";

type AnyLiveSession = {
  id: string;
  sourceLang: string;
  targetLang: string;
  mode: "one-way" | "two-way";
  utterances: { id: string; original: string; translation: string }[];
  createdAt: string;
};

export function LiveRow({ session }: { session: AnyLiveSession }) {
  const c = useTheme();
  const count = session.utterances.length;
  const latest = session.utterances[count - 1];
  const date = new Date(session.createdAt);

  const showDetail = () => {
    if (count === 0) {
      Alert.alert("Session", `${session.sourceLang.toUpperCase()} → ${session.targetLang.toUpperCase()}\n${date.toLocaleString()}`, [{ text: "Close" }]);
      return;
    }
    Alert.alert(
      `${session.sourceLang.toUpperCase()} → ${session.targetLang.toUpperCase()}`,
      session.utterances.slice(-5).map((u) => `"${u.original}"\n→ ${u.translation}`).join("\n\n"),
      [{ text: "Close" }],
    );
  };

  return (
    <Pressable onPress={showDetail} style={[atoms.flexRow, atoms.itemsCenter, atoms.gapMd, { borderTopColor: c.border, borderTopWidth: 1, paddingVertical: spacing.md }]} accessibilityRole="button">
      <View style={{ alignItems: "center", backgroundColor: c.primarySoft, borderRadius: 8, flexShrink: 0, height: 38, justifyContent: "center", width: 38 }}>
        <Ionicons name="radio-outline" color={c.primary} size={17} />
      </View>
      <View style={[atoms.flex1, { gap: 2, minWidth: 0 }]}>
        <Text style={{ color: c.text, fontSize: 14, fontWeight: "500" }}>
          {session.sourceLang.toUpperCase()} → {session.targetLang.toUpperCase()}
          {session.mode === "two-way" ? "  ⇄" : ""}
        </Text>
        <Text style={uiStyles.rowMeta}>
          {date.toLocaleDateString()}{count > 0 ? ` · ${count} utterance${count !== 1 ? "s" : ""}` : ""}
          {latest ? ` · "${latest.translation.slice(0, 35)}${latest.translation.length > 35 ? "…" : ""}"` : ""}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={15} color={c.muted} />
    </Pressable>
  );
}
