import type { SavedRecordingSession } from "../constants/data";
import { appStorage } from "./nativeStorage";
import { supabase } from "./supabase";

const RECORDING_KEY        = "quickvoice.recordingSessions";
const LIVE_SESSION_KEY     = "quickvoice.liveSessions";
const AUDIO_RECORDING_KEY  = "quickvoice.audioRecordings";

// ─── Tiny UUID-v4 generator (no native crypto needed) ────────────────────────
function uuid4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ─── Recording sessions ───────────────────────────────────────────────────────
export async function loadSavedRecordingSessions(): Promise<SavedRecordingSession[]> {
  try {
    const raw = await appStorage.getItem(RECORDING_KEY);
    const parsed = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed) ? (parsed as SavedRecordingSession[]) : [];
  } catch {
    return [];
  }
}

export async function saveRecordingSession(session: SavedRecordingSession): Promise<void> {
  // 1. Save locally first — always works
  const existing = await loadSavedRecordingSessions();
  const idx = existing.findIndex((s) => s.id === session.id);
  if (idx >= 0) existing[idx] = session; else existing.unshift(session);
  await appStorage.setItem(RECORDING_KEY, JSON.stringify(existing.slice(0, 100)));

  // 2. Try cloud sync in the background — never throw
  if (!supabase) return;
  try {
    const { data: { session: auth } } = await supabase.auth.getSession();
    if (!auth?.user) return;

    await supabase.from("recordings").insert({
      owner_id:          auth.user.id,
      recording_type:    session.recordingType,
      title:             session.title,
      description:       session.description ?? "",
      transcript:        session.transcript ?? "",
      source_audio:      session.sourceAudio,
      template_settings: { sourceAudio: session.sourceAudio, speakerLabels: false },
      status:            session.status,
    });
  } catch (e) {
    console.warn("[storage] Cloud sync (recordings) failed:", e);
  }
}

// ─── Live interpretation sessions ────────────────────────────────────────────
export type LiveSession = {
  id: string;
  sourceLang: string;
  targetLang: string;
  mode: "one-way" | "two-way";
  utterances: Array<{
    id: string;
    original: string;
    translation: string;
    sourceLang: string;
    targetLang: string;
    createdAt: string;
  }>;
  createdAt: string;
  endedAt: string | null;
};

export async function loadLiveSessions(): Promise<LiveSession[]> {
  try {
    const raw = await appStorage.getItem(LIVE_SESSION_KEY);
    const parsed = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed) ? (parsed as LiveSession[]) : [];
  } catch {
    return [];
  }
}

export async function saveLiveSession(session: LiveSession): Promise<void> {
  // 1. Save locally first
  const existing = await loadLiveSessions();
  const idx = existing.findIndex((s) => s.id === session.id);
  if (idx >= 0) existing[idx] = session; else existing.unshift(session);
  await appStorage.setItem(LIVE_SESSION_KEY, JSON.stringify(existing.slice(0, 50)));

  // 2. Cloud sync — save to sessions + transcripts tables
  if (!supabase || session.utterances.length === 0) return;
  try {
    const { data: { session: auth } } = await supabase.auth.getSession();
    if (!auth?.user) return;

    const { data: row, error: sessionErr } = await supabase
      .from("live_sessions")
      .insert({
        host_id:     auth.user.id,
        source_lang: session.sourceLang,
        target_lang: session.targetLang,
        mode:        session.mode,
        status:      "completed",
        ended_at:    session.endedAt ?? new Date().toISOString(),
      })
      .select("id")
      .single();

    if (sessionErr || !row) {
      console.warn("[storage] Cloud sync (live_sessions) failed:", sessionErr);
      return;
    }

    const transcripts = session.utterances.map((u) => ({
      session_id:      row.id,
      speaker_id:      auth.user.id,
      source_lang:     u.sourceLang,
      target_lang:     u.targetLang,
      original_text:   u.original,
      translated_text: u.translation,
      created_at:      u.createdAt,
    }));

    if (transcripts.length > 0) {
      await supabase.from("transcripts").insert(transcripts);
    }
  } catch (e) {
    console.warn("[storage] Cloud sync (live session) failed:", e);
  }
}

// ─── Audio Recordings ─────────────────────────────────────────────────────────
export type LocalAudioRecording = {
  id: string;
  userId: string | null;
  filePath: string;
  mimeType: string;
  durationMs: number | null;
  fileSizeBytes: number | null;
  recordingId: string | null;
  liveSessionId: string | null;
  createdAt: string;
};

export async function loadAudioRecordings(): Promise<LocalAudioRecording[]> {
  try {
    const raw = await appStorage.getItem(AUDIO_RECORDING_KEY);
    const parsed = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed) ? (parsed as LocalAudioRecording[]) : [];
  } catch {
    return [];
  }
}

async function saveAudioRecordingsIndex(list: LocalAudioRecording[]): Promise<void> {
  await appStorage.setItem(AUDIO_RECORDING_KEY, JSON.stringify(list));
}

export async function addAudioRecording(rec: LocalAudioRecording): Promise<void> {
  const list = await loadAudioRecordings();
  list.unshift(rec);
  await saveAudioRecordingsIndex(list);

  if (!supabase) return;
  try {
    const { data: { session: auth } } = await supabase.auth.getSession();
    if (!auth?.user) return;

    await supabase.from("audio_recordings").insert({
      id:              rec.id,
      user_id:         auth.user.id,
      recording_id:    rec.recordingId,
      live_session_id: rec.liveSessionId,
      file_path:       rec.filePath,
      mime_type:       rec.mimeType,
      duration_ms:     rec.durationMs,
      file_size_bytes: rec.fileSizeBytes,
    });
  } catch (e) {
    console.warn("[storage] Cloud sync (audio) failed:", e);
  }
}

export async function deleteAudioRecording(id: string): Promise<void> {
  const list = await loadAudioRecordings();
  const next = list.filter((r) => r.id !== id);
  await saveAudioRecordingsIndex(next);

  if (!supabase) return;
  try {
    await supabase.from("audio_recordings").delete().eq("id", id);
  } catch (e) {
    console.warn("[storage] Cloud sync (audio delete) failed:", e);
  }
}
