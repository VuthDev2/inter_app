
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
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
import { useTranslation } from "../i18n/I18nContext";

const RECORD_CATEGORIES = [
  {
    color: "#8E7CF6",
    description: "Capture lectures, lessons, and study notes",
    icon: "school-outline" as const,
    templateId: "lecture",
    title: "School",
  },
  {
    color: "#39A8F5",
    description: "Record meetings, ideas, and work discussions",
    icon: "briefcase-outline" as const,
    templateId: "meeting",
    title: "Work",
  },
  {
    color: "#FF8A68",
    description: "Save personal thoughts and voice notes",
    icon: "person-outline" as const,
    templateId: "voice-note",
    title: "Personal",
  },
] as const;
const CUSTOM_CATEGORIES_KEY = "quickvoice.customRecordCategories";
const CATEGORY_ICON_OPTIONS: Array<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}> = [
  { icon: "folder-outline", label: "Folder" },
  { icon: "school-outline", label: "School" },
  { icon: "briefcase-outline", label: "Work" },
  { icon: "person-outline", label: "Personal" },
  { icon: "book-outline", label: "Study" },
  { icon: "bulb-outline", label: "Ideas" },
  { icon: "fitness-outline", label: "Health" },
  { icon: "musical-notes-outline", label: "Music" },
];
type RecordCategory = {
  color: string;
  description?: string;
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
  const { t } = useTranslation();
  const { appearance_mode: appearanceMode } = usePreferences();
  const systemScheme = useColorScheme();
  const dark = appearanceMode === "dark" || (appearanceMode === "system" && systemScheme === "dark");
  const [activeTemplate, setActiveTemplate] = useState<RecordingTemplate | null>(null);
  const [recent, setRecent] = useState<SavedRecordingSession[]>([]);
  const [customCategories, setCustomCategories] = useState<RecordCategory[]>([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryIcon, setCategoryIcon] = useState<keyof typeof Ionicons.glyphMap>("folder-outline");
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
      Alert.alert(t("record.categoryExists"), t("record.categoryExistsMessage", { name: title }));
      return;
    }
    const next = [
      ...customCategories,
      { color: "#007AFF", icon: categoryIcon, templateId: "voice-note", title },
    ];
    setCustomCategories(next);
    void appStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(next));
    setCategoryName("");
    setCategoryIcon("folder-outline");
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
    <View style={[rs.page, dark && rs.pageDark]}>

      <View style={rs.sectionHeader}>
        <Text style={[rs.sectionTitle, dark && rs.sectionTitleDark]}>{t("record.categories")}</Text>
        <Pressable
          accessibilityLabel={t("record.addCategory")}
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
          const builtInIndex = RECORD_CATEGORIES.indexOf(category as typeof RECORD_CATEGORIES[number]);
          const title = builtInIndex === 0 ? t("record.categorySchool") : builtInIndex === 1 ? t("record.categoryWork") : builtInIndex === 2 ? t("record.categoryPersonal") : category.title;
          const description = builtInIndex === 0 ? t("record.categorySchoolDescription") : builtInIndex === 1 ? t("record.categoryWorkDescription") : builtInIndex === 2 ? t("record.categoryPersonalDescription") : category.description ?? t("record.customDescription", { name: title });
          const selected: RecordingTemplate = { ...base, title };
          return (
            <Pressable key={category.title} onPress={() => {
              setActiveTemplate(selected);
              onSessionChange?.(true);
            }} style={({ pressed }) => [rs.categoryCard, dark && rs.categoryCardDark, pressed && rs.pressed]}>
              <View style={[rs.categoryIcon, { backgroundColor: `${category.color}18` }]}><Ionicons name={category.icon} size={23} color={category.color} /></View>
              <View style={atoms.flex1}>
                <Text style={[rs.categoryTitle, dark && rs.categoryTitleDark]}>{title}</Text>
                <Text style={[rs.categoryMeta, dark && rs.categoryMetaDark]}>
                  {description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={dark ? "#7F8794" : "#A4AAB3"} />
            </Pressable>
          );
        })}
      </View>

      <Modal animationType="fade" onRequestClose={() => setCategoryDialogOpen(false)} transparent visible={categoryDialogOpen}>
        <View style={rs.categoryDialogScreen}>
          <Pressable onPress={() => setCategoryDialogOpen(false)} style={StyleSheet.absoluteFill} />
          <View style={[rs.categoryDialog, dark && rs.categoryDialogDark]}>
            <Text style={[rs.categoryDialogTitle, dark && rs.categoryDialogTitleDark]}>{t("record.newCategory")}</Text>
            <View style={rs.categoryEditorRow}>
              <AnchoredMenu
                dark={dark}
                items={CATEGORY_ICON_OPTIONS.map((option) => ({
                  icon: option.icon,
                  key: option.icon,
                  label: t(`record.symbols.${option.icon === "folder-outline" ? "folder" : option.icon === "school-outline" ? "school" : option.icon === "briefcase-outline" ? "work" : option.icon === "person-outline" ? "personal" : option.icon === "book-outline" ? "study" : option.icon === "bulb-outline" ? "ideas" : option.icon === "fitness-outline" ? "health" : "music"}`),
                  onPress: () => setCategoryIcon(option.icon),
                  selected: categoryIcon === option.icon,
                }))}
                maxVisibleItems={3}
                width={210}
              >
                {(open) => (
                  <Pressable
                    accessibilityLabel={t("record.chooseSymbol")}
                    accessibilityRole="button"
                    onPress={open}
                    style={[rs.categoryIconPicker, dark && rs.categoryIconPickerDark]}
                  >
                    <Ionicons name={categoryIcon} size={24} color="#007AFF" />
                    <Ionicons name="chevron-down" size={12} color={dark ? "#9CA4B0" : "#78818D"} />
                  </Pressable>
                )}
              </AnchoredMenu>
              <TextInput
                autoFocus
                maxLength={30}
                onChangeText={setCategoryName}
                onSubmitEditing={addCategory}
                placeholder={t("record.categoryName")}
                placeholderTextColor={dark ? "#8F98A5" : "#9AA1AB"}
                returnKeyType="done"
                style={[rs.categoryNameInput, dark && rs.categoryNameInputDark]}
                value={categoryName}
              />
            </View>
            <View style={rs.categoryDialogActions}>
              <Pressable onPress={() => { setCategoryName(""); setCategoryIcon("folder-outline"); setCategoryDialogOpen(false); }} style={rs.categoryDialogButton}><Text style={[rs.categoryCancelText, dark && rs.categoryCancelTextDark]}>{t("common.cancel")}</Text></Pressable>
              <Pressable disabled={!categoryName.trim()} onPress={addCategory} style={[rs.categoryDialogButton, !categoryName.trim() && rs.categoryAddDisabled]}><Text style={rs.categoryAddText}>{t("common.add")}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={[rs.sectionHeader, { marginTop: 18 }]}>
        <Text style={[rs.sectionTitle, dark && rs.sectionTitleDark]}>{t("record.recent")}</Text>
        <Pressable onPress={() => setActiveTab?.("history")}><Text style={rs.seeAll}>{t("record.history")}</Text></Pressable>
      </View>
      <View style={[rs.recentCard, dark && rs.recentCardDark]}>
        {recent.length === 0 ? (
          <View style={rs.emptyRecent}><Ionicons name="mic-outline" size={25} color={dark ? "#8F98A5" : "#AAB0BA"} /><Text style={[rs.emptyRecentText, dark && rs.emptyRecentTextDark]}>{t("record.latestEmpty")}</Text></View>
        ) : recent.map((item, index) => (
          <Pressable key={item.id} onPress={() => setActiveTab?.("history")} style={({ pressed }) => [rs.recentRow, index < recent.length - 1 && rs.recentBorder, index < recent.length - 1 && dark && rs.recentBorderDark, pressed && rs.pressed]}>
              <View style={[rs.recentIcon, dark && rs.recentIconDark]}><Ionicons name="pulse-outline" size={17} color="#007AFF" /></View>
            <View style={atoms.flex1}><Text numberOfLines={1} style={[rs.recentTitle, dark && rs.recentTitleDark]}>{item.title}</Text><Text style={[rs.recentMeta, dark && rs.recentMetaDark]}>{new Date(item.createdAt).toLocaleDateString()} · {item.recordingType}</Text></View>
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
  const { t } = useTranslation();
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
        <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>{t("record.useTemplate")}</Text>
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
  const { t } = useTranslation();
  const { height: screenHeight } = useWindowDimensions();
  const { appearance_mode: appearanceMode, preferred_source_lang, preferred_target_lang, update: updatePrefs } = usePreferences();
  const systemScheme = useColorScheme();
  const dark = appearanceMode === "dark" || (appearanceMode === "system" && systemScheme === "dark");
  const [sourceLang, setSourceLang] = useState<LanguageCode>(preferred_source_lang);
  const [targetLang, setTargetLang] = useState<LanguageCode>(preferred_target_lang);
  const interp = useLiveInterpretation(sourceLang, targetLang);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sourceLabel = t(sourceLang === "ja" ? "common.japanese" : "common.english");
  const targetLabel = t(targetLang === "ja" ? "common.japanese" : "common.english");
  const dropdownIconColor = dark ? "#A6AEBA" : "#66707D";
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
      transcript: transcriptText || t("record.noTranscript"),
      sourceAudio: template.sourceAudio,
      status: "saved" as const,
      createdAt: new Date().toISOString(),
    };
    await saveRecordingSession(session);
    Alert.alert(t("common.saved"), t("record.savedMessage", { name: template.title }), [
      { text: t("common.ok"), onPress: onBack },
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
      <ScrollView scrollEnabled={false} style={[atoms.bgBackground, dark && rs.sessionBackgroundDark]} contentContainerStyle={rs.sessionContent} showsVerticalScrollIndicator={false}>
        <View style={rs.sessionHeader}>
          <View style={atoms.flex1}><Text style={[rs.sessionCategory, dark && rs.sessionCategoryDark]}>{template.title.toUpperCase()}</Text></View>
          <View style={[rs.timerPill, dark && rs.timerPillDark]}><View style={[rs.statusDot, interp.isListening && rs.statusDotLive]} /><Text style={[rs.timerText, dark && rs.timerTextDark]}>{formatTime(elapsed)}</Text></View>
        </View>

        {interp.error ? <View style={[rs.errorCard, dark && rs.errorCardDark]}><Ionicons name="alert-circle-outline" size={19} color={dark ? "#FF8A82" : "#C63B32"} /><Text style={[rs.errorText, dark && rs.errorTextDark]}>{interp.error}</Text></View> : null}

        <View style={[rs.speechCard, dark && rs.speechCardDark, { minHeight: speechCardHeight }]}>
          <Text style={[rs.cardLabel, dark && rs.cardLabelDark]}>{sourceLabel}</Text>
          <Text style={[rs.speechText, dark && rs.speechTextDark, !interp.interimText && interp.entries.length === 0 && rs.placeholderText, !interp.interimText && interp.entries.length === 0 && dark && rs.placeholderTextDark]}>
            {interp.interimText || interp.entries[interp.entries.length - 1]?.original || (interp.isListening ? t("record.listening") : t("record.originalPlaceholder"))}
          </Text>
        </View>

        <View style={rs.languageBar}>
          <AnchoredMenu
            containerStyle={rs.languageMenuAnchor}
            items={languages.filter((language) => language.code === "en" || language.code === "ja").map((language) => ({ key: language.code, label: t(language.code === "ja" ? "common.japanese" : "common.english"), selected: language.code === sourceLang, onPress: () => selectLanguage("source", language.code) }))}
            width={180}
          >
            {(open) => <Pressable disabled={interp.isListening} onPress={open} style={[rs.languagePill, dark && rs.languagePillDark]}><Text numberOfLines={1} style={[rs.languageText, dark && rs.languageTextDark]}>{sourceLabel}</Text><Ionicons name="chevron-down" size={13} color={dropdownIconColor} /></Pressable>}
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
            <Pressable onPress={toggleMic} style={({ pressed }) => [rs.micButton, interp.entries.length > 0 && rs.micButtonSmall, pressed && rs.pressed]} accessibilityLabel={t("record.startListening")}><Ionicons name="mic" size={interp.entries.length > 0 ? 22 : 29} color="#FFFFFF" /></Pressable>
          )}
          <AnchoredMenu
            containerStyle={rs.languageMenuAnchor}
            items={languages.filter((language) => language.code === "en" || language.code === "ja").map((language) => ({ key: language.code, label: t(language.code === "ja" ? "common.japanese" : "common.english"), selected: language.code === targetLang, onPress: () => selectLanguage("target", language.code) }))}
            width={180}
          >
            {(open) => <Pressable disabled={interp.isListening} onPress={open} style={[rs.languagePill, dark && rs.languagePillDark]}><Text numberOfLines={1} style={[rs.languageText, dark && rs.languageTextDark]}>{targetLabel}</Text><Ionicons name="chevron-down" size={13} color={dropdownIconColor} /></Pressable>}
          </AnchoredMenu>
        </View>
        {interp.isListening ? <Pressable onPress={handleStop} style={rs.stopListening}><View style={rs.stopSquare} /><Text style={[rs.stopText, dark && rs.stopTextDark]}>{t("record.listeningStop")}</Text></Pressable> : null}

        <View style={[rs.translationCard, dark && rs.translationCardDark, { minHeight: translationCardHeight }]}>
          <Text style={[rs.cardLabel, dark && rs.cardLabelDark]}>{targetLabel}</Text>
          <Text style={[rs.translationText, dark && rs.translationTextDark, !interp.liveTranslation && interp.entries.length === 0 && rs.placeholderText, !interp.liveTranslation && interp.entries.length === 0 && dark && rs.placeholderTextDark]}>
            {interp.liveTranslation || interp.entries[interp.entries.length - 1]?.translation || t("record.translationPlaceholder")}
          </Text>
        </View>

        {interp.entries.length > 0 ? (
          <Pressable onPress={handleSave} style={({ pressed }) => [rs.saveButton, pressed && rs.pressed]}><Ionicons name="checkmark-circle" size={20} color="#FFFFFF" /><Text style={rs.saveText}>{t("record.saveTo", { name: template.title })}</Text></Pressable>
        ) : null}

      </ScrollView>

    </>
  );
}

const rs = StyleSheet.create({
  cardLabel: { color: "#69727F", fontSize: 12, fontWeight: "700", letterSpacing: 0.7, marginBottom: 14, textTransform: "uppercase" },
  cardLabelDark: { color: "#9CA4B0" },
  categoryCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 18, flexDirection: "row", gap: 14, minHeight: 76, paddingHorizontal: 16, paddingVertical: 13, shadowColor: "#162034", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.06, shadowRadius: 15, elevation: 2 },
  categoryCardDark: { backgroundColor: "#25292F", borderColor: "#3A4049", borderWidth: StyleSheet.hairlineWidth, shadowOpacity: 0 },
  categoryIcon: { alignItems: "center", borderRadius: 14, height: 48, justifyContent: "center", width: 48 },
  categoryList: { gap: 11 },
  categoryMeta: { color: "#8A929E", fontSize: 12, marginTop: 3 },
  categoryMetaDark: { color: "#9CA4B0" },
  categoryTitle: { color: "#11141A", fontSize: 17, fontWeight: "600" },
  categoryTitleDark: { color: "#F5F7FA" },
  categoryAddDisabled: { opacity: 0.35 },
  categoryAddText: { color: "#007AFF", fontSize: 15, fontWeight: "700" },
  categoryCancelText: { color: "#66707D", fontSize: 15, fontWeight: "600" },
  categoryCancelTextDark: { color: "#A6AEBA" },
  categoryDialog: { backgroundColor: "#FFFFFF", borderColor: "#DDE1E7", borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 18, shadowColor: "#111827", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 28, width: "82%" },
  categoryDialogDark: { backgroundColor: "#25292F", borderColor: "#3A4049" },
  categoryDialogActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 16 },
  categoryDialogButton: { alignItems: "center", justifyContent: "center", minHeight: 40, minWidth: 72, paddingHorizontal: 10 },
  categoryDialogScreen: { alignItems: "center", backgroundColor: "rgba(20,25,35,0.12)", flex: 1, justifyContent: "center" },
  categoryDialogTitle: { color: "#171A20", fontSize: 18, fontWeight: "700", marginBottom: 14 },
  categoryDialogTitleDark: { color: "#F5F7FA" },
  categoryEditorRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  categoryIconPicker: { alignItems: "center", backgroundColor: "#F4F6F8", borderColor: "#D8DDE4", borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 5, height: 48, justifyContent: "center", width: 68 },
  categoryIconPickerDark: { backgroundColor: "#1D2128", borderColor: "#3A4049" },
  categoryNameInput: { backgroundColor: "#F4F6F8", borderColor: "#D8DDE4", borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, color: "#171A20", flex: 1, fontSize: 16, minHeight: 48, paddingHorizontal: 14 },
  categoryNameInputDark: { backgroundColor: "#1D2128", borderColor: "#3A4049", color: "#F5F7FA" },
  addCategoryButton: { alignItems: "center", justifyContent: "center" },
  addCategoryPressed: { opacity: 0.45 },
  emptyRecent: { alignItems: "center", gap: 9, paddingVertical: 25 },
  emptyRecentText: { color: "#8A929E", fontSize: 13 },
  emptyRecentTextDark: { color: "#9CA4B0" },
  errorCard: { alignItems: "center", backgroundColor: "#FFF0EF", borderRadius: 14, flexDirection: "row", gap: 9, padding: 13 },
  errorCardDark: { backgroundColor: "#3A2325", borderColor: "#6E3A3C", borderWidth: StyleSheet.hairlineWidth },
  errorText: { color: "#A5322B", flex: 1, fontSize: 13 },
  errorTextDark: { color: "#F3B9B4" },
  eyebrow: { color: "#007AFF", fontSize: 11, fontWeight: "700", letterSpacing: 1.3 },
  languageBar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
  languageMenuAnchor: { width: "30%" },
  languagePill: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#D7DBE1", borderRadius: 17, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 5, height: 48, justifyContent: "center", paddingHorizontal: 10, shadowColor: "#1B2638", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, width: "100%" },
  languagePillDark: { backgroundColor: "#25292F", borderColor: "#3A4049", shadowOpacity: 0 },
  languageText: { color: "#20242B", flexShrink: 1, fontSize: 13, fontWeight: "600", textAlign: "center" },
  languageTextDark: { color: "#E8EDF5" },
  micButton: { alignItems: "center", backgroundColor: "#007AFF", borderRadius: 999, height: 66, justifyContent: "center", shadowColor: "#007AFF", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.26, shadowRadius: 16, width: 66 },
  micButtonSmall: { height: 50, width: 50 },
  page: { paddingBottom: 12 },
  pageDark: { backgroundColor: "#0E1013" },
  pageHeading: { gap: 6, paddingTop: 8 },
  pageSubtitle: { color: "#76808D", fontSize: 14, lineHeight: 20 },
  pageTitle: { color: "#0E1117", fontSize: 34, fontWeight: "700", letterSpacing: -0.8 },
  placeholderText: { color: "#A0A7B2", fontWeight: "500" },
  placeholderTextDark: { color: "#8F98A5" },
  pressed: { opacity: 0.65, transform: [{ scale: 0.985 }] },
  recentBorder: { borderBottomColor: "#EBEDF1", borderBottomWidth: 1 },
  recentBorderDark: { borderBottomColor: "#3A4049" },
  recentCard: { backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden", paddingHorizontal: 15, shadowColor: "#162034", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 16 },
  recentCardDark: { backgroundColor: "#25292F", borderColor: "#3A4049", borderWidth: StyleSheet.hairlineWidth, shadowOpacity: 0 },
  recentIcon: { alignItems: "center", backgroundColor: "#EAF3FF", borderRadius: 11, height: 38, justifyContent: "center", width: 38 },
  recentIconDark: { backgroundColor: "#1D3550" },
  recentMeta: { color: "#8A929E", fontSize: 11, marginTop: 3, textTransform: "capitalize" },
  recentMetaDark: { color: "#9CA4B0" },
  recentRow: { alignItems: "center", flexDirection: "row", gap: 11, minHeight: 68, paddingVertical: 10 },
  recentTitle: { color: "#171A20", fontSize: 14, fontWeight: "600" },
  recentTitleDark: { color: "#F5F7FA" },
  saveButton: { alignItems: "center", backgroundColor: "#007AFF", borderRadius: 16, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 54 },
  saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 12, marginTop: 14 },
  sectionTitle: { color: "#11141A", fontSize: 19, fontWeight: "700", letterSpacing: -0.3 },
  sectionTitleDark: { color: "#F5F7FA" },
  seeAll: { color: "#007AFF", fontSize: 13, fontWeight: "600" },
  sessionCategory: { color: "#007AFF", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  sessionCategoryDark: { color: "#85C3FF" },
  sessionBackgroundDark: { backgroundColor: "#0E1013" },
  sessionContent: { gap: 16, paddingBottom: 16, paddingHorizontal: 2, paddingTop: 4 },
  sessionHeader: { alignItems: "center", flexDirection: "row", gap: 12 },
  speechCard: { backgroundColor: "#FFFFFF", borderRadius: 22, minHeight: 190, padding: 19, shadowColor: "#172136", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.07, shadowRadius: 19 },
  speechCardDark: { backgroundColor: "#25292F", borderColor: "#3A4049", borderWidth: StyleSheet.hairlineWidth, shadowOpacity: 0 },
  speechText: { color: "#171A20", fontSize: 19, lineHeight: 29 },
  speechTextDark: { color: "#F5F7FA" },
  statusDot: { backgroundColor: "#34C759", borderRadius: 99, height: 7, width: 7 },
  statusDotLive: { backgroundColor: "#FF3B30" },
  stopListening: { alignItems: "center", alignSelf: "center", flexDirection: "row", gap: 7, marginTop: -7, padding: 6 },
  stopSquare: { backgroundColor: "#FF3B30", borderRadius: 2, height: 9, width: 9 },
  stopText: { color: "#707986", fontSize: 12, fontWeight: "600" },
  stopTextDark: { color: "#9CA4B0" },
  timerPill: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 999, flexDirection: "row", gap: 6, paddingHorizontal: 11, paddingVertical: 8 },
  timerPillDark: { backgroundColor: "#25292F", borderColor: "#3A4049", borderWidth: StyleSheet.hairlineWidth },
  timerText: { color: "#4F5763", fontSize: 12, fontVariant: ["tabular-nums"], fontWeight: "600" },
  timerTextDark: { color: "#D0D6E0" },
  translationCard: { backgroundColor: "#FFFFFF", borderRadius: 22, minHeight: 170, padding: 19, shadowColor: "#172136", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.07, shadowRadius: 19 },
  translationCardDark: { backgroundColor: "#25292F", borderColor: "#3A4049", borderWidth: StyleSheet.hairlineWidth, shadowOpacity: 0 },
  translationText: { color: "#007AFF", fontSize: 19, fontWeight: "500", lineHeight: 29 },
  translationTextDark: { color: "#85C3FF" },
  waveBar: { backgroundColor: "#007AFF", borderRadius: 99, width: 3 },
  waveform: { alignItems: "center", flexDirection: "row", gap: 3, height: 54, justifyContent: "center", width: 112 },
});
