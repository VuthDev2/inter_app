import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, AppState, Pressable, StyleSheet, Text, View } from "react-native";

import { languages, type SavedRecordingSession } from "../constants/data";
import { usePreferences } from "../features/preferences/context";
import {
  loadLiveSessions,
  loadSavedRecordingSessions,
  type LiveSession,
} from "../services/storage";
import { supabase } from "../services/supabase";
import { colors } from "../theme/theme";

type AnyLiveSession = LiveSession;
type HistoryKind = "conversations" | "recordings" | "extension";
type DateGroup<T> = { label: "Today" | "Yesterday" | "Last Week" | "Older"; items: T[] };

const LOCALES: Record<string, string> = {
  en: "en-US", ja: "ja-JP", es: "es-ES", fr: "fr-FR",
  de: "de-DE", zh: "zh-CN", ko: "ko-KR", kh: "km-KH",
};

const EXTENSION_SAMPLES: SavedRecordingSession[] = [
  {
    id: "extension-sample-1",
    recordingType: "meeting",
    title: "Team conversation",
    description: "Sample extension session",
    transcript: "Discussing the next project milestone and responsibilities.",
    sourceAudio: false,
    status: "saved",
    createdAt: new Date().toISOString(),
  },
  {
    id: "extension-sample-2",
    recordingType: "conference",
    title: "Project discussion",
    description: "Sample extension session",
    transcript: "A short preview of the translated project discussion.",
    sourceAudio: false,
    status: "saved",
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
  },
];

const CONVERSATION_SAMPLES: AnyLiveSession[] = [
  {
    id: "conversation-sample-1",
    sourceLang: "en",
    targetLang: "ja",
    mode: "two-way",
    createdAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    utterances: [
      {
        id: "conversation-sample-message-1",
        original: "Hello, how are you?",
        translation: "こんにちは、お元気ですか？",
        sourceLang: "en",
        targetLang: "ja",
        createdAt: new Date().toISOString(),
      },
      {
        id: "conversation-sample-message-2",
        original: "元気です。ありがとうございます。",
        translation: "I’m well, thank you.",
        sourceLang: "ja",
        targetLang: "en",
        createdAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: "conversation-sample-2",
    sourceLang: "ja",
    targetLang: "en",
    mode: "one-way",
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    endedAt: new Date(Date.now() - 86_400_000).toISOString(),
    utterances: [
      {
        id: "conversation-sample-message-3",
        original: "今日はいい天気ですね。",
        translation: "The weather is nice today.",
        sourceLang: "ja",
        targetLang: "en",
        createdAt: new Date(Date.now() - 86_400_000).toISOString(),
      },
    ],
  },
];

const RECORDING_SAMPLES: SavedRecordingSession[] = [
  {
    id: "recording-sample-1",
    recordingType: "lecture",
    title: "School Recording",
    description: "Sample school recording",
    transcript: "Mathematics helps us solve problems in everyday life.",
    sourceAudio: true,
    status: "saved",
    createdAt: new Date().toISOString(),
  },
  {
    id: "recording-sample-2",
    recordingType: "meeting",
    title: "Work Recording",
    description: "Sample work recording",
    transcript: "The team agreed on the next project milestone.",
    sourceAudio: true,
    status: "saved",
    createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  },
];

const languageLabel = (code: string) => languages.find((item) => item.code === code)?.label ?? code.toUpperCase();

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

export function HistoryScreen() {
  const { tts_speed: ttsSpeed } = usePreferences();
  const [kind, setKind] = useState<HistoryKind>("conversations");
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
      <Animated.View style={[styles.detail, { opacity: detailAnim, transform: [{ translateX: detailAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
        <View style={styles.detailHeader}>
          <Pressable accessibilityLabel="Back to history" onPress={closeConversation} style={styles.backButton}><Ionicons name="chevron-back" size={20} color="#171A20" /></Pressable>
          <View style={styles.detailHeading}>
            <Text style={styles.detailTitle}>{languageLabel(selected.sourceLang)} ↔ {languageLabel(selected.targetLang)}</Text>
            <Text style={styles.detailMeta}>{new Date(selected.createdAt).toLocaleString()} · {selected.utterances.length} messages</Text>
          </View>
        </View>
        <View style={styles.segmented}>
          <View style={[styles.segment, styles.segmentActive]}><Text style={[styles.segmentText, styles.segmentTextActive]}>Conversation</Text></View>
          <View style={styles.segment}><Text style={styles.segmentText}>Voice Record</Text></View>
          <View style={styles.segment}><Text style={styles.segmentText}>Extension</Text></View>
        </View>

        {selected.utterances.length === 0 ? (
          <View style={styles.emptyState}><Ionicons name="chatbubbles-outline" size={28} color="#A3AAB5" /><Text style={styles.emptyTitle}>No transcript available</Text><Text style={styles.emptyCopy}>This synced session does not include conversation text on this device.</Text></View>
        ) : selected.utterances.map((utterance, index) => {
          const isExpanded = expanded.has(utterance.id);
          const isLong = utterance.original.length + utterance.translation.length > 240;
          const isLatest = index === selected.utterances.length - 1;
          const fromJapanese = utterance.sourceLang === "ja";
          return (
            <View key={utterance.id} style={[styles.messageRow, fromJapanese && styles.messageRowReverse]}>
              <View style={[styles.messageCard, isLatest && styles.latestCard]}>
                {isLatest ? <Text style={styles.latestPill}>LATEST</Text> : null}
                <Text numberOfLines={isExpanded ? undefined : 4} style={[styles.originalText, utterance.sourceLang === "ja" && styles.japaneseText]}>{utterance.original}</Text>
                <View style={styles.divider} />
                <Text numberOfLines={isExpanded ? undefined : 4} style={[styles.translationText, utterance.targetLang !== "ja" && styles.englishText]}>{utterance.translation}</Text>
                {isLong ? <Pressable onPress={() => setExpanded((current) => { const next = new Set(current); next.has(utterance.id) ? next.delete(utterance.id) : next.add(utterance.id); return next; })}><Text style={styles.moreText}>{isExpanded ? "Show less" : "Show more"}</Text></Pressable> : null}
              </View>
              <Pressable accessibilityLabel={`Play ${languageLabel(utterance.targetLang)} translation`} onPress={() => Speech.speak(utterance.translation, { language: LOCALES[utterance.targetLang] ?? "en-US", rate: ttsSpeed })} style={styles.playButton}><Ionicons name="play" size={13} color="#FFFFFF" /></Pressable>
            </View>
          );
        })}
      </Animated.View>
    );
  }

  const groups = kind === "conversations"
    ? groupByDate(liveSessions.length > 0 ? liveSessions : CONVERSATION_SAMPLES)
    : groupByDate(kind === "recordings" ? (recordings.length > 0 ? recordings : RECORDING_SAMPLES) : EXTENSION_SAMPLES);

  return (
    <View style={styles.page}>
      <View onLayout={(event) => setSegmentWidth(event.nativeEvent.layout.width)} style={styles.segmented}>
        {segmentWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.segmentIndicator,
              {
                width: (segmentWidth - 8) / 3,
                transform: [{ translateX: Animated.multiply(segmentPosition, (segmentWidth - 8) / 3) }],
              },
            ]}
          />
        ) : null}
        <Pressable onPress={() => setKind("conversations")} style={styles.segment}><Text style={[styles.segmentText, kind === "conversations" && styles.segmentTextActive]}>Conversations</Text></Pressable>
        <Pressable onPress={() => setKind("recordings")} style={styles.segment}><Text style={[styles.segmentText, kind === "recordings" && styles.segmentTextActive]}>Voice Records</Text></Pressable>
        <Pressable onPress={() => setKind("extension")} style={styles.segment}><Text style={[styles.segmentText, kind === "extension" && styles.segmentTextActive]}>Extension</Text></Pressable>
      </View>

      {loading ? <Text style={styles.loading}>Loading history…</Text> : groups.length === 0 ? (
        <View style={styles.emptyState}><Ionicons name="time-outline" size={30} color="#A3AAB5" /><Text style={styles.emptyTitle}>No history yet</Text><Text style={styles.emptyCopy}>Completed conversations and recordings will appear here.</Text></View>
      ) : groups.map((group) => (
        <View key={group.label} style={styles.group}>
          <Text style={styles.groupTitle}>{group.label}</Text>
          <View style={styles.groupList}>
            {kind === "conversations" ? (group.items as AnyLiveSession[]).map((session, index) => (
              <ConversationRow key={session.id} session={session} divider={index < group.items.length - 1} onPress={() => openConversation(session)} />
            )) : (group.items as SavedRecordingSession[]).map((recording, index) => (
              <RecordingRow key={recording.id} recording={recording} divider={index < group.items.length - 1} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function ConversationRow({ session, divider, onPress }: { session: AnyLiveSession; divider: boolean; onPress: () => void }) {
  const latest = session.utterances[session.utterances.length - 1];
  const title = latest?.original.trim() || `${languageLabel(session.sourceLang)} conversation`;
  const preview = latest?.translation.trim() || "Conversation transcript unavailable on this device.";
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.historyRow, divider && styles.rowDivider, pressed && styles.rowPressed]}>
      <View style={styles.pairIcon}><Ionicons name="chatbubbles-outline" size={19} color="#007AFF" /></View>
      <View style={styles.rowCopy}>
        <View style={styles.rowTop}><Text numberOfLines={1} style={styles.rowTitle}>{title}</Text><Text style={styles.rowTime}>{new Date(session.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Text></View>
        <Text style={styles.languagePair}>{languageLabel(session.sourceLang)} ↔ {languageLabel(session.targetLang)}</Text>
        <Text numberOfLines={1} style={styles.preview}>{preview}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#A2A9B3" />
    </Pressable>
  );
}

function RecordingRow({ recording, divider }: { recording: SavedRecordingSession; divider: boolean }) {
  return (
    <View style={[styles.historyRow, divider && styles.rowDivider]}>
      <View style={styles.recordIcon}><Ionicons name="mic-outline" size={19} color="#7657DB" /></View>
      <View style={styles.rowCopy}><View style={styles.rowTop}><Text numberOfLines={1} style={styles.rowTitle}>{recording.title}</Text><Text style={styles.rowTime}>{new Date(recording.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Text></View><Text numberOfLines={2} style={styles.preview}>{recording.transcript}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 999, height: 40, justifyContent: "center", shadowColor: "#172033", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, width: 40 },
  detail: { gap: 13 },
  detailHeader: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 4 },
  detailHeading: { flex: 1 },
  detailMeta: { color: "#7D8591", fontSize: 11, marginTop: 3 },
  detailTitle: { color: "#14171C", fontSize: 18, fontWeight: "700" },
  divider: { backgroundColor: "#E8EBF0", height: StyleSheet.hairlineWidth, marginVertical: 10 },
  emptyCopy: { color: "#858D99", fontSize: 13, lineHeight: 19, maxWidth: 280, textAlign: "center" },
  emptyState: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 20, gap: 8, marginTop: 24, paddingHorizontal: 24, paddingVertical: 34 },
  emptyTitle: { color: "#282D35", fontSize: 16, fontWeight: "700" },
  group: { gap: 9 },
  groupList: { backgroundColor: "#FFFFFF", borderRadius: 19, overflow: "hidden", paddingHorizontal: 14, shadowColor: "#172033", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.055, shadowRadius: 16, elevation: 2 },
  groupTitle: { color: "#171A20", fontSize: 17, fontWeight: "700", letterSpacing: -0.2, marginLeft: 3 },
  historyRow: { alignItems: "center", flexDirection: "row", gap: 11, minHeight: 86, paddingVertical: 12 },
  languagePair: { color: "#007AFF", fontSize: 11, fontWeight: "600", marginTop: 3 },
  englishText: { color: "#171A20" },
  japaneseText: { color: "#3785F5", fontWeight: "600" },
  latestCard: { borderColor: "#B8D8FF", borderWidth: 1 },
  latestPill: { alignSelf: "flex-end", backgroundColor: "#EAF3FF", borderRadius: 99, color: "#007AFF", fontSize: 8, fontWeight: "800", marginBottom: 5, overflow: "hidden", paddingHorizontal: 7, paddingVertical: 3 },
  loading: { color: "#858D99", fontSize: 14, paddingVertical: 30, textAlign: "center" },
  messageCard: { backgroundColor: "#FFFFFF", borderRadius: 18, flex: 1, maxWidth: "86%", paddingHorizontal: 18, paddingVertical: 15, shadowColor: "#172033", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.055, shadowRadius: 14, elevation: 2 },
  messageRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  messageRowReverse: { flexDirection: "row-reverse" },
  moreText: { color: "#007AFF", fontSize: 12, fontWeight: "600", marginTop: 10 },
  originalText: { color: "#171A20", fontSize: 16, lineHeight: 23 },
  page: { gap: 22 },
  pairIcon: { alignItems: "center", backgroundColor: "#EAF3FF", borderRadius: 12, height: 42, justifyContent: "center", width: 42 },
  playButton: { alignItems: "center", backgroundColor: "#007AFF", borderRadius: 999, height: 28, justifyContent: "center", width: 28 },
  preview: { color: "#858D99", fontSize: 12, lineHeight: 17, marginTop: 4 },
  recordIcon: { alignItems: "center", backgroundColor: "#F0ECFF", borderRadius: 12, height: 42, justifyContent: "center", width: 42 },
  rowCopy: { flex: 1, minWidth: 0 },
  rowDivider: { borderBottomColor: "#EAEDF1", borderBottomWidth: StyleSheet.hairlineWidth },
  rowPressed: { opacity: 0.55 },
  rowTime: { color: "#9AA1AB", fontSize: 10, marginLeft: 8 },
  rowTitle: { color: "#1B1E24", flex: 1, fontSize: 14, fontWeight: "600" },
  rowTop: { alignItems: "center", flexDirection: "row" },
  segment: { alignItems: "center", borderRadius: 999, flex: 1, justifyContent: "center", minHeight: 36, paddingHorizontal: 12 },
  segmentActive: { backgroundColor: "#FFFFFF", shadowColor: "#172033", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 7 },
  segmentIndicator: { backgroundColor: "#FFFFFF", borderRadius: 999, bottom: 4, left: 4, position: "absolute", shadowColor: "#172033", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 7, top: 4 },
  segmented: { backgroundColor: "#E9ECF1", borderRadius: 999, flexDirection: "row", overflow: "visible", padding: 4 },
  segmentText: { color: "#747D89", fontSize: 13, fontWeight: "600" },
  segmentTextActive: { color: "#007AFF", fontWeight: "700" },
  translationLabel: { color: "#8B929D", fontSize: 10, fontWeight: "800", letterSpacing: 0.6, marginBottom: 4, textTransform: "uppercase" },
  translationText: { color: "#007AFF", fontSize: 16, fontWeight: "500", lineHeight: 23 },
});
