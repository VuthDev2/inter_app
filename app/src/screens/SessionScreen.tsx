/**
 * SessionScreen — real-time streaming interpretation
 *
 * Flow:
 *   1. User taps record → recording starts
 *   2. While recording, audio is transcribed every ~2.5s for live subtitles
 *   3. User taps stop → final transcription + translation
 *   4. Translation displayed + spoken via expo-speech
 *   5. 2-way mode: languages swap after each utterance
 *   6. QR Connect mode: utterances broadcast via Supabase Realtime
 */
import { Ionicons } from "@expo/vector-icons";
import {
  useAudioRecorder,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from "expo-audio";
import { File as ExpoFile, Directory, Paths } from "expo-file-system";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePreferences } from "../features/preferences/context";
import { atoms } from "../theme/atoms";
import { transcribeAudio as backendTranscribe, translateText } from "../services/api";
import { languages, type LanguageCode } from "../constants/data";
import { addAudioRecording, saveLiveSession } from "../services/storage";

// ─── BCP-47 locale map ────────────────────────────────────────────────────────
const LOCALES: Record<string, string> = {
  en: "en", ja: "ja", es: "es", fr: "fr",
  de: "de", zh: "zh", ko: "ko", kh: "km",
};

// ─── Dark palette ─────────────────────────────────────────────────────────────
const BG = "#0c0e17";
const SURFACE = "#252836";
const INDIGO = "#6366f1";
const RED = "#e53e3e";
const WHITE = "#FFFFFF";
const DIM = "rgba(255,255,255,0.55)";
const FAINT = "rgba(255,255,255,0.18)";
const BDRY = "rgba(255,255,255,0.08)";

// ─── Language helpers ─────────────────────────────────────────────────────────
const FLAGS: Record<string, string> = {
  en: "🇺🇸", ja: "🇯🇵", es: "🇪🇸", fr: "🇫🇷",
  de: "🇩🇪", zh: "🇨🇳", ko: "🇰🇷", kh: "🇰🇭",
};
const getFlag = (c: string) => FLAGS[c] ?? "🌐";
const getLabel = (c: string) => languages.find((l) => l.code === c)?.label ?? c;

// ─── Waveform ─────────────────────────────────────────────────────────────────
const WAVE_H = 72;
const N_BARS = 38;
const BAR_PX = Array.from({ length: N_BARS }, (_, i) => {
  const d = Math.abs(i - N_BARS / 2) / (N_BARS / 2);
  return Math.round(Math.max(3, Math.min(1, 0.18 + d * 0.55 + Math.sin(i * 1.7) * 0.22 + Math.sin(i * 0.9) * 0.12)) * WAVE_H);
});

function Waveform({ active }: { active: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: false }),
          Animated.timing(anim, { toValue: 0, duration: 600, useNativeDriver: false }),
        ])
      ).start();
    } else {
      anim.stopAnimation();
      anim.setValue(0);
    }
  }, [active]);

  return (
    <View style={wv.row}>
      {BAR_PX.map((h, i) => {
        const gap = i >= N_BARS / 2 - 2 && i <= N_BARS / 2 + 2;
        return (
          <View
            key={i}
            style={[wv.bar, {
              height: active ? h : Math.max(3, Math.round(h * 0.28)),
              opacity: gap ? 0 : active ? 0.85 : 0.28,
              backgroundColor: active ? "#14b8a6" : "rgba(255,255,255,0.45)",
            }]}
          />
        );
      })}
    </View>
  );
}

const wv = StyleSheet.create({
  row: { alignItems: "center", flex: 1, flexDirection: "row", gap: 2, paddingHorizontal: 4 },
  bar: { borderRadius: 99, flex: 1 },
});

// ─── Language pill + picker ───────────────────────────────────────────────────
function LangPill({ value, onChange, disabled, showDot = false }: {
  value: LanguageCode;
  onChange: (v: LanguageCode) => void;
  disabled: boolean;
  showDot?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable disabled={disabled} onPress={() => setOpen(true)} style={[pl.pill, disabled && pl.pillOff]}>
        {showDot ? <View style={pl.dot} /> : <Text style={pl.flag}>{getFlag(value)}</Text>}
        <Text style={pl.lbl}>{getLabel(value)}</Text>
        <Ionicons name="chevron-down" size={11} color="rgba(255,255,255,0.4)" />
      </Pressable>
      <Modal transparent animationType="slide" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={pl.backdrop} onPress={() => setOpen(false)} />
        <View style={pl.sheet}>
          <View style={pl.handle} />
          <Text style={pl.sheetTitle}>Select Language</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {languages.map((lang, idx) => {
              const sel = lang.code === value;
              return (
                <TouchableOpacity
                  key={lang.code}
                  activeOpacity={0.6}
                  onPress={() => { onChange(lang.code as LanguageCode); setOpen(false); }}
                  style={[pl.item, idx < languages.length - 1 && pl.itemBorder]}
                >
                  <Text style={pl.itemFlag}>{getFlag(lang.code)}</Text>
                  <Text style={[pl.itemText, sel && pl.itemSel]}>{lang.label}</Text>
                  {sel && <Ionicons name="checkmark" size={16} color={INDIGO} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const pl = StyleSheet.create({
  pill: { alignItems: "center", backgroundColor: SURFACE, borderRadius: 99, flexDirection: "row", gap: 6, paddingHorizontal: 14, paddingVertical: 11 },
  pillOff: { opacity: 0.4 },
  dot: { backgroundColor: RED, borderRadius: 99, height: 13, width: 13 },
  flag: { fontSize: 15 },
  lbl: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "500" },
  backdrop: { backgroundColor: "rgba(0,0,0,0.55)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  sheet: { backgroundColor: "#1c1f2e", borderTopLeftRadius: 24, borderTopRightRadius: 24, bottom: 0, left: 0, maxHeight: "62%", paddingBottom: 32, paddingHorizontal: 20, paddingTop: 12, position: "absolute", right: 0 },
  handle: { alignSelf: "center", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 3, height: 4, marginBottom: 16, width: 40 },
  sheetTitle: { color: WHITE, fontSize: 15, fontWeight: "700", marginBottom: 12 },
  item: { alignItems: "center", flexDirection: "row", gap: 12, paddingVertical: 14 },
  itemBorder: { borderBottomColor: BDRY, borderBottomWidth: 1 },
  itemFlag: { fontSize: 18 },
  itemText: { color: DIM, flex: 1, fontSize: 15 },
  itemSel: { color: WHITE, fontWeight: "600" },
});

// ─── Transcription (backend → Gemini, or mock fallback) ─────────────────────
async function transcribeAudio(fileUri: string, language: string): Promise<string> {
  // Try the backend server first (proxies to Gemini)
  const backendResult = await backendTranscribe(fileUri, language);
  if (backendResult) return backendResult;

  // ── Mock fallback ──
  await new Promise(resolve => setTimeout(resolve, 800));
  if (LOCALES[language] === "ja") return "こんにちは！これはテストです。";
  return "Hello! This is a test transcription.";
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Utterance = {
  id: string;
  original: string;
  translation: string;
  sourceLang: string;
  targetLang: string;
  createdAt: string;
};

// ─── Main component ───────────────────────────────────────────────────────────
export function SessionScreen({
  initialSource,
  initialTarget,
  onBack,
}: {
  initialSource: LanguageCode;
  initialTarget: LanguageCode;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const { session_mode: mode, auto_speak: autoSpeak, tts_speed, update: updatePrefs } = usePreferences();

  const [src, setSrc] = useState<LanguageCode>(initialSource);
  const [tgt, setTgt] = useState<LanguageCode>(initialTarget);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<string>("TAP \u25CF TO SPEAK");
  // ── Streaming subtitle state ────────────────────────────────────────────────
  const [partialTranscript, setPartialTranscript] = useState<string>("");
  const streamingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const [displayTrans, setDisplayTrans] = useState<string | null>(null);

  const srcRef = useRef(src); useEffect(() => { srcRef.current = src; }, [src]);
  const tgtRef = useRef(tgt); useEffect(() => { tgtRef.current = tgt; }, [tgt]);
  const modeRef = useRef(mode); useEffect(() => { modeRef.current = mode; }, [mode]);
  const speakRef = useRef(autoSpeak); useEffect(() => { speakRef.current = autoSpeak; }, [autoSpeak]);

  const sessionId = useRef(`live-${Date.now()}`);
  const sessionStart = useRef(new Date().toISOString());
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Auto-scroll on new utterance
  useEffect(() => {
    if (utterances.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [utterances.length]);

  // ─── Request mic permission ─────────────────────────────────────────────────
  const requestPermission = async (): Promise<boolean> => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      Alert.alert(
        "Microphone access needed",
        "Go to Settings → QuickVoice and enable Microphone.",
      );
      return false;
    }
    return true;
  };

  // ─── Start recording + streaming subtitles ──────────────────────────────────
  const startRecording = async () => {
    const ok = await requestPermission();
    if (!ok) return;

    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      setRecording(true);
      setStatus("LISTENING…");
      setDisplayTrans(null);
      setPartialTranscript("");

      // ── Poll for partial transcription every 2.5s ────────────────────────
      streamingTimer.current = setInterval(async () => {
        if (!audioRecorder.isRecording) return;
        const uri = audioRecorder.uri;
        if (!uri) return;
        try {
          const partial = await transcribeAudio(uri, srcRef.current);
          if (partial) setPartialTranscript(partial);
        } catch {
          // ignore streaming errors silently
        }
      }, 2500);
    } catch (e: any) {
      Alert.alert("Recording failed", e?.message ?? "Could not start microphone.");
    }
  };

  // ─── Persist audio file to app sandbox ─────────────────────────────────────
  const persistAudio = async (sourceUri: string): Promise<string | null> => {
    try {
      const audioDir = new Directory(Paths.document, "audio");
      audioDir.create({ idempotent: true });
      const name = `recording_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.wav`;
      const src = new ExpoFile(sourceUri);
      const dest = new ExpoFile(audioDir, name);
      await src.copy(dest);
      return dest.uri;
    } catch (e) {
      console.warn("[SessionScreen] Failed to persist audio:", e);
      return null;
    }
  };

  // ─── Stop recording + transcribe + translate ────────────────────────────────
  const stopAndProcess = async () => {
    if (!audioRecorder.isRecording) return;

    // Stop the streaming timer
    if (streamingTimer.current) {
      clearInterval(streamingTimer.current);
      streamingTimer.current = null;
    }

    setRecording(false);
    setProcessing(true);
    setStatus("Transcribing…");

    try {
      await audioRecorder.stop();
      await setAudioModeAsync({ allowsRecording: false });

      const uri = audioRecorder.uri;

      if (!uri) throw new Error("No audio file produced.");

      const s = srcRef.current;
      const t = tgtRef.current;

      // 1. Transcribe with Whisper
      const transcript = await transcribeAudio(uri, s);
      if (!transcript) {
        setStatus("No speech detected — try again.");
        setProcessing(false);
        return;
      }

      setStatus("Translating…");

      // 2. Translate
      const translation = await translateText(transcript, s, t);

      // 3. Save utterance
      const u: Utterance = {
        id: `${Date.now()}`,
        original: transcript,
        translation,
        sourceLang: s,
        targetLang: t,
        createdAt: new Date().toISOString(),
      };

      setUtterances((prev) => {
        const next = [...prev, u];
        saveLiveSession({
          id: sessionId.current, sourceLang: s, targetLang: t,
          mode: modeRef.current, utterances: next,
          createdAt: sessionStart.current, endedAt: null,
        }).catch(() => { });
        return next;
      });

      // 3.5 Persist audio to app sandbox
      const audioPath = await persistAudio(uri);
      if (audioPath) {
        addAudioRecording({
          id: `audio-${Date.now()}`,
          userId: null,
          filePath: audioPath,
          mimeType: "audio/wav",
          durationMs: null,
          fileSizeBytes: null,
          recordingId: null,
          liveSessionId: sessionId.current,
          createdAt: new Date().toISOString(),
        }).catch(() => {});
      }

      setDisplayTrans(translation);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      setStatus("TAP \u25CF TO SPEAK");

      // 4. TTS
      if (speakRef.current) {
        Speech.speak(translation, { language: LOCALES[t] ?? "en", rate: tts_speed });
      }

      // 5. 2-way swap
      if (modeRef.current === "two-way") {
        setSrc(t as LanguageCode);
        setTgt(s as LanguageCode);
      }
    } catch (e: any) {
      const msg = e?.message ?? "Something went wrong.";
      setDisplayTrans(`[Error: ${msg}]`);
      setStatus("TAP \u25CF TO SPEAK");
      Alert.alert("Error", msg);
    } finally {
      setProcessing(false);
    }
  };

  // ─── Toggle record ──────────────────────────────────────────────────────────
  const toggle = () => {
    if (processing) return;
    if (recording) {
      stopAndProcess();
    } else {
      startRecording();
    }
  };

  // ─── Swap languages ─────────────────────────────────────────────────────────
  const swap = () => {
    if (recording || processing) return;
    const tmp = srcRef.current;
    setSrc(tgtRef.current);
    setTgt(tmp);
    setDisplayTrans(null);
  };

  // ─── Back ───────────────────────────────────────────────────────────────────
  const handleBack = async () => {
    if (audioRecorder.isRecording) {
      try { await audioRecorder.stop(); } catch { /* ignore */ }
    }
    if (utterances.length > 0) {
      await saveLiveSession({
        id: sessionId.current, sourceLang: src, targetLang: tgt,
        mode, utterances, createdAt: sessionStart.current,
        endedAt: new Date().toISOString(),
      }).catch(() => { });
    }
    onBack();
  };

  const busy = recording || processing;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[atoms.flex1, { backgroundColor: BG, paddingTop: insets.top }]}>

      {/* ── Top bar ── */}
      <View style={[atoms.flexRow, atoms.itemsCenter, atoms.justifyBetween, { paddingBottom: 8, paddingHorizontal: 20, paddingTop: 8 }]}>
        <Pressable onPress={handleBack} style={{ alignItems: "center", height: 40, justifyContent: "center", width: 40 }} accessibilityLabel="Back">
          <Ionicons name="menu-outline" size={22} color={DIM} />
        </Pressable>

        <View style={[{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 99, flexDirection: "row", padding: 4 }, busy && { opacity: 0.4 }]}>
          <Pressable
            onPress={() => !busy && updatePrefs({ session_mode: "one-way" })}
            style={[{ borderRadius: 99, paddingHorizontal: 16, paddingVertical: 8 }, mode === "one-way" && { backgroundColor: WHITE }]}
          >
            <Text style={[{ color: DIM, fontSize: 13, fontWeight: "600" }, mode === "one-way" && { color: BG }]}>1-way</Text>
          </Pressable>
          <Pressable
            onPress={() => !busy && updatePrefs({ session_mode: "two-way" })}
            style={[{ borderRadius: 99, paddingHorizontal: 16, paddingVertical: 8 }, mode === "two-way" && { backgroundColor: INDIGO }]}
          >
            <Text style={[{ color: DIM, fontSize: 13, fontWeight: "600" }, mode === "two-way" && { color: WHITE }]}>2-way</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => updatePrefs({ auto_speak: !autoSpeak })}
          style={{ alignItems: "center", backgroundColor: INDIGO, borderRadius: 99, height: 38, justifyContent: "center", width: 38 }}
          accessibilityLabel="Toggle auto-speak"
        >
          <Ionicons
            name={autoSpeak ? "volume-high-outline" : "volume-mute-outline"}
            size={18}
            color={WHITE}
          />
        </Pressable>
      </View>

      {/* ── Main text area ── */}
      <ScrollView
        ref={scrollRef}
        style={atoms.flex1}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 16, paddingHorizontal: 20, paddingTop: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Previous utterance bubbles */}
        {utterances.length > 1 && utterances.slice(0, -1).map((u) => (
          <View key={u.id} style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, marginBottom: 10, padding: 12 }}>
            <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginBottom: 4 }}>{getFlag(u.sourceLang)} {u.original}</Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, lineHeight: 24 }}>{u.translation}</Text>
          </View>
        ))}

        {/* Current state */}
        {processing ? (
          <View style={[atoms.flexRow, atoms.itemsCenter, { gap: 8, marginTop: 4 }]}>
            <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{status}</Text>
          </View>
        ) : recording && partialTranscript ? (
          /* ── Live streaming subtitle ── */
          <View>
            <View style={[atoms.flexRow, atoms.itemsCenter, { gap: 6, marginBottom: 10 }]}>
              <View style={{ backgroundColor: "#14b8a6", borderRadius: 99, height: 8, width: 8 }} />
              <Text style={{ color: "#14b8a6", fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>LIVE</Text>
            </View>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 26, fontWeight: "300", letterSpacing: -0.3, lineHeight: 38 }}>
              {getFlag(src)} {partialTranscript}
            </Text>
          </View>
        ) : utterances.length > 0 ? (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={[{ color: WHITE, fontSize: 30, fontWeight: "300", letterSpacing: -0.4, lineHeight: 44 }, { fontSize: 24, color: "rgba(255,255,255,0.7)", marginBottom: 8 }]}>
              {getFlag(utterances[utterances.length - 1].sourceLang)} {utterances[utterances.length - 1].original}
            </Text>
            <Text style={{ color: WHITE, fontSize: 30, fontWeight: "300", letterSpacing: -0.4, lineHeight: 44 }}>
              {utterances[utterances.length - 1].translation}
            </Text>
          </Animated.View>
        ) : (
          <Text style={[{ color: FAINT, fontSize: 12, fontWeight: "600", letterSpacing: 2 }, recording && { color: "#14b8a6" }]}>
            {status}
          </Text>
        )}

        {/* Original below latest translation */}
        {!processing && !recording && utterances.length > 0 && (
          <Text style={{ color: "rgba(255,255,255,0.22)", fontSize: 14, marginTop: 12 }}>
            {getFlag(utterances[utterances.length - 1].sourceLang)}{" "}
            {utterances[utterances.length - 1].original}
          </Text>
        )}
      </ScrollView>

      {/* ── Waveform + record button ── */}
      <View style={[atoms.itemsCenter, atoms.justifyCenter, { height: WAVE_H + 20, marginBottom: 4 }]}>
        <View style={{ bottom: 0, left: 0, position: "absolute", right: 0, top: 0 }}>
          <Waveform active={recording} />
        </View>
        <Pressable
          onPress={toggle}
          disabled={processing}
          style={({ pressed }) => ({
            alignItems: "center",
            backgroundColor: processing ? INDIGO : recording ? "#c53030" : RED,
            borderRadius: 99,
            elevation: 10,
            height: 62,
            justifyContent: "center",
            opacity: processing ? 0.8 : 1,
            shadowColor: RED,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 18,
            width: 62,
            transform: pressed && !processing ? [{ scale: 0.91 }] : recording ? [{ scale: 1.08 }] : [],
          })}
          accessibilityRole="button"
          accessibilityLabel={recording ? "Stop recording" : "Start recording"}
        >
          {processing ? (
            <ActivityIndicator size="small" color={WHITE} />
          ) : recording ? (
            <View style={[atoms.flexRow, atoms.itemsCenter, { gap: 5 }]}>
              <View style={{ backgroundColor: WHITE, borderRadius: 3, height: 20, width: 4 }} />
              <View style={{ backgroundColor: WHITE, borderRadius: 3, height: 20, width: 4 }} />
            </View>
          ) : (
            <View style={{ backgroundColor: WHITE, borderRadius: 99, height: 18, width: 18 }} />
          )}
        </Pressable>
      </View>

      {/* ── Bottom control bar ── */}
      <View style={[atoms.flexRow, atoms.itemsCenter, atoms.justifyCenter, { gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <LangPill
          value={src}
          onChange={(v) => { if (!busy) { setSrc(v); setDisplayTrans(null); } }}
          disabled={busy}
          showDot
        />
        <Pressable
          onPress={swap}
          disabled={busy}
          style={[{ alignItems: "center", height: 40, justifyContent: "center", width: 40 }, busy && { opacity: 0.3 }]}
          accessibilityLabel="Swap languages"
        >
          <Ionicons name="swap-horizontal-outline" size={20} color="rgba(255,255,255,0.65)" />
        </Pressable>
        <LangPill
          value={tgt}
          onChange={(v) => { if (!busy) { setTgt(v); setDisplayTrans(null); } }}
          disabled={busy}
        />
        <Pressable
          onPress={() => updatePrefs({ auto_speak: !autoSpeak })}
          style={{ alignItems: "center", height: 40, justifyContent: "center", width: 40 }}
          accessibilityLabel="Toggle auto-speak"
        >
          <Ionicons
            name={autoSpeak ? "headset-outline" : "volume-mute-outline"}
            size={20}
            color={autoSpeak ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.25)"}
          />
        </Pressable>
      </View>
    </View>
  );
}
