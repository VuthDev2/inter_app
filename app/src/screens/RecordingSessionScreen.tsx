import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { SettingRow } from "../components/SettingRow";
import { recordingTemplates } from "../constants/data";
import type { RecordingTemplate } from "../constants/data";
import { useLiveInterpretation } from "../hooks/useLiveInterpretation";
import { usePreferences } from "../features/preferences/context";
import { saveRecordingSession } from "../services/storage";
import { atoms } from "../theme/atoms";
import { useTheme } from "../theme/ThemeProvider";
import { spacing } from "../theme/theme";

export function RecordingSessionScreen({
  template,
  onBack,
}: {
  template: RecordingTemplate;
  onBack: () => void;
}) {
  const { preferred_source_lang, preferred_target_lang } = usePreferences();
  const interp = useLiveInterpretation(preferred_source_lang, preferred_target_lang);
  const [sourceAudio, setSourceAudio] = useState(template.sourceAudio);
  const [speakerLabels, setSpeakerLabels] = useState(template.speakerLabels);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const c = useTheme();

  useEffect(() => {
    if (interp.isListening) {
      timerRef.current = setInterval(() => setElapsed((t) => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [interp.isListening]);

  const formatTime = (secs: number) => {
    const m = String(Math.floor(secs / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleSave = async () => {
    interp.stop();
    const transcriptText = interp.entries.map((e) => `${e.original} → ${e.translation}`).join("\n");
    const session = {
      id: `${template.id}-${Date.now()}`,
      recordingType: template.id,
      title: `${template.title} Recording`,
      description: template.description,
      transcript: transcriptText || "No transcript captured.",
      sourceAudio,
      status: "saved" as const,
      createdAt: new Date().toISOString(),
    };
    await saveRecordingSession(session);
    Alert.alert("Saved", `${template.title} session saved to Library.`, [
      { text: "OK", onPress: onBack },
    ]);
  };

  const handleStop = useCallback(() => {
    interp.stop();
    setElapsed(0);
  }, [interp]);

  const toggleMic = useCallback(() => {
    if (interp.isListening) {
      interp.stop();
    } else {
      setElapsed(0);
      interp.start();
    }
  }, [interp]);

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.lg, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={onBack} style={[atoms.flexRow, atoms.itemsCenter, { gap: 5, marginBottom: -4 }]} accessibilityRole="button">
        <Ionicons name="arrow-back-outline" size={16} color={c.muted} />
        <Text style={{ color: c.muted, fontSize: 13, fontWeight: "500" }}>Templates</Text>
      </Pressable>

      <View style={[atoms.flexRow, atoms.itemsStart, atoms.gapMd, atoms.justifyBetween]}>
        <View style={[atoms.flexRow, atoms.itemsCenter, atoms.gapMd]}>
          <View style={{ alignItems: "center", backgroundColor: c.primarySoft, borderRadius: 8, height: 48, justifyContent: "center", width: 48 }}>
            <Ionicons name={template.icon as any} size={24} color={c.primary} />
          </View>
          <View>
            <Text style={{ color: c.primary, fontSize: 12, fontWeight: "500" }}>{preferred_source_lang.toUpperCase()} → {preferred_target_lang.toUpperCase()}</Text>
            <Text style={{ color: c.text, fontSize: 24, fontWeight: "700", letterSpacing: -0.4 }}>Live Interpretation</Text>
          </View>
        </View>
        <View style={[atoms.flexRow, atoms.itemsCenter, { backgroundColor: c.surface }, atoms.border1, { borderColor: c.border, borderRadius: 99, gap: 5, paddingHorizontal: 10, paddingVertical: 6 }]}>
          <View style={{ backgroundColor: interp.isListening ? c.red : c.primary, borderRadius: 99, height: 7, width: 7 }} />
          <Text style={{ color: c.text, fontSize: 12, fontWeight: "600" }}>{interp.isListening ? "Listening" : "Ready"}</Text>
          <Text style={{ color: c.muted, fontSize: 12 }}>{formatTime(elapsed)}</Text>
        </View>
      </View>

      {interp.error && (
        <View style={{ backgroundColor: "rgba(192,57,43,0.12)", borderRadius: 10, padding: spacing.md }}>
          <Text style={{ color: c.red, fontSize: 13, lineHeight: 18 }}>{interp.error}</Text>
        </View>
      )}

      <View style={{ backgroundColor: "#0d1020", borderRadius: 22, gap: spacing.md, overflow: "hidden", padding: spacing.lg }}>
        <View style={[atoms.flexRow, atoms.itemsCenter, atoms.justifyBetween, { borderBottomColor: "rgba(255,255,255,0.1)", borderBottomWidth: 1, marginHorizontal: -spacing.lg, marginTop: -spacing.lg, paddingBottom: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md }]}>
          <View>
            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "700", letterSpacing: 1.4, textTransform: "uppercase" }}>{template.title.toUpperCase()}</Text>
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700", letterSpacing: -0.3, marginTop: 1 }}>
              {interp.isListening ? "Listening…" : "Interpretation"}
            </Text>
          </View>
          <View style={{ backgroundColor: "rgba(75,113,196,0.15)", borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: "#6b93d6", fontSize: 11, fontWeight: "600" }}>
              {preferred_source_lang.toUpperCase()} → {preferred_target_lang.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={{ backgroundColor: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)", borderRadius: 14, borderWidth: 1, minHeight: 140, padding: spacing.md }}>
          {interp.entries.length === 0 && !interp.interimText ? (
            <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: "500" }}>
              {interp.isListening ? "Listening for speech…" : "Tap the mic to start live interpretation"}
            </Text>
          ) : (
            <View style={{ gap: 2 }}>
              {interp.entries.map((entry) => (
                <View key={entry.id} style={{ gap: 3, paddingVertical: 5 }}>
                  <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 16, lineHeight: 23 }}>{entry.original}</Text>
                  <Text style={{ color: "#6b93d6", fontSize: 16, lineHeight: 23, fontWeight: "500" }}>{entry.translation}</Text>
                  <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginTop: 4 }} />
                </View>
              ))}
              {interp.interimText ? (
                <View style={{ gap: 3, paddingVertical: 5 }}>
                  <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, lineHeight: 23, fontStyle: "italic" }}>{interp.interimText}</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        <View style={[atoms.flexRow, atoms.itemsCenter, atoms.justifyCenter, { gap: 4, height: 56, paddingHorizontal: spacing.md }]}>
          {Array.from({ length: 20 }, (_, i) => {
            const baseHeights = [18, 32, 24, 44, 28, 52, 34, 56, 32, 48, 26, 40, 22, 38, 28, 44, 22, 36, 20, 30];
            const base = baseHeights[i % baseHeights.length];
            const vol = interp.isListening ? Math.max(0.3, Math.min(1, (interp.volume + 2) / 10)) : 0.2;
            const h = interp.isListening ? base * (0.5 + vol * 0.5) : base * 0.2;
            return (
              <View
                key={i}
                style={{
                  backgroundColor: interp.isListening ? "#4B71C4" : "rgba(255,255,255,0.2)",
                  borderRadius: 99, width: 4,
                  height: Math.max(3, h),
                  opacity: interp.isListening ? 0.6 + vol * 0.4 : 0.2,
                }}
              />
            );
          })}
        </View>

        <View style={[atoms.itemsCenter, atoms.justifyCenter]}>
          <Pressable
            onPress={toggleMic}
            style={({ pressed }) => ({
              alignItems: "center",
              borderRadius: 99,
              height: 80,
              justifyContent: "center",
              width: 80,
              shadowOffset: { width: 0, height: 0 },
              shadowRadius: 20,
              elevation: 8,
              backgroundColor: interp.isListening ? "#e53e3e" : c.primary,
              shadowColor: interp.isListening ? "#e53e3e" : c.primary,
              shadowOpacity: interp.isListening ? 0.5 : 0.4,
              transform: pressed ? [{ scale: 0.93 }] : interp.isListening ? [{ scale: 1.06 }] : [],
            })}
            accessibilityRole="button"
            accessibilityLabel={interp.isListening ? "Stop listening" : "Start listening"}
          >
            <Ionicons name={interp.isListening ? "mic" : "mic-outline"} size={32} color="#fff" />
          </Pressable>
        </View>

        <View style={[atoms.flexRow, atoms.justifyCenter, atoms.gapMd]}>
          <Pressable
            onPress={handleStop}
            style={[atoms.flexRow, atoms.itemsCenter, { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 8, gap: 6, paddingHorizontal: 20, paddingVertical: 10 }]}
            accessibilityRole="button"
          >
            <Ionicons name="stop-outline" size={15} color="rgba(255,255,255,0.8)" />
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: "600" }}>Stop</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            style={[atoms.flexRow, atoms.itemsCenter, { backgroundColor: "#ffffff", borderRadius: 8, gap: 6, paddingHorizontal: 20, paddingVertical: 10 }]}
            accessibilityRole="button"
          >
            <Ionicons name="save-outline" size={15} color="#0d1020" />
            <Text style={{ color: "#0d1020", fontSize: 14, fontWeight: "700" }}>Save</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 14, padding: spacing.lg, shadowColor: c.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
        <Text style={{ color: c.text, fontSize: 17, fontWeight: "700", letterSpacing: -0.2 }}>Template Settings</Text>
        <Text style={{ color: c.muted, fontSize: 13, lineHeight: 18, marginTop: -6 }}>Settings from the selected template.</Text>
        <View style={{ gap: spacing.sm }}>
          <SettingRow
            icon="headset-outline"
            label="Source Audio"
            description="Store audio with the transcript."
            value={sourceAudio}
            onChange={setSourceAudio}
          />
          <SettingRow
            icon="document-text-outline"
            label="Speaker Labels"
            description="Sections for multiple speakers."
            value={speakerLabels}
            onChange={setSpeakerLabels}
          />
        </View>
      </View>

      <View style={{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 14, padding: spacing.lg, shadowColor: c.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
        <Text style={{ color: c.text, fontSize: 17, fontWeight: "700", letterSpacing: -0.2 }}>Session Metadata</Text>
        <View style={{ gap: 2 }}>
          {[{ label: "Template", value: template.title }, { label: "Direction", value: `${preferred_source_lang.toUpperCase()} → ${preferred_target_lang.toUpperCase()}` }, { label: "Entries", value: String(interp.entries.length) }].map((r) => (
            <View key={r.label} style={[atoms.flexRow, atoms.justifyBetween, { borderTopColor: c.border, borderTopWidth: 1, paddingVertical: 10 }]}>
              <Text style={{ color: c.muted, fontSize: 13 }}>{r.label}</Text>
              <Text style={{ color: c.text, fontSize: 13, fontWeight: "500" }}>{r.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
