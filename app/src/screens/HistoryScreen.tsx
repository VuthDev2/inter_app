import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Text, View } from "react-native";

import { Bucket } from "../components/Bucket";
import { LiveRow } from "../components/LiveRow";
import { RecordingRow } from "../components/RecordingRow";
import { Chip, Panel, ScreenHeader, uiStyles } from "../components/ui";
import {
  recordingTemplates,
  type RecordingTemplateId,
  type SavedRecordingSession,
} from "../constants/data";
import {
  loadSavedRecordingSessions,
  loadLiveSessions,
  type LiveSession,
} from "../services/storage";
import { supabase } from "../services/supabase";
import { atoms } from "../theme/atoms";
import { useTheme } from "../theme/ThemeProvider";
import { spacing } from "../theme/theme";

type Filter = "all" | RecordingTemplateId;

type AnyLiveSession = LiveSession | {
  id: string;
  sourceLang: string;
  targetLang: string;
  mode: "one-way" | "two-way";
  utterances: { id: string; original: string; translation: string; sourceLang: string; targetLang: string; createdAt: string }[];
  createdAt: string;
  endedAt: string | null;
};

export function HistoryScreen() {
  const [filter, setFilter] = useState<Filter>("all");
  const [recordings, setRecordings] = useState<SavedRecordingSession[]>([]);
  const [liveSessions, setLiveSessions] = useState<AnyLiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const appStateRef = useRef(AppState.currentState);
  const c = useTheme();

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

      if (cloudRecs && cloudRecs.length > 0) {
        const mapped: SavedRecordingSession[] = cloudRecs.map((r) => ({
          id: r.id,
          recordingType: r.recording_type as RecordingTemplateId,
          title: r.title,
          description: r.description ?? "",
          transcript: r.transcript ?? "",
          sourceAudio: r.source_audio ?? false,
          status: "saved" as const,
          createdAt: r.created_at,
        }));
        setRecordings((prev) => {
          const localIds = new Set(prev.map((r) => r.id));
          const newOnes = mapped.filter((r) => !localIds.has(r.id));
          return [...prev, ...newOnes].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        });
      }

      const { data: cloudSessions } = await supabase
        .from("live_sessions")
        .select("id, source_lang, target_lang, status, created_at, ended_at")
        .eq("host_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (cloudSessions && cloudSessions.length > 0) {
        const cloudLive: AnyLiveSession[] = cloudSessions.map((s) => ({
          id: s.id,
          sourceLang: s.source_lang,
          targetLang: s.target_lang,
          mode: "one-way" as const,
          utterances: [],
          createdAt: s.created_at,
          endedAt: s.ended_at,
        }));
        setLiveSessions((prev) => {
          const localIds = new Set(prev.map((s) => s.id));
          const newOnes = cloudLive.filter((s) => !localIds.has(s.id));
          return [...prev, ...newOnes].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        });
      }
    } catch (e) {
      console.warn("[HistoryScreen] Cloud load failed:", e);
    }
  }, []);

  useEffect(() => {
    load();
    const sub = AppState.addEventListener("change", (state) => {
      if (appStateRef.current.match(/inactive|background/) && state === "active") load();
      appStateRef.current = state;
    });
    return () => sub.remove();
  }, [load]);

  const visibleRecordings = filter === "all"
    ? recordings
    : recordings.filter((r) => r.recordingType === filter);

  const audioCount = recordings.filter((r) => r.sourceAudio).length;

  return (
    <View style={atoms.gapLg}>
      <ScreenHeader
        eyebrow="Central storage"
        title="Library"
        body="Live sessions, speech sessions, audio recordings, and transcripts."
      />

      <View style={[atoms.flexRow, atoms.flexWrap, atoms.gapMd]}>
        <Bucket icon="radio-outline" label="Live Sessions" value={String(liveSessions.length)} />
        <Bucket icon="chatbox-ellipses-outline" label="Speech Sessions" value={String(recordings.length)} />
        <Bucket icon="headset-outline" label="Audio Recordings" value={String(audioCount)} />
        <Bucket icon="document-text-outline" label="Transcripts" value={String(recordings.length + liveSessions.length)} />
      </View>

      <Panel>
        <Text style={{ color: c.text, fontSize: 17, fontWeight: "700", letterSpacing: -0.2 }}>Live Sessions</Text>
        <Text style={uiStyles.rowMeta}>Saved real-time interpretation sessions.</Text>

        {loading ? (
          <Text style={{ color: c.muted, fontSize: 14, paddingVertical: spacing.md }}>Loading…</Text>
        ) : liveSessions.length === 0 ? (
          <View style={[atoms.itemsCenter, atoms.gapMd, { paddingVertical: spacing.lg }]}>
            <Ionicons name="radio-outline" color={c.muted} size={28} style={{ opacity: 0.45 }} />
            <Text style={{ color: c.muted, fontSize: 14 }}>No live sessions yet.</Text>
            <Text style={{ color: c.muted, fontSize: 12, lineHeight: 17, maxWidth: 260, textAlign: "center" }}>Start a Live session — your history will appear here.</Text>
          </View>
        ) : (
          liveSessions.map((s) => <LiveRow key={s.id} session={s} />)
        )}
      </Panel>

      <Panel>
        <Text style={{ color: c.text, fontSize: 17, fontWeight: "700", letterSpacing: -0.2 }}>Recording Sessions</Text>
        <Text style={uiStyles.rowMeta}>Template-based recordings, filtered by type.</Text>

        <View style={[atoms.flexRow, atoms.flexWrap, { gap: 7 }]}>
          <Chip label="All" selected={filter === "all"} onPress={() => setFilter("all")} />
          {recordingTemplates.map((t) => (
            <Chip key={t.id} label={t.title} selected={filter === t.id} onPress={() => setFilter(t.id)} />
          ))}
        </View>

        {loading ? (
          <Text style={{ color: c.muted, fontSize: 14, paddingVertical: spacing.md }}>Loading…</Text>
        ) : visibleRecordings.length === 0 ? (
          <View style={[atoms.itemsCenter, atoms.gapMd, { paddingVertical: spacing.lg }]}>
            <Ionicons name="document-text-outline" color={c.muted} size={28} style={{ opacity: 0.45 }} />
            <Text style={{ color: c.muted, fontSize: 14 }}>No recording sessions yet.</Text>
          </View>
        ) : (
          visibleRecordings.map((r) => {
            const t = recordingTemplates.find((x) => x.id === r.recordingType);
            return (
              <RecordingRow
                key={r.id}
                icon={t?.icon ?? "document-text-outline"}
                title={r.title}
                meta={`${t?.title ?? r.recordingType} · ${new Date(r.createdAt).toLocaleDateString()} · ${r.status}`}
              />
            );
          })
        )}
      </Panel>
    </View>
  );
}
