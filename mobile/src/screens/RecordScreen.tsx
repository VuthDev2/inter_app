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
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { recordingTemplates } from "../data";
import type { RecordingTemplate } from "../data";
import { saveRecordingSession } from "../storage";
import { colors, radius, spacing } from "../theme";

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
    <View style={s.screen}>
      {/* Page header */}
      <View style={s.pageHeader}>
        <Text style={s.eyebrow}>Recording templates</Text>
        <Text style={s.pageTitle}>Record</Text>
        <Text style={s.pageBody}>
          Start with a template so each session keeps the right title, metadata, and transcript behaviour.
        </Text>
      </View>

      {/* Quick-start button */}
      <Pressable
        style={({ pressed }) => [s.quickStartBtn, pressed && s.quickStartBtnPressed]}
        onPress={() => setActiveTemplate(recordingTemplates[0])}
        accessibilityRole="button"
      >
        <Ionicons name="mic-outline" size={16} color="#fff" />
        <Text style={s.quickStartBtnText}>Start Recording</Text>
      </Pressable>

      {/* Template grid — 2-column on mobile */}
      <View style={s.grid}>
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
      style={[s.card, pressed && s.cardPressed]}
    >
      {/* Icon box: h-11 w-11 bg-secondary, pressed → bg-primary */}
      <View style={[s.cardIconBox, pressed && s.cardIconBoxActive]}>
        <Ionicons
          name={template.icon as any}
          size={22}
          color={pressed ? "#fff" : colors.muted}
        />
      </View>

      <Text style={s.cardTitle}>{template.title}</Text>
      <Text style={s.cardDesc}>{template.description}</Text>

      {/* "Use template →" */}
      <View style={s.cardFooter}>
        <Text style={s.cardCta}>Use template</Text>
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
      style={s.sessionBg}
      contentContainerStyle={s.sessionContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Back + header ── */}
      <Pressable onPress={onBack} style={s.backRow} accessibilityRole="button">
        <Ionicons name="arrow-back-outline" size={16} color={colors.muted} />
        <Text style={s.backText}>Templates</Text>
      </Pressable>

      <View style={s.sessionHeader}>
        <View style={s.sessionHeaderLeft}>
          <View style={s.templateIconBox}>
            <Ionicons name={template.icon as any} size={24} color={colors.muted} />
          </View>
          <View>
            <Text style={s.sessionEyebrow}>Recording template</Text>
            <Text style={s.sessionTitle}>{template.title}</Text>
          </View>
        </View>
        {/* Timer pill */}
        <View style={s.timerPill}>
          <Ionicons name="time-outline" size={14} color={colors.primary} />
          <Text style={s.timerStatus}>{isRecording ? "Recording" : "Ready"}</Text>
          <Text style={s.timerValue}>{formatTime(elapsed)}</Text>
        </View>
      </View>

      <Text style={s.sessionPromptText}>{prompt}</Text>

      {/* ── Dark recording panel ── */}
      <View style={s.darkPanel}>
        {/* Dark panel header */}
        <View style={s.darkPanelHeader}>
          <View>
            <Text style={s.darkPanelEyebrow}>{template.title.toUpperCase()}</Text>
            <Text style={s.darkPanelTitle}>Recording Session</Text>
          </View>
          <View style={s.audioBadge}>
            <Text style={s.audioBadgeText}>{sourceAudio ? "Audio on" : "Audio off"}</Text>
          </View>
        </View>

        {/* Transcript area */}
        <View style={s.transcriptBox}>
          <Text style={s.transcriptHint}>
            {isRecording ? "Listening…" : "Press record when you are ready"}
          </Text>
          <Text style={s.transcriptText}>
            {isRecording
              ? "Your transcript will appear here as the recording is captured."
              : prompt}
          </Text>
        </View>

        {/* Waveform */}
        <SessionWaveform active={isRecording} />

        {/* Record button */}
        <View style={s.recordRow}>
          <Pressable
            onPress={() => setIsRecording((v) => !v)}
            style={({ pressed }) => [
              s.recordBtn,
              isRecording ? s.recordBtnActive : s.recordBtnIdle,
              pressed && s.recordBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={isRecording ? "Pause recording" : "Start recording"}
          >
            <Ionicons
              name={isRecording ? "pause" : "mic-outline"}
              size={32}
              color="#fff"
            />
          </Pressable>
        </View>

        {/* Stop + Save */}
        <View style={s.actionRow}>
          <Pressable
            onPress={() => { setIsRecording(false); setElapsed(0); }}
            style={s.actionBtnSecondary}
            accessibilityRole="button"
          >
            <Ionicons name="stop-outline" size={15} color="rgba(255,255,255,0.8)" />
            <Text style={s.actionBtnSecondaryText}>Stop</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            style={s.actionBtnSave}
            accessibilityRole="button"
          >
            <Ionicons name="save-outline" size={15} color="#0d1020" />
            <Text style={s.actionBtnSaveText}>Save</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Settings card ── */}
      <View style={s.settingsCard}>
        <Text style={s.settingsTitle}>Template Settings</Text>
        <Text style={s.settingsMeta}>Settings from the selected template.</Text>

        <View style={s.settingsList}>
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
      <View style={s.settingsCard}>
        <Text style={s.settingsTitle}>Session Metadata</Text>
        <View style={s.metaList}>
          <MetaRow label="Route type"  value={template.id} />
          <MetaRow label="Template"    value={template.title} />
          <MetaRow label="Saved with type" value="Yes" />
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Waveform (dark panel) ────────────────────────────────────────────────────
const BARS = [22, 42, 30, 58, 36, 68, 44, 72, 40, 62, 32, 50, 26, 46, 34, 56, 28, 40];

function SessionWaveform({ active }: { active: boolean }) {
  return (
    <View style={s.waveformRow}>
      {BARS.map((h, i) => (
        <View
          key={i}
          style={[
            s.waveBar,
            {
              height: active ? h : Math.max(4, h * 0.28),
              opacity: active ? 0.85 : 0.28,
            },
          ]}
        />
      ))}
    </View>
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
    <View style={s.settingRow}>
      <View style={s.settingRowLeft}>
        <View style={s.settingIconBox}>
          <Ionicons name={icon as any} size={20} color={colors.muted} />
        </View>
        <View style={s.settingCopy}>
          <Text style={s.settingLabel}>{label}</Text>
          <Text style={s.settingDesc}>{description}</Text>
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

// ─── Metadata row ─────────────────────────────────────────────────────────────
function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.metaRow}>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={s.metaValue}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // ── Template picker ──
  screen: {
    gap: spacing.lg,
  },
  pageHeader: {
    gap: 6,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  pageTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  pageBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 2,
  },
  quickStartBtn: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  quickStartBtnPressed: {
    backgroundColor: colors.primaryPressed,
  },
  quickStartBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Template grid — 2-column
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  // Card: ~47% width (2-col), min-h-40, rounded-lg border bg-card p-5
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: 8,
    minHeight: 160,
    padding: spacing.lg,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardPressed: {
    backgroundColor: colors.secondary,
    borderColor: colors.primary + "80",
  },
  // Icon box: h-11 w-11 bg-secondary, hover → bg-primary
  cardIconBox: {
    alignItems: "center",
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  cardIconBoxActive: {
    backgroundColor: colors.primary,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
    lineHeight: 22,
    marginTop: 4,
  },
  cardDesc: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  cardFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: "auto",
    paddingTop: 8,
  },
  cardCta: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },

  // ── Recording session ──
  sessionBg: {
    backgroundColor: colors.background,
  },
  sessionContent: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: 120, // clear the floating tab bar
  },
  backRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginBottom: -4,
  },
  backText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "500",
  },
  sessionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  sessionHeaderLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  templateIconBox: {
    alignItems: "center",
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  sessionEyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "500",
  },
  sessionTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  timerPill: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 99,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timerStatus: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  timerValue: {
    color: colors.muted,
    fontSize: 12,
  },
  sessionPromptText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: -4,
  },

  // Dark panel (bg-[#0d1020])
  darkPanel: {
    backgroundColor: "#0d1020",
    borderRadius: radius.xxl,
    gap: spacing.lg,
    overflow: "hidden",
    padding: spacing.lg,
  },
  darkPanelHeader: {
    alignItems: "center",
    borderBottomColor: "rgba(255,255,255,0.1)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  darkPanelEyebrow: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  darkPanelTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginTop: 2,
  },
  audioBadge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  audioBadgeText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "500",
  },

  // Transcript box
  transcriptBox: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.lg,
    minHeight: 140,
    padding: spacing.md,
  },
  transcriptHint: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    fontWeight: "500",
  },
  transcriptText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 18,
    fontWeight: "400",
    lineHeight: 28,
  },

  // Waveform
  waveformRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    height: 64,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  waveBar: {
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 99,
    width: 5,
  },

  // Record button (80px)
  recordRow: {
    alignItems: "center",
    justifyContent: "center",
  },
  recordBtn: {
    alignItems: "center",
    borderRadius: 99,
    height: 80,
    justifyContent: "center",
    width: 80,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 8,
  },
  recordBtnIdle: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
  },
  recordBtnActive: {
    backgroundColor: "#c0392b",
    shadowColor: "#c0392b",
    shadowOpacity: 0.55,
  },
  recordBtnPressed: {
    transform: [{ scale: 0.93 }],
  },

  // Stop + Save buttons
  actionRow: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "center",
  },
  actionBtnSecondary: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: radius.md,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  actionBtnSecondaryText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "600",
  },
  actionBtnSave: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: radius.md,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  actionBtnSaveText: {
    color: "#0d1020",
    fontSize: 14,
    fontWeight: "700",
  },

  // Settings card
  settingsCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  settingsTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  settingsMeta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: -6,
  },
  settingsList: {
    gap: spacing.sm,
  },
  settingRow: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md,
  },
  settingRowLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.md,
  },
  settingIconBox: {
    alignItems: "center",
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  settingCopy: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  settingDesc: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },

  // Metadata card
  metaList: {
    gap: 2,
  },
  metaRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  metaLabel: {
    color: colors.muted,
    fontSize: 13,
  },
  metaValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "500",
  },
});
