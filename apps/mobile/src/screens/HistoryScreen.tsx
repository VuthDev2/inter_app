import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, AppState, Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";

import { type SavedRecordingSession } from "../constants/data";
import { usePreferences } from "../features/preferences/context";
import { useTranslation } from "../i18n/I18nContext";
import TTSService from "../features/live-interpreter/services/tts/TTSService";
import {
  loadLiveSessions,
  loadSavedRecordingSessions,
  type LiveSession,
} from "../services/storage";
import { supabase } from "../services/supabase";
import { colors } from "../theme/theme";

type AnyLiveSession = LiveSession;
export type HistoryKind = "conversations" | "recordings" | "extension";
type DateGroup<T> = { label: "Today" | "Yesterday" | "Last Week" | "Older"; items: T[] };

function groupByDate<T extends { createdAt: string }>(items: T[]): DateGroup<T>[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets: Record<DateGroup<T>["label"], T[]> = {
    Today: [], Yesterday: [], "Last Week": [], Older: [],
  };

  items.forEach((item) => {
    const date = new Date(item.createdAt);
    date.setHours(0, 0, 0, 0);
    const days = Math.floor((today.getTime() - date.getTime()) / 86_400_000);
    const label = days <= 0 ? "Today" : days === 1 ? "Yesterday" : days <= 7 ? "Last Week" : "Older";
    buckets[label].push(item);
  });

  return (["Today", "Yesterday", "Last Week", "Older"] as const)
    .map((label) => ({ label, items: buckets[label] }))
    .filter((group) => group.items.length > 0);
}

export function HistoryScreen({ initialKind = "conversations" }: { initialKind?: HistoryKind }) {
  const { t } = useTranslation();
  const { appearance_mode: appearanceMode, tts_speed: ttsSpeed } = usePreferences();
  const systemScheme = useColorScheme();
  const dark = appearanceMode === "dark" || (appearanceMode === "system" && systemScheme === "dark");
  const [kind, setKind] = useState<HistoryKind>(initialKind);
  const [recordings, setRecordings] = useState<SavedRecordingSession[]>([]);
  const [liveSessions, setLiveSessions] = useState<AnyLiveSession[]>([]);
  const [selected, setSelected] = useState<AnyLiveSession | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [segmentWidth, setSegmentWidth] = useState(0);
  const appStateRef = useRef(AppState.currentState);
  const detailAnim = useRef(new Animated.Value(1)).current;
  const segmentPosition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const index = kind === "conversations" ? 0 : kind === "recordings" ? 1 : 2;
    Animated.spring(segmentPosition, {
      damping: 22,
      mass: 0.75,
      stiffness: 190,
      toValue: index,
      useNativeDriver: true,
    }).start();
  }, [kind, segmentPosition]);

  const load = useCallback(async () => {
    setLoading(true);
    const [localRecs, localLive] = await Promise.all([
      loadSavedRecordingSessions(),
      loadLiveSessions(),
    ]);
    setRecordings(localRecs);
    setLiveSessions(localLive);
    setLoading(false);

    if (!supabase) return;
    try {
      const { data: { session: auth } } = await supabase.auth.getSession();
      const userId = auth?.user?.id;
      if (!userId) return;

      const { data: cloudRecs } = await supabase
        .from("recordings")
        .select("id, recording_type, title, description, transcript, source_audio, status, created_at")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (cloudRecs?.length) {
        const mapped: SavedRecordingSession[] = cloudRecs.map((recording) => ({
          id: recording.id,
          recordingType: recording.recording_type,
          title: recording.title,
          description: recording.description ?? "",
          transcript: recording.transcript ?? "",
          sourceAudio: recording.source_audio ?? false,
          status: "saved",
          createdAt: recording.created_at,
        }));
        setRecordings((current) => {
          const localIds = new Set(current.map((item) => item.id));
          return [...current, ...mapped.filter((item) => !localIds.has(item.id))]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });
      }

      const { data: cloudSessions } = await supabase
        .from("live_sessions")
        .select("id, source_lang, target_lang, status, created_at, ended_at")
        .eq("host_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (cloudSessions?.length) {
        const mapped: AnyLiveSession[] = cloudSessions.map((session) => ({
          id: session.id,
          sourceLang: session.source_lang,
          targetLang: session.target_lang,
          mode: "one-way",
          utterances: [],
          createdAt: session.created_at,
          endedAt: session.ended_at,
        }));
        setLiveSessions((current) => {
          const localIds = new Set(current.map((item) => item.id));
          return [...current, ...mapped.filter((item) => !localIds.has(item.id))]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });
      }
    } catch (error) {
      console.warn("[HistoryScreen] Cloud load failed:", error);
    }
  }, []);

  useEffect(() => {
    load();
    const subscription = AppState.addEventListener("change", (state) => {
      if (appStateRef.current.match(/inactive|background/) && state === "active") load();
      appStateRef.current = state;
    });
    return () => subscription.remove();
  }, [load]);

  const openConversation = (session: AnyLiveSession) => {
    detailAnim.setValue(0);
    setSelected(session);
    Animated.spring(detailAnim, { damping: 22, stiffness: 220, toValue: 1, useNativeDriver: true }).start();
  };

  const closeConversation = () => {
    Animated.timing(detailAnim, { duration: 160, toValue: 0, useNativeDriver: true }).start(() => {
      setSelected(null);
      setExpanded(new Set());
      detailAnim.setValue(1);
    });
  };

  if (selected) {
    return (
      <Animated.View style={[styles.detail, dark && styles.detailDark, { opacity: detailAnim, transform: [{ translateX: detailAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
        <View style={styles.detailHeader}>
          <Pressable accessibilityLabel={t("history.back")} onPress={closeConversation} style={[styles.backButton, dark && styles.backButtonDark]}><Ionicons name="chevron-back" size={20} color={dark ? "#F5F7FA" : "#171A20"} /></Pressable>
          <View style={styles.detailHeading}>
            <Text style={[styles.detailTitle, dark && styles.detailTitleDark]}>{t(selected.sourceLang === "ja" ? "common.japanese" : "common.english")} ↔ {t(selected.targetLang === "ja" ? "common.japanese" : "common.english")}</Text>
            <Text style={[styles.detailMeta, dark && styles.detailMetaDark]}>{new Date(selected.createdAt).toLocaleString()} · {t("history.messageCount", { count: selected.utterances.length })}</Text>
          </View>
        </View>
        <View style={[styles.segmented, dark && styles.segmentedDark]}>
          <View style={[styles.segment, styles.segmentActive, dark && styles.segmentActiveDark]}><Text style={[styles.segmentText, dark && styles.segmentTextDark, styles.segmentTextActive, dark && styles.segmentTextActiveDark]}>{t("history.conversation")}</Text></View>
          <View style={styles.segment}><Text style={[styles.segmentText, dark && styles.segmentTextDark]}>{t("history.voiceRecord")}</Text></View>
          <View style={styles.segment}><Text style={[styles.segmentText, dark && styles.segmentTextDark]}>{t("history.extension")}</Text></View>
        </View>

        {selected.utterances.length === 0 ? (
          <View style={[styles.emptyState, dark && styles.emptyStateDark]}><Ionicons name="chatbubbles-outline" size={28} color={dark ? "#8F98A5" : "#A3AAB5"} /><Text style={[styles.emptyTitle, dark && styles.emptyTitleDark]}>{t("history.noTranscript")}</Text><Text style={[styles.emptyCopy, dark && styles.emptyCopyDark]}>{t("history.noTranscriptMessage")}</Text></View>
        ) : selected.utterances.map((utterance, index) => {
          const isExpanded = expanded.has(utterance.id);
          const isLong = utterance.original.length + utterance.translation.length > 240;
          const isLatest = index === selected.utterances.length - 1;
          const fromJapanese = utterance.sourceLang === "ja";
          return (
            <View key={utterance.id} style={[styles.messageRow, fromJapanese && styles.messageRowReverse]}>
              <View style={[styles.messageCard, dark && styles.messageCardDark, isLatest && styles.latestCard, isLatest && dark && styles.latestCardDark]}>
                {isLatest ? <Text style={[styles.latestPill, dark && styles.latestPillDark]}>{t("history.latest").toUpperCase()}</Text> : null}
                <Text numberOfLines={isExpanded ? undefined : 4} style={[styles.originalText, dark && styles.originalTextDark, utterance.sourceLang === "ja" && styles.japaneseText]}>{utterance.original}</Text>
                <View style={[styles.divider, dark && styles.dividerDark]} />
                <Text numberOfLines={isExpanded ? undefined : 4} style={[styles.translationText, dark && styles.translationTextDark, utterance.targetLang !== "ja" && styles.englishText, utterance.targetLang !== "ja" && dark && styles.englishTextDark]}>{utterance.translation}</Text>
                {isLong ? <Pressable onPress={() => setExpanded((current) => { const next = new Set(current); next.has(utterance.id) ? next.delete(utterance.id) : next.add(utterance.id); return next; })}><Text style={styles.moreText}>{t(isExpanded ? "history.showLess" : "history.showMore")}</Text></Pressable> : null}
              </View>
              <Pressable
                accessibilityLabel={t("history.playTranslation", { language: t(utterance.targetLang === "ja" ? "common.japanese" : "common.english") })}
                onPress={() => {
                  const language = utterance.targetLang === "ja" ? "ja" : "en";
                  void TTSService.speak(utterance.translation, language, ttsSpeed);
                }}
                style={styles.playButton}
              >
                <Ionicons name="play" size={13} color="#FFFFFF" />
              </Pressable>
            </View>
          );
        })}
      </Animated.View>
    );
  }

  const groups = kind === "conversations"
    ? groupByDate(liveSessions)
    : groupByDate(kind === "recordings" ? recordings : []);

  return (
    <View style={[styles.page, dark && styles.pageDark]}>
      <View onLayout={(event) => setSegmentWidth(event.nativeEvent.layout.width)} style={[styles.segmented, dark && styles.segmentedDark]}>
        {segmentWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.segmentIndicator,
              dark && styles.segmentIndicatorDark,
              {
                width: (segmentWidth - 8) / 3,
                transform: [{ translateX: Animated.multiply(segmentPosition, (segmentWidth - 8) / 3) }],
              },
            ]}
          />
        ) : null}
        <Pressable onPress={() => setKind("conversations")} style={styles.segment}><Text style={[styles.segmentText, dark && styles.segmentTextDark, kind === "conversations" && styles.segmentTextActive, kind === "conversations" && dark && styles.segmentTextActiveDark]}>{t("history.conversations")}</Text></Pressable>
        <Pressable onPress={() => setKind("recordings")} style={styles.segment}><Text style={[styles.segmentText, dark && styles.segmentTextDark, kind === "recordings" && styles.segmentTextActive, kind === "recordings" && dark && styles.segmentTextActiveDark]}>{t("history.voiceRecords")}</Text></Pressable>
        <Pressable onPress={() => setKind("extension")} style={styles.segment}><Text style={[styles.segmentText, dark && styles.segmentTextDark, kind === "extension" && styles.segmentTextActive, kind === "extension" && dark && styles.segmentTextActiveDark]}>{t("history.extension")}</Text></Pressable>
      </View>

      {loading ? <Text style={styles.loading}>{t("history.loading")}</Text> : groups.length === 0 ? (
        <View style={[styles.emptyState, dark && styles.emptyStateDark]}><Ionicons name="time-outline" size={30} color={dark ? "#8F98A5" : "#A3AAB5"} /><Text style={[styles.emptyTitle, dark && styles.emptyTitleDark]}>{t("history.empty")}</Text><Text style={[styles.emptyCopy, dark && styles.emptyCopyDark]}>{t("history.emptyMessage")}</Text></View>
      ) : groups.map((group) => (
        <View key={group.label} style={styles.group}>
          <Text style={[styles.groupTitle, dark && styles.groupTitleDark]}>{t(group.label === "Today" ? "history.today" : group.label === "Yesterday" ? "history.yesterday" : group.label === "Last Week" ? "history.lastWeek" : "history.older")}</Text>
          <View style={[styles.groupList, dark && styles.groupListDark]}>
            {kind === "conversations" ? (group.items as AnyLiveSession[]).map((session, index) => (
              <ConversationRow dark={dark} key={session.id} session={session} divider={index < group.items.length - 1} onPress={() => openConversation(session)} />
            )) : (group.items as SavedRecordingSession[]).map((recording, index) => (
              <RecordingRow dark={dark} key={recording.id} recording={recording} divider={index < group.items.length - 1} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function ConversationRow({ dark, session, divider, onPress }: { dark: boolean; session: AnyLiveSession; divider: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const latest = session.utterances[session.utterances.length - 1];
  const sourceLanguage = t(session.sourceLang === "ja" ? "common.japanese" : "common.english");
  const targetLanguage = t(session.targetLang === "ja" ? "common.japanese" : "common.english");
  const title = latest?.original.trim() || t("history.languageConversation", { language: sourceLanguage });
  const preview = latest?.translation.trim() || t("history.transcriptUnavailable");
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.historyRow, divider && styles.rowDivider, divider && dark && styles.rowDividerDark, pressed && styles.rowPressed, pressed && dark && styles.rowPressedDark]}>
      <View style={[styles.pairIcon, dark && styles.pairIconDark]}><Ionicons name="chatbubbles-outline" size={19} color="#007AFF" /></View>
      <View style={styles.rowCopy}>
        <View style={styles.rowTop}><Text numberOfLines={1} style={[styles.rowTitle, dark && styles.rowTitleDark]}>{title}</Text><Text style={[styles.rowTime, dark && styles.rowTimeDark]}>{new Date(session.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Text></View>
        <Text style={[styles.languagePair, dark && styles.languagePairDark]}>{sourceLanguage} ↔ {targetLanguage}</Text>
        <Text numberOfLines={1} style={[styles.preview, dark && styles.previewDark]}>{preview}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={dark ? "#7F8794" : "#A2A9B3"} />
    </Pressable>
  );
}

function RecordingRow({ dark, recording, divider }: { dark: boolean; recording: SavedRecordingSession; divider: boolean }) {
  return (
    <View style={[styles.historyRow, divider && styles.rowDivider, divider && dark && styles.rowDividerDark]}>
      <View style={[styles.recordIcon, dark && styles.recordIconDark]}><Ionicons name="mic-outline" size={19} color={dark ? "#B39CFB" : "#7657DB"} /></View>
      <View style={styles.rowCopy}><View style={styles.rowTop}><Text numberOfLines={1} style={[styles.rowTitle, dark && styles.rowTitleDark]}>{recording.title}</Text><Text style={[styles.rowTime, dark && styles.rowTimeDark]}>{new Date(recording.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Text></View><Text numberOfLines={2} style={[styles.preview, dark && styles.previewDark]}>{recording.transcript}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 999, height: 40, justifyContent: "center", shadowColor: "#172033", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, width: 40 },
  backButtonDark: { backgroundColor: "#25292F", borderColor: "#3A4049", borderWidth: StyleSheet.hairlineWidth, shadowOpacity: 0 },
  detail: { gap: 13 },
  detailDark: { backgroundColor: "#0E1013" },
  detailHeader: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 4 },
  detailHeading: { flex: 1 },
  detailMeta: { color: "#7D8591", fontSize: 11, marginTop: 3 },
  detailMetaDark: { color: "#9CA4B0" },
  detailTitle: { color: "#14171C", fontSize: 18, fontWeight: "700" },
  detailTitleDark: { color: "#F5F7FA" },
  divider: { backgroundColor: "#E8EBF0", height: StyleSheet.hairlineWidth, marginVertical: 10 },
  dividerDark: { backgroundColor: "#3A4049" },
  emptyCopy: { color: "#858D99", fontSize: 13, lineHeight: 19, maxWidth: 280, textAlign: "center" },
  emptyCopyDark: { color: "#9CA4B0" },
  emptyState: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 20, gap: 8, marginTop: 24, paddingHorizontal: 24, paddingVertical: 34 },
  emptyStateDark: { backgroundColor: "#25292F", borderColor: "#3A4049", borderWidth: StyleSheet.hairlineWidth },
  emptyTitle: { color: "#282D35", fontSize: 16, fontWeight: "700" },
  emptyTitleDark: { color: "#F5F7FA" },
  group: { gap: 9 },
  groupList: { backgroundColor: "#FFFFFF", borderRadius: 19, overflow: "hidden", paddingHorizontal: 14, shadowColor: "#172033", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.055, shadowRadius: 16, elevation: 2 },
  groupListDark: { backgroundColor: "#25292F", borderColor: "#3A4049", borderWidth: StyleSheet.hairlineWidth, shadowOpacity: 0 },
  groupTitle: { color: "#171A20", fontSize: 17, fontWeight: "700", letterSpacing: -0.2, marginLeft: 3 },
  groupTitleDark: { color: "#F5F7FA" },
  historyRow: { alignItems: "center", flexDirection: "row", gap: 11, minHeight: 86, paddingVertical: 12 },
  languagePair: { color: "#007AFF", fontSize: 11, fontWeight: "600", marginTop: 3 },
  languagePairDark: { color: "#6EB4FF" },
  englishText: { color: "#171A20" },
  englishTextDark: { color: "#E8EDF5" },
  japaneseText: { color: "#3785F5", fontWeight: "600" },
  latestCard: { borderColor: "#B8D8FF", borderWidth: 1 },
  latestCardDark: { borderColor: "#4E83B8" },
  latestPill: { alignSelf: "flex-end", backgroundColor: "#EAF3FF", borderRadius: 99, color: "#007AFF", fontSize: 8, fontWeight: "800", marginBottom: 5, overflow: "hidden", paddingHorizontal: 7, paddingVertical: 3 },
  latestPillDark: { backgroundColor: "#1D3550", color: "#85C3FF" },
  loading: { color: "#858D99", fontSize: 14, paddingVertical: 30, textAlign: "center" },
  loadingDark: { color: "#9CA4B0" },
  messageCard: { backgroundColor: "#FFFFFF", borderRadius: 18, flex: 1, maxWidth: "86%", paddingHorizontal: 18, paddingVertical: 15, shadowColor: "#172033", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.055, shadowRadius: 14, elevation: 2 },
  messageCardDark: { backgroundColor: "#25292F", borderColor: "#3A4049", borderWidth: StyleSheet.hairlineWidth, shadowOpacity: 0 },
  messageRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  messageRowReverse: { flexDirection: "row-reverse" },
  moreText: { color: "#007AFF", fontSize: 12, fontWeight: "600", marginTop: 10 },
  originalText: { color: "#171A20", fontSize: 16, lineHeight: 23 },
  originalTextDark: { color: "#F5F7FA" },
  page: { gap: 22 },
  pageDark: { backgroundColor: "#0E1013" },
  pairIcon: { alignItems: "center", backgroundColor: "#EAF3FF", borderRadius: 12, height: 42, justifyContent: "center", width: 42 },
  pairIconDark: { backgroundColor: "#1D3550" },
  playButton: { alignItems: "center", backgroundColor: "#007AFF", borderRadius: 999, height: 28, justifyContent: "center", width: 28 },
  preview: { color: "#858D99", fontSize: 12, lineHeight: 17, marginTop: 4 },
  previewDark: { color: "#9CA4B0" },
  recordIcon: { alignItems: "center", backgroundColor: "#F0ECFF", borderRadius: 12, height: 42, justifyContent: "center", width: 42 },
  recordIconDark: { backgroundColor: "#312948" },
  rowCopy: { flex: 1, minWidth: 0 },
  rowDivider: { borderBottomColor: "#EAEDF1", borderBottomWidth: StyleSheet.hairlineWidth },
  rowDividerDark: { borderBottomColor: "#3A4049" },
  rowPressed: { opacity: 0.55 },
  rowPressedDark: { backgroundColor: "#30343A", opacity: 1 },
  rowTime: { color: "#9AA1AB", fontSize: 10, marginLeft: 8 },
  rowTimeDark: { color: "#8F98A5" },
  rowTitle: { color: "#1B1E24", flex: 1, fontSize: 14, fontWeight: "600" },
  rowTitleDark: { color: "#F5F7FA" },
  rowTop: { alignItems: "center", flexDirection: "row" },
  segment: { alignItems: "center", borderRadius: 999, flex: 1, justifyContent: "center", minHeight: 36, paddingHorizontal: 12 },
  segmentActive: { backgroundColor: "#FFFFFF", shadowColor: "#172033", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 7 },
  segmentActiveDark: { backgroundColor: "#30343A", shadowOpacity: 0 },
  segmentIndicator: { backgroundColor: "#FFFFFF", borderRadius: 999, bottom: 4, left: 4, position: "absolute", shadowColor: "#172033", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 7, top: 4 },
  segmentIndicatorDark: { backgroundColor: "#30343A", shadowOpacity: 0 },
  segmented: { backgroundColor: "#E9ECF1", borderRadius: 999, flexDirection: "row", overflow: "visible", padding: 4 },
  segmentedDark: { backgroundColor: "#20242B" },
  segmentText: { color: "#747D89", fontSize: 13, fontWeight: "600" },
  segmentTextDark: { color: "#9CA4B0" },
  segmentTextActive: { color: "#007AFF", fontWeight: "700" },
  segmentTextActiveDark: { color: "#6EB4FF" },
  translationLabel: { color: "#8B929D", fontSize: 10, fontWeight: "800", letterSpacing: 0.6, marginBottom: 4, textTransform: "uppercase" },
  translationText: { color: "#007AFF", fontSize: 16, fontWeight: "500", lineHeight: 23 },
  translationTextDark: { color: "#85C3FF" },
});
