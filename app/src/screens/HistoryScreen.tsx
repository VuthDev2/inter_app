
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Pressable, Text, View } from "react-native";

import { atoms } from "../theme/atoms";
import { Chip, Panel, PrimaryButton, ScreenHeader, uiStyles } from "../components/ui";
import {
  recordingTemplates,
  type RecordingTemplateId,
  type SavedRecordingSession,
} from "../constants/data";
import {
  loadSavedRecordingSessions,
  loadLiveSessions,
  saveRecordingSession,
  type LiveSession,
} from "../services/storage";
import { supabase } from "../services/supabase";
import { colors, spacing } from "../theme/theme";

type Filter = "all" | RecordingTemplateId;

// ─── A merged live-session entry (local OR cloud) ─────────────────────────────
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

  const load = useCallback(async () => {
    setLoading(true);

    // ── Step 1: load local data immediately ──────────────────────────────────
    const [localRecs, localLive] = await Promise.all([
      loadSavedRecordingSessions(),
      loadLiveSessions(),
    ]);
    setRecordings(localRecs);
    setLiveSessions(localLive);
    setLoading(false);

    // ── Step 2: merge cloud data silently in background ──────────────────────
    if (!supabase) return;
    try {
      const { data: { session: auth } } = await supabase.auth.getSession();
      const userId = auth?.user?.id;
      if (!userId) return;

      // Cloud recordings
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
        // Merge: local ones take priority (dedupe by id), cloud fills the rest
        setRecordings((prev) => {
          const localIds = new Set(prev.map((r) => r.id));
          const newOnes = mapped.filter((r) => !localIds.has(r.id));
          return [...prev, ...newOnes].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        });
      }

      // Cloud live sessions
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
      // Silent — local data already shown
      console.warn("[HistoryScreen] Cloud load failed:", e);
    }
  }, []);

  // Load on mount + app foreground
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

  const addSampleRecording = async () => {
    const t = recordingTemplates[0];
    await saveRecordingSession({
      id: `${t.id}-${Date.now()}`,
      recordingType: t.id,
      title: "Mobile interpretation note",
      description: t.description,
      transcript: "Sample mobile transcript saved from React Native.",
      sourceAudio: t.sourceAudio,
      status: "saved",
      createdAt: new Date().toISOString(),
    });
    await load();
  };

  return (
    <View style={atoms.gapLg}>
      <ScreenHeader
        eyebrow="Central storage"
        title="Library"
        body="Live sessions, speech sessions, audio recordings, and transcripts."
      />

      {/* ── 4 stat buckets ── */}
      <View style={[atoms.flexRow, atoms.flexWrap, atoms.gapMd]}>
        <Bucket icon="radio-outline" label="Live Sessions" value={String(liveSessions.length)} />
        <Bucket icon="chatbox-ellipses-outline" label="Speech Sessions" value={String(recordings.length)} />
        <Bucket icon="headset-outline" label="Audio Recordings" value={String(audioCount)} />
        <Bucket icon="document-text-outline" label="Transcripts" value={String(recordings.length + liveSessions.length)} />
      </View>

      {/* ── Live sessions ── */}
      <Panel>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700", letterSpacing: -0.2 }}>Live Sessions</Text>
        <Text style={uiStyles.rowMeta}>Saved real-time interpretation sessions.</Text>

        {loading ? (
          <Text style={{ color: colors.muted, fontSize: 14, paddingVertical: spacing.md }}>Loading…</Text>
        ) : liveSessions.length === 0 ? (
          <View style={[atoms.itemsCenter, atoms.gapMd, { paddingVertical: spacing.lg }]}>
            <Ionicons name="radio-outline" color={colors.muted} size={28} style={{ opacity: 0.45 }} />
            <Text style={{ color: colors.muted, fontSize: 14 }}>No live sessions yet.</Text>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, maxWidth: 260, textAlign: "center" }}>Start a Live session — your history will appear here.</Text>
          </View>
        ) : (
          liveSessions.map((s) => <LiveRow key={s.id} session={s} />)
        )}
      </Panel>

      {/* ── Recording sessions ── */}
      <Panel>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700", letterSpacing: -0.2 }}>Recording Sessions</Text>
        <Text style={uiStyles.rowMeta}>Template-based recordings, filtered by type.</Text>

        <View style={[atoms.flexRow, atoms.flexWrap, { gap: 7 }]}>
          <Chip label="All" selected={filter === "all"} onPress={() => setFilter("all")} />
          {recordingTemplates.map((t) => (
            <Chip key={t.id} label={t.title} selected={filter === t.id} onPress={() => setFilter(t.id)} />
          ))}
        </View>

        {loading ? (
          <Text style={{ color: colors.muted, fontSize: 14, paddingVertical: spacing.md }}>Loading…</Text>
        ) : visibleRecordings.length === 0 ? (
          <View style={[atoms.itemsCenter, atoms.gapMd, { paddingVertical: spacing.lg }]}>
            <Ionicons name="document-text-outline" color={colors.muted} size={28} style={{ opacity: 0.45 }} />
            <Text style={{ color: colors.muted, fontSize: 14 }}>No recording sessions yet.</Text>
            <PrimaryButton icon="add-circle-outline" onPress={addSampleRecording}>
              Add Sample Recording
            </PrimaryButton>
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

// ─── Live session row ─────────────────────────────────────────────────────────
function LiveRow({ session }: { session: AnyLiveSession }) {
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
    <Pressable onPress={showDetail} style={[atoms.flexRow, atoms.itemsCenter, atoms.gapMd, { borderTopColor: colors.border, borderTopWidth: 1, paddingVertical: spacing.md }]} accessibilityRole="button">
      <View style={{ alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 8, flexShrink: 0, height: 38, justifyContent: "center", width: 38 }}>
        <Ionicons name="radio-outline" color={colors.primary} size={17} />
      </View>
      <View style={[atoms.flex1, { gap: 2, minWidth: 0 }]}>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: "500" }}>
          {session.sourceLang.toUpperCase()} → {session.targetLang.toUpperCase()}
          {session.mode === "two-way" ? "  ⇄" : ""}
        </Text>
        <Text style={uiStyles.rowMeta}>
          {date.toLocaleDateString()}{count > 0 ? ` · ${count} utterance${count !== 1 ? "s" : ""}` : ""}
          {latest ? ` · "${latest.translation.slice(0, 35)}${latest.translation.length > 35 ? "…" : ""}"` : ""}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={15} color={colors.muted} />
    </Pressable>
  );
}

// ─── Recording row ────────────────────────────────────────────────────────────
function RecordingRow({ icon, title, meta }: { icon: keyof typeof Ionicons.glyphMap; title: string; meta: string }) {
  return (
    <View style={[atoms.flexRow, atoms.itemsCenter, atoms.gapMd, { borderTopColor: colors.border, borderTopWidth: 1, paddingVertical: spacing.md }]}>
      <View style={{ alignItems: "center", backgroundColor: colors.secondary, borderRadius: 8, flexShrink: 0, height: 38, justifyContent: "center", width: 38 }}>
        <Ionicons name={icon} color={colors.muted} size={17} />
      </View>
      <View style={[atoms.flex1, { gap: 2, minWidth: 0 }]}>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: "500" }}>{title}</Text>
        <Text style={uiStyles.rowMeta}>{meta}</Text>
      </View>
      <Pressable style={[atoms.flexRow, atoms.itemsCenter, atoms.bgSurface, atoms.border1, { borderColor: colors.border, borderRadius: 8, gap: 4, paddingHorizontal: 10, paddingVertical: 6 }]} accessibilityRole="button">
        <Ionicons name="download-outline" size={13} color={colors.text} />
        <Text style={{ color: colors.text, fontSize: 12, fontWeight: "500" }}>Export</Text>
      </Pressable>
    </View>
  );
}

// ─── Stat bucket ──────────────────────────────────────────────────────────────
function Bucket({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={[{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexBasis: "47%", flexGrow: 1, gap: 6, padding: spacing.md, shadowColor: colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }]}>
      <View style={{ alignItems: "center", backgroundColor: colors.secondary, borderRadius: 8, height: 36, justifyContent: "center", width: 36 }}>
        <Ionicons name={icon} color={colors.muted} size={17} />
      </View>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700", letterSpacing: -0.3 }}>{value}</Text>
      <Text style={uiStyles.rowMeta}>{label}</Text>
    </View>
  );
}
