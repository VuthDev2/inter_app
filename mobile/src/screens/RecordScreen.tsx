/**
 * RecordScreen — mirrors web /Record (template picker) + /record/$type (recording session)
 *
 * Flow:
 *  RecordScreen (template picker grid)
 *    → tap a card → RecordingSessionScreen (dark recording panel + settings sidebar)
 *
 * Web template picker design:
 *  - eyebrow "Recording templates", h1 "Record", muted description
 *  - Grid sm:grid-cols-2 lg:grid-cols-3 of cards (min-h-40, rounded-lg border bg-card p-5)
 *    - Icon box h-11 w-11 bg-secondary, hover → bg-primary
 *    - Template title font-display text-xl font-semibold
 *    - Description text-sm muted
 *    - "Use template →" text-sm font-medium text-primary
 *
 * Web recording session design:
 *  - Back link "← Templates"
 *  - Header: icon + template title + timer pill
 *  - Dark panel (bg-[#0d1020]) with:
 *    - "Recording Session" heading, audio badge
 *    - Transcript text area (large, muted when idle)
 *    - Waveform (animated bars)
 *    - Big 80px record button (blue idle → red+glow recording)
 *    - Stop + Save buttons
 *  - Settings aside: Source Audio + Speaker Labels toggles
 *  - Metadata card: type, template, saved status
 */
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";

import { atoms } from "../atoms";
import { recordingTemplates } from "../data";
import type { RecordingTemplate } from "../data";
import { saveRecordingSession } from "../storage";
import { colors, spacing } from "../theme";

// ─── Template Picker ──────────────────────────────────────────────────────────
export function RecordScreen() {
  const [activeTemplate, setActiveTemplate] = useState<RecordingTemplate | null>(null);

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
      {/* Page header */}
      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600", letterSpacing: 0.2 }}>Recording templates</Text>
        <Text style={{ color: colors.text, fontSize: 30, fontWeight: "700", letterSpacing: -0.5, lineHeight: 36 }}>Record</Text>
        <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 2 }}>
          Start with a template so each session keeps the right title, metadata, and transcript behaviour.
        </Text>
      </View>

      {/* Quick-start button */}
      <Pressable
        style={({ pressed }) => [atoms.flexRow, atoms.itemsCenter, { alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: 8, gap: 7, paddingHorizontal: 16, paddingVertical: 10 }, pressed && { backgroundColor: colors.primaryPressed }]}
        onPress={() => setActiveTemplate(recordingTemplates[0])}
        accessibilityRole="button"
      >
        <Ionicons name="mic-outline" size={16} color="#fff" />
        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>Start Recording</Text>
      </Pressable>

      {/* Template grid — 2-column on mobile */}
      <View style={[atoms.flexRow, atoms.flexWrap, atoms.gapMd]}>
        {recordingTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onPress={() => setActiveTemplate(template)}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────
function TemplateCard({
  template,
  onPress,
}: {
  template: RecordingTemplate;
  onPress: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      accessibilityRole="button"
      style={[{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexBasis: "47%", flexGrow: 1, gap: 8, minHeight: 160, padding: spacing.lg, shadowColor: colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }, pressed && { backgroundColor: colors.secondary, borderColor: colors.primary + "80" }]}
    >
      {/* Icon box: h-11 w-11 bg-secondary, pressed → bg-primary */}
      <View style={[{ alignItems: "center", backgroundColor: colors.secondary, borderRadius: 8, height: 44, justifyContent: "center", width: 44 }, pressed && { backgroundColor: colors.primary }]}>
        <Ionicons
          name={template.icon as any}
          size={22}
          color={pressed ? "#fff" : colors.muted}
        />
      </View>

      <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700", letterSpacing: -0.2, lineHeight: 22, marginTop: 4 }}>{template.title}</Text>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>{template.description}</Text>

      {/* "Use template →" */}
      <View style={[atoms.flexRow, atoms.itemsCenter, { gap: 4, marginTop: "auto", paddingTop: 8 }]}>
        <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>Use template</Text>
        <Ionicons name="arrow-forward" size={14} color={colors.primary} />
      </View>
    </Pressable>
  );
}

// ─── Recording Session Screen ─────────────────────────────────────────────────
function RecordingSessionScreen({
  template,
  onBack,
}: {
  template: RecordingTemplate;
  onBack: () => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [sourceAudio, setSourceAudio] = useState(template.sourceAudio);
  const [speakerLabels, setSpeakerLabels] = useState(template.speakerLabels);
  const [elapsed, setElapsed] = useState(0); // seconds
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setElapsed((t) => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const formatTime = (secs: number) => {
    const m = String(Math.floor(secs / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleSave = async () => {
    setIsRecording(false);
    const session = {
      id: `${template.id}-${Date.now()}`,
      recordingType: template.id,
      title: `${template.title} Recording`,
      description: template.description,
      transcript: isRecording
        ? "Recording stopped and transcript draft saved."
        : template.starterPrompt,
      sourceAudio,
      status: "saved" as const,
      createdAt: new Date().toISOString(),
    };
    await saveRecordingSession(session);
    Alert.alert("Saved", `${template.title} session saved to Library.`, [
      { text: "OK", onPress: onBack },
    ]);
  };

  const starterPrompts: Record<string, string> = {
    presentation: "Capture a polished transcript for a talk, demo, or keynote.",
    meeting:      "Track decisions, action items, and business discussion.",
    conference:   "Record a long-form event with multiple speakers.",
    lecture:      "Capture course material, examples, and study notes.",
    interview:    "Separate questions, answers, and follow-up points.",
    podcast:      "Prepare a clean transcript for show notes and editing.",
    "voice-note": "Save a quick idea, reminder, or personal note.",
  };
  const prompt = starterPrompts[template.id] ?? template.description;

  return (
    <ScrollView
      style={atoms.bgBackground}
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.lg, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Back + header ── */}
      <Pressable onPress={onBack} style={[atoms.flexRow, atoms.itemsCenter, { gap: 5, marginBottom: -4 }]} accessibilityRole="button">
        <Ionicons name="arrow-back-outline" size={16} color={colors.muted} />
        <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "500" }}>Templates</Text>
      </Pressable>

      <View style={[atoms.flexRow, atoms.itemsStart, atoms.gapMd, atoms.justifyBetween]}>
        <View style={[atoms.flexRow, atoms.itemsCenter, atoms.gapMd]}>
          <View style={{ alignItems: "center", backgroundColor: colors.secondary, borderRadius: 8, height: 48, justifyContent: "center", width: 48 }}>
            <Ionicons name={template.icon as any} size={24} color={colors.muted} />
          </View>
          <View>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "500" }}>Recording template</Text>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: "700", letterSpacing: -0.4 }}>{template.title}</Text>
          </View>
        </View>
        {/* Timer pill */}
        <View style={[atoms.flexRow, atoms.itemsCenter, atoms.bgSurface, atoms.border1, { borderColor: colors.border, borderRadius: 99, gap: 5, paddingHorizontal: 10, paddingVertical: 6 }]}>
          <Ionicons name="time-outline" size={14} color={colors.primary} />
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>{isRecording ? "Recording" : "Ready"}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{formatTime(elapsed)}</Text>
        </View>
      </View>

      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: -4 }}>{prompt}</Text>

      {/* ── Dark recording panel ── */}
      <View style={{ backgroundColor: "#0d1020", borderRadius: 22, gap: spacing.lg, overflow: "hidden", padding: spacing.lg }}>
        {/* Dark panel header */}
        <View style={[atoms.flexRow, atoms.itemsCenter, atoms.justifyBetween, { borderBottomColor: "rgba(255,255,255,0.1)", borderBottomWidth: 1, marginHorizontal: -spacing.lg, marginTop: -spacing.lg, paddingBottom: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md }]}>
          <View>
            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "700", letterSpacing: 1.4, textTransform: "uppercase" }}>{template.title.toUpperCase()}</Text>
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700", letterSpacing: -0.3, marginTop: 2 }}>Recording Session</Text>
          </View>
          <View style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "500" }}>{sourceAudio ? "Audio on" : "Audio off"}</Text>
          </View>
        </View>

        {/* Transcript area */}
        <View style={{ backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)", borderRadius: 14, borderWidth: 1, gap: spacing.lg, minHeight: 140, padding: spacing.md }}>
          <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, fontWeight: "500" }}>
            {isRecording ? "Listening…" : "Press record when you are ready"}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 18, fontWeight: "400", lineHeight: 28 }}>
            {isRecording ? "Your transcript will appear here as the recording is captured." : prompt}
          </Text>
        </View>

        {/* Waveform */}
        <View style={[atoms.flexRow, atoms.itemsCenter, atoms.justifyCenter, { gap: 4, height: 64, paddingHorizontal: spacing.md }]}>
          {[22, 42, 30, 58, 36, 68, 44, 72, 40, 62, 32, 50, 26, 46, 34, 56, 28, 40].map((h, i) => (
            <View key={i} style={{ backgroundColor: "rgba(255,255,255,0.55)", borderRadius: 99, width: 5, height: isRecording ? h : Math.max(4, h * 0.28), opacity: isRecording ? 0.85 : 0.28 }} />
          ))}
        </View>

        {/* Record button */}
        <View style={[atoms.itemsCenter, atoms.justifyCenter]}>
          <Pressable
            onPress={() => setIsRecording((v) => !v)}
            style={({ pressed }) => ({
              alignItems: "center",
              borderRadius: 99,
              height: 80,
              justifyContent: "center",
              width: 80,
              shadowOffset: { width: 0, height: 0 },
              shadowRadius: 20,
              elevation: 8,
              backgroundColor: isRecording ? "#c0392b" : colors.primary,
              shadowColor: isRecording ? "#c0392b" : colors.primary,
              shadowOpacity: isRecording ? 0.55 : 0.45,
              transform: pressed ? [{ scale: 0.93 }] : [],
            })}
            accessibilityRole="button"
            accessibilityLabel={isRecording ? "Pause recording" : "Start recording"}
          >
            <Ionicons name={isRecording ? "pause" : "mic-outline"} size={32} color="#fff" />
          </Pressable>
        </View>

        {/* Stop + Save */}
        <View style={[atoms.flexRow, atoms.justifyCenter, atoms.gapMd]}>
          <Pressable
            onPress={() => { setIsRecording(false); setElapsed(0); }}
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

      {/* ── Settings card ── */}
      <View style={atoms.card}>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700", letterSpacing: -0.2 }}>Template Settings</Text>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: -6 }}>Settings from the selected template.</Text>

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

      {/* ── Metadata card ── */}
      <View style={atoms.card}>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700", letterSpacing: -0.2 }}>Session Metadata</Text>
        <View style={{ gap: 2 }}>
          {[{ label: "Route type", value: template.id }, { label: "Template", value: template.title }, { label: "Saved with type", value: "Yes" }].map((r) => (
            <View key={r.label} style={[atoms.flexRow, atoms.justifyBetween, { borderTopColor: colors.border, borderTopWidth: 1, paddingVertical: 10 }]}>
              <Text style={{ color: colors.muted, fontSize: 13 }}>{r.label}</Text>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }}>{r.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Setting row ──────────────────────────────────────────────────────────────
function SettingRow({
  icon,
  label,
  description,
  value,
  onChange,
}: {
  icon: string;
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={[atoms.flexRow, atoms.itemsCenter, atoms.justifyBetween, { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 8, borderWidth: 1, gap: spacing.md, padding: spacing.md }]}>
      <View style={[atoms.flexRow, atoms.itemsCenter, atoms.flex1, atoms.gapMd]}>
        <View style={{ alignItems: "center", backgroundColor: colors.secondary, borderRadius: 8, height: 40, justifyContent: "center", width: 40 }}>
          <Ionicons name={icon as any} size={20} color={colors.muted} />
        </View>
        <View style={[atoms.flex1, { gap: 2 }]}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>{label}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#fff"
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}
