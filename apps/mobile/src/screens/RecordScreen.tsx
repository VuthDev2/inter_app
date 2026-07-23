
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { AnchoredMenu } from "../components/AnchoredMenu";
import { atoms } from "../theme/atoms";
import { languages, recordingTemplates } from "../constants/data";
import type { LanguageCode, RecordingTemplate, SavedRecordingSession } from "../constants/data";
import { loadSavedRecordingSessions, saveRecordingSession } from "../services/storage";
import { appStorage } from "../services/nativeStorage";
import { colors, spacing } from "../theme/theme";
import { useLiveInterpretation } from "../hooks/useLiveInterpretation";
import { usePreferences } from "../features/preferences/context";

const RECORD_CATEGORIES = [
  { color: "#8E7CF6", icon: "school-outline" as const, templateId: "lecture", title: "School" },
  { color: "#39A8F5", icon: "briefcase-outline" as const, templateId: "meeting", title: "Work" },
  { color: "#FF8A68", icon: "person-outline" as const, templateId: "voice-note", title: "Personal" },
] as const;
const CUSTOM_CATEGORIES_KEY = "quickvoice.customRecordCategories";
type RecordCategory = {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  templateId: string;
  title: string;
};
type ViewMode = "grid" | "list";

// ─── Template Picker ──────────────────────────────────────────────────────────
export function RecordScreen({
  setActiveTab,
  onSessionChange,
  backRequest = 0,
}: {
  setActiveTab?: (tab: "history") => void;
  onSessionChange?: (active: boolean) => void;
  backRequest?: number;
}) {
  const [activeTemplate, setActiveTemplate] = useState<RecordingTemplate | null>(null);
  const [recent, setRecent] = useState<SavedRecordingSession[]>([]);
  const [customCategories, setCustomCategories] = useState<RecordCategory[]>([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const lastBackRequestRef = useRef(backRequest);

  useEffect(() => () => onSessionChange?.(false), [onSessionChange]);

  const loadRecent = useCallback(() => {
    loadSavedRecordingSessions().then((items) => setRecent(items.slice(0, 3)));
  }, []);

  useEffect(loadRecent, [loadRecent]);

  useEffect(() => {
    appStorage.getItem(CUSTOM_CATEGORIES_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCustomCategories(parsed);
      } catch {
        // Ignore invalid local category data.
      }
    });
  }, []);

  const addCategory = () => {
    const title = categoryName.trim();
    if (!title) return;
    const existingNames = [...RECORD_CATEGORIES, ...customCategories].map((category) => category.title.toLowerCase());
    if (existingNames.includes(title.toLowerCase())) {
      Alert.alert("Category already exists", `A category named “${title}” already exists.`);
      return;
    }
    const next = [
      ...customCategories,
      { color: "#007AFF", icon: "folder-outline" as const, templateId: "voice-note", title },
    ];
    setCustomCategories(next);
    void appStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(next));
    setCategoryName("");
    setCategoryDialogOpen(false);
  };

  useEffect(() => {
    if (lastBackRequestRef.current === backRequest) return;
    lastBackRequestRef.current = backRequest;
    if (!activeTemplate) return;
    setActiveTemplate(null);
    onSessionChange?.(false);
    loadRecent();
  }, [activeTemplate, backRequest, loadRecent, onSessionChange]);

  if (activeTemplate) {
    return (
      <RecordingSessionScreen
        template={activeTemplate}
        onBack={() => {
          setActiveTemplate(null);
          onSessionChange?.(false);
          loadRecent();
        }}
      />
    );
  }

  return (
    <View style={rs.page}>
      <Text style={rs.pageSubtitle}>Choose where this recording belongs.</Text>

      <View style={rs.sectionHeader}>
        <Text style={rs.sectionTitle}>Categories</Text>
        <Pressable
          accessibilityLabel="Add category"
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => setCategoryDialogOpen(true)}
          style={({ pressed }) => [rs.addCategoryButton, pressed && rs.addCategoryPressed]}
        >
          <Ionicons name="add" size={28} color="#007AFF" />
        </Pressable>
      </View>
      <View style={rs.categoryList}>
        {[...RECORD_CATEGORIES, ...customCategories].map((category) => {
          const base = recordingTemplates.find((item) => item.id === category.templateId)!;
          const selected: RecordingTemplate = { ...base, title: category.title };
          return (
            <Pressable key={category.title} onPress={() => {
              setActiveTemplate(selected);
              onSessionChange?.(true);
            }} style={({ pressed }) => [rs.categoryCard, pressed && rs.pressed]}>
              <View style={[rs.categoryIcon, { backgroundColor: `${category.color}18` }]}><Ionicons name={category.icon} size={23} color={category.color} /></View>
              <View style={atoms.flex1}>
                <Text style={rs.categoryTitle}>{category.title}</Text>
                <Text style={rs.categoryMeta}>Tap to start a new recording</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#A4AAB3" />
            </Pressable>
          );
        })}
      </View>

      <Modal animationType="fade" onRequestClose={() => setCategoryDialogOpen(false)} transparent visible={categoryDialogOpen}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={rs.categoryDialogScreen}>
          <Pressable onPress={() => setCategoryDialogOpen(false)} style={StyleSheet.absoluteFill} />
          <View style={rs.categoryDialog}>
            <Text style={rs.categoryDialogTitle}>New Category</Text>
            <TextInput
              autoFocus
              maxLength={30}
              onChangeText={setCategoryName}
              onSubmitEditing={addCategory}
              placeholder="Category name"
              placeholderTextColor="#9AA1AB"
              returnKeyType="done"
              style={rs.categoryNameInput}
              value={categoryName}
            />
            <View style={rs.categoryDialogActions}>
              <Pressable onPress={() => { setCategoryName(""); setCategoryDialogOpen(false); }} style={rs.categoryDialogButton}><Text style={rs.categoryCancelText}>Cancel</Text></Pressable>
              <Pressable disabled={!categoryName.trim()} onPress={addCategory} style={[rs.categoryDialogButton, !categoryName.trim() && rs.categoryAddDisabled]}><Text style={rs.categoryAddText}>Add</Text></Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <View style={[rs.sectionHeader, { marginTop: 28 }]}>
        <Text style={rs.sectionTitle}>Recently Recorded</Text>
        <Pressable onPress={() => setActiveTab?.("history")}><Text style={rs.seeAll}>History</Text></Pressable>
      </View>
      <View style={rs.recentCard}>
        {recent.length === 0 ? (
          <View style={rs.emptyRecent}><Ionicons name="mic-outline" size={25} color="#AAB0BA" /><Text style={rs.emptyRecentText}>Your latest recordings will appear here.</Text></View>
        ) : recent.map((item, index) => (
          <Pressable key={item.id} onPress={() => setActiveTab?.("history")} style={({ pressed }) => [rs.recentRow, index < recent.length - 1 && rs.recentBorder, pressed && rs.pressed]}>
              <View style={rs.recentIcon}><Ionicons name="pulse-outline" size={17} color="#007AFF" /></View>
            <View style={atoms.flex1}><Text numberOfLines={1} style={rs.recentTitle}>{item.title}</Text><Text style={rs.recentMeta}>{new Date(item.createdAt).toLocaleDateString()} · {item.recordingType}</Text></View>
            <Ionicons name="play-circle" size={27} color="#007AFF" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────
function TemplateCard({
  template,
  viewMode,
  onPress,
}: {
  template: RecordingTemplate;
  viewMode: ViewMode;
  onPress: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  if (viewMode === "list") {
    return (
      <Pressable
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onPress={onPress}
        accessibilityRole="button"
        style={[atoms.flexRow, atoms.itemsCenter, {
          backgroundColor: colors.surface, borderColor: pressed ? colors.primary + "80" : colors.border,
          borderRadius: 10, borderWidth: 1,
          gap: 12, padding: spacing.md,
        }, pressed && { backgroundColor: colors.secondary }]}
      >
        <View style={[{ alignItems: "center", backgroundColor: colors.secondary, borderRadius: 6, height: 36, justifyContent: "center", width: 36 }, pressed && { backgroundColor: colors.primary }]}>
          <Ionicons name={template.icon as any} size={18} color={pressed ? "#fff" : colors.muted} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>{template.title}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 16 }} numberOfLines={1}>{template.description}</Text>
        </View>
        <Ionicons name="arrow-forward" size={14} color={colors.muted} />
      </Pressable>
    );
  }

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
  const { height: screenHeight } = useWindowDimensions();
  const { preferred_source_lang, preferred_target_lang, update: updatePrefs } = usePreferences();
  const [sourceLang, setSourceLang] = useState<LanguageCode>(preferred_source_lang);
  const [targetLang, setTargetLang] = useState<LanguageCode>(preferred_target_lang);
  const interp = useLiveInterpretation(sourceLang, targetLang);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sourceLabel = languages.find((item) => item.code === sourceLang)?.label ?? sourceLang;
  const targetLabel = languages.find((item) => item.code === targetLang)?.label ?? targetLang;
  const speechCardHeight = screenHeight >= 880 ? 224 : screenHeight >= 760 ? 208 : 188;
  const translationCardHeight = screenHeight >= 880 ? 204 : screenHeight >= 760 ? 190 : 172;

  const selectLanguage = (side: "source" | "target", code: LanguageCode) => {
    if (side === "source") {
      setSourceLang(code);
      updatePrefs({ preferred_source_lang: code });
      if (code === targetLang) {
        const fallback = code === "en" ? "ja" : "en";
        setTargetLang(fallback);
        updatePrefs({ preferred_target_lang: fallback });
      }
    } else {
      setTargetLang(code);
      updatePrefs({ preferred_target_lang: code });
      if (code === sourceLang) {
        const fallback = code === "en" ? "ja" : "en";
        setSourceLang(fallback);
        updatePrefs({ preferred_source_lang: fallback });
      }
    }
  };

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
      sourceAudio: template.sourceAudio,
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
    <>
      <ScrollView scrollEnabled={false} style={atoms.bgBackground} contentContainerStyle={rs.sessionContent} showsVerticalScrollIndicator={false}>
        <View style={rs.sessionHeader}>
          <View style={atoms.flex1}><Text style={rs.sessionCategory}>{template.title.toUpperCase()}</Text></View>
          <View style={rs.timerPill}><View style={[rs.statusDot, interp.isListening && rs.statusDotLive]} /><Text style={rs.timerText}>{formatTime(elapsed)}</Text></View>
        </View>

        {interp.error ? <View style={rs.errorCard}><Ionicons name="alert-circle-outline" size={19} color="#C63B32" /><Text style={rs.errorText}>{interp.error}</Text></View> : null}

        <View style={[rs.speechCard, { minHeight: speechCardHeight }]}>
          <Text style={rs.cardLabel}>{sourceLabel}</Text>
          <Text style={[rs.speechText, !interp.interimText && interp.entries.length === 0 && rs.placeholderText]}>
            {interp.interimText || interp.entries[interp.entries.length - 1]?.original || (interp.isListening ? "Listening…" : "Your original speech will appear here.")}
          </Text>
        </View>

        <View style={rs.languageBar}>
          <AnchoredMenu
            containerStyle={rs.languageMenuAnchor}
            items={languages.filter((language) => language.code === "en" || language.code === "ja").map((language) => ({ key: language.code, label: language.label, selected: language.code === sourceLang, onPress: () => selectLanguage("source", language.code) }))}
            width={180}
          >
            {(open) => <Pressable disabled={interp.isListening} onPress={open} style={rs.languagePill}><Text numberOfLines={1} style={rs.languageText}>{sourceLabel}</Text><Ionicons name="chevron-down" size={13} color="#66707D" /></Pressable>}
          </AnchoredMenu>
          {interp.isListening ? (
            <View style={rs.waveform}>
              {Array.from({ length: 15 }, (_, i) => {
                const levels = [12, 24, 17, 33, 20, 40, 27, 44, 25, 37, 18, 31, 15, 26, 11];
                const volume = Math.max(0.32, Math.min(1, (interp.volume + 50) / 50));
                return <View key={i} style={[rs.waveBar, { height: Math.max(5, levels[i] * volume) }]} />;
              })}
            </View>
          ) : (
            <Pressable onPress={toggleMic} style={({ pressed }) => [rs.micButton, interp.entries.length > 0 && rs.micButtonSmall, pressed && rs.pressed]} accessibilityLabel="Start listening"><Ionicons name="mic" size={interp.entries.length > 0 ? 22 : 29} color="#FFFFFF" /></Pressable>
          )}
          <AnchoredMenu
            containerStyle={rs.languageMenuAnchor}
            items={languages.filter((language) => language.code === "en" || language.code === "ja").map((language) => ({ key: language.code, label: language.label, selected: language.code === targetLang, onPress: () => selectLanguage("target", language.code) }))}
            width={180}
          >
            {(open) => <Pressable disabled={interp.isListening} onPress={open} style={rs.languagePill}><Text numberOfLines={1} style={rs.languageText}>{targetLabel}</Text><Ionicons name="chevron-down" size={13} color="#66707D" /></Pressable>}
          </AnchoredMenu>
        </View>
        {interp.isListening ? <Pressable onPress={handleStop} style={rs.stopListening}><View style={rs.stopSquare} /><Text style={rs.stopText}>Listening… tap to stop</Text></Pressable> : null}

        <View style={[rs.translationCard, { minHeight: translationCardHeight }]}>
          <Text style={rs.cardLabel}>{targetLabel}</Text>
          <Text style={[rs.translationText, !interp.liveTranslation && interp.entries.length === 0 && rs.placeholderText]}>
            {interp.liveTranslation || interp.entries[interp.entries.length - 1]?.translation || "Translation will appear here."}
          </Text>
        </View>

        {interp.entries.length > 0 ? (
          <Pressable onPress={handleSave} style={({ pressed }) => [rs.saveButton, pressed && rs.pressed]}><Ionicons name="checkmark-circle" size={20} color="#FFFFFF" /><Text style={rs.saveText}>Save to {template.title}</Text></Pressable>
        ) : null}

      </ScrollView>

    </>
  );
}

const rs = StyleSheet.create({
  cardLabel: { color: "#69727F", fontSize: 12, fontWeight: "700", letterSpacing: 0.7, marginBottom: 14, textTransform: "uppercase" },
  categoryCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 18, flexDirection: "row", gap: 14, minHeight: 76, paddingHorizontal: 16, paddingVertical: 13, shadowColor: "#162034", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.06, shadowRadius: 15, elevation: 2 },
  categoryIcon: { alignItems: "center", borderRadius: 14, height: 48, justifyContent: "center", width: 48 },
  categoryList: { gap: 11 },
  categoryMeta: { color: "#8A929E", fontSize: 12, marginTop: 3 },
  categoryTitle: { color: "#11141A", fontSize: 17, fontWeight: "600" },
  categoryAddDisabled: { opacity: 0.35 },
  categoryAddText: { color: "#007AFF", fontSize: 15, fontWeight: "700" },
  categoryCancelText: { color: "#66707D", fontSize: 15, fontWeight: "600" },
  categoryDialog: { backgroundColor: "#FFFFFF", borderColor: "#DDE1E7", borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 18, shadowColor: "#111827", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 28, width: "82%" },
  categoryDialogActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 16 },
  categoryDialogButton: { alignItems: "center", justifyContent: "center", minHeight: 40, minWidth: 72, paddingHorizontal: 10 },
  categoryDialogScreen: { alignItems: "center", backgroundColor: "rgba(20,25,35,0.12)", flex: 1, justifyContent: "center" },
  categoryDialogTitle: { color: "#171A20", fontSize: 18, fontWeight: "700", marginBottom: 14 },
  categoryNameInput: { backgroundColor: "#F4F6F8", borderColor: "#D8DDE4", borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, color: "#171A20", fontSize: 16, minHeight: 48, paddingHorizontal: 14 },
  addCategoryButton: { alignItems: "center", justifyContent: "center" },
  addCategoryPressed: { opacity: 0.45 },
  emptyRecent: { alignItems: "center", gap: 9, paddingVertical: 25 },
  emptyRecentText: { color: "#8A929E", fontSize: 13 },
  errorCard: { alignItems: "center", backgroundColor: "#FFF0EF", borderRadius: 14, flexDirection: "row", gap: 9, padding: 13 },
  errorText: { color: "#A5322B", flex: 1, fontSize: 13 },
  eyebrow: { color: "#007AFF", fontSize: 11, fontWeight: "700", letterSpacing: 1.3 },
  languageBar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
  languageMenuAnchor: { width: "30%" },
  languagePill: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#D7DBE1", borderRadius: 17, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 5, height: 48, justifyContent: "center", paddingHorizontal: 10, shadowColor: "#1B2638", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, width: "100%" },
  languageText: { color: "#20242B", flexShrink: 1, fontSize: 13, fontWeight: "600", textAlign: "center" },
  micButton: { alignItems: "center", backgroundColor: "#007AFF", borderRadius: 999, height: 66, justifyContent: "center", shadowColor: "#007AFF", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.26, shadowRadius: 16, width: 66 },
  micButtonSmall: { height: 50, width: 50 },
  page: { paddingBottom: 12 },
  pageHeading: { gap: 6, paddingTop: 8 },
  pageSubtitle: { color: "#76808D", fontSize: 14, lineHeight: 20 },
  pageTitle: { color: "#0E1117", fontSize: 34, fontWeight: "700", letterSpacing: -0.8 },
  placeholderText: { color: "#A0A7B2", fontWeight: "500" },
  pressed: { opacity: 0.65, transform: [{ scale: 0.985 }] },
  recentBorder: { borderBottomColor: "#EBEDF1", borderBottomWidth: 1 },
  recentCard: { backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden", paddingHorizontal: 15, shadowColor: "#162034", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 16 },
  recentIcon: { alignItems: "center", backgroundColor: "#EAF3FF", borderRadius: 11, height: 38, justifyContent: "center", width: 38 },
  recentMeta: { color: "#8A929E", fontSize: 11, marginTop: 3, textTransform: "capitalize" },
  recentRow: { alignItems: "center", flexDirection: "row", gap: 11, minHeight: 68, paddingVertical: 10 },
  recentTitle: { color: "#171A20", fontSize: 14, fontWeight: "600" },
  saveButton: { alignItems: "center", backgroundColor: "#007AFF", borderRadius: 16, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 54 },
  saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 12, marginTop: 26 },
  sectionTitle: { color: "#11141A", fontSize: 19, fontWeight: "700", letterSpacing: -0.3 },
  seeAll: { color: "#007AFF", fontSize: 13, fontWeight: "600" },
  sessionCategory: { color: "#007AFF", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  sessionContent: { gap: 16, paddingBottom: 16, paddingHorizontal: 2, paddingTop: 4 },
  sessionHeader: { alignItems: "center", flexDirection: "row", gap: 12 },
  speechCard: { backgroundColor: "#FFFFFF", borderRadius: 22, minHeight: 190, padding: 19, shadowColor: "#172136", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.07, shadowRadius: 19 },
  speechText: { color: "#171A20", fontSize: 19, lineHeight: 29 },
  statusDot: { backgroundColor: "#34C759", borderRadius: 99, height: 7, width: 7 },
  statusDotLive: { backgroundColor: "#FF3B30" },
  stopListening: { alignItems: "center", alignSelf: "center", flexDirection: "row", gap: 7, marginTop: -7, padding: 6 },
  stopSquare: { backgroundColor: "#FF3B30", borderRadius: 2, height: 9, width: 9 },
  stopText: { color: "#707986", fontSize: 12, fontWeight: "600" },
  timerPill: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 999, flexDirection: "row", gap: 6, paddingHorizontal: 11, paddingVertical: 8 },
  timerText: { color: "#4F5763", fontSize: 12, fontVariant: ["tabular-nums"], fontWeight: "600" },
  translationCard: { backgroundColor: "#FFFFFF", borderRadius: 22, minHeight: 170, padding: 19, shadowColor: "#172136", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.07, shadowRadius: 19 },
  translationText: { color: "#007AFF", fontSize: 19, fontWeight: "500", lineHeight: 29 },
  waveBar: { backgroundColor: "#007AFF", borderRadius: 99, width: 3 },
  waveform: { alignItems: "center", flexDirection: "row", gap: 3, height: 54, justifyContent: "center", width: 112 },
});
