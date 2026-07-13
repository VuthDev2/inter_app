/**
 * SessionScreen — native audio recording + Whisper transcription
 *
 * Flow:
 *   1. User taps record → expo-av starts recording to a temp file
 *   2. User taps stop  → file sent to OpenAI Whisper /v1/audio/transcriptions
 *   3. Transcript → /api/translate (backend) or MyMemory fallback
 *   4. Translation displayed + spoken via expo-speech
 *   5. 2-way mode: languages swap after each utterance
 */
import { Ionicons } from "@expo/vector-icons";
import {
  useAudioRecorder,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from "expo-audio";
import * as Speech from "expo-speech";
import * as FileSystem from "expo-file-system/legacy";
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

import { translateText } from "../api";
import { languages, type LanguageCode } from "../data";
import { saveLiveSession } from "../storage";

// ─── BCP-47 locale map ────────────────────────────────────────────────────────
const LOCALES: Record<string, string> = {
  en: "en", ja: "ja", es: "es", fr: "fr",
  de: "de", zh: "zh", ko: "ko", kh: "km",
};

// ─── Dark palette ─────────────────────────────────────────────────────────────
const BG      = "#0c0e17";
const SURFACE = "#252836";
const INDIGO  = "#6366f1";
const RED     = "#e53e3e";
const WHITE   = "#FFFFFF";
const DIM     = "rgba(255,255,255,0.55)";
const FAINT   = "rgba(255,255,255,0.18)";
const BDRY    = "rgba(255,255,255,0.08)";

// ─── Language helpers ─────────────────────────────────────────────────────────
const FLAGS: Record<string, string> = {
  en: "🇺🇸", ja: "🇯🇵", es: "🇪🇸", fr: "🇫🇷",
  de: "🇩🇪", zh: "🇨🇳", ko: "🇰🇷", kh: "🇰🇭",
};
const getFlag  = (c: string) => FLAGS[c] ?? "🌐";
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
  pill:       { alignItems: "center", backgroundColor: SURFACE, borderRadius: 99, flexDirection: "row", gap: 6, paddingHorizontal: 14, paddingVertical: 11 },
  pillOff:    { opacity: 0.4 },
  dot:        { backgroundColor: RED, borderRadius: 99, height: 13, width: 13 },
  flag:       { fontSize: 15 },
  lbl:        { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "500" },
  backdrop:   { backgroundColor: "rgba(0,0,0,0.55)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  sheet:      { backgroundColor: "#1c1f2e", borderTopLeftRadius: 24, borderTopRightRadius: 24, bottom: 0, left: 0, maxHeight: "62%", paddingBottom: 32, paddingHorizontal: 20, paddingTop: 12, position: "absolute", right: 0 },
  handle:     { alignSelf: "center", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 3, height: 4, marginBottom: 16, width: 40 },
  sheetTitle: { color: WHITE, fontSize: 15, fontWeight: "700", marginBottom: 12 },
  item:       { alignItems: "center", flexDirection: "row", gap: 12, paddingVertical: 14 },
  itemBorder: { borderBottomColor: BDRY, borderBottomWidth: 1 },
  itemFlag:   { fontSize: 18 },
  itemText:   { color: DIM, flex: 1, fontSize: 15 },
  itemSel:    { color: WHITE, fontWeight: "600" },
});

// ─── Mock transcription for testing ─────────────────────────────────────────────
async function transcribeAudio(fileUri: string, language: string): Promise<string> {
  // Simulate network delay so it feels real
  await new Promise(resolve => setTimeout(resolve, 1500));

  if (LOCALES[language] === "ja") {
    return "こんにちは！これはテストです。お疲れ様でした。";
  }
  
  return "Hello! This is a test transcription. You have worked so hard and you can finally rest now!";
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
type Mode = "one-way" | "two-way";

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
  const insets    = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [src, setSrc]             = useState<LanguageCode>(initialSource);
  const [tgt, setTgt]             = useState<LanguageCode>(initialTarget);
  const [mode, setMode]           = useState<Mode>("one-way");
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [status, setStatus]       = useState<string>("TAP \u25CF TO SPEAK");

  const [utterances, setUtterances]     = useState<Utterance[]>([]);
  const [displayTrans, setDisplayTrans] = useState<string | null>(null);

  const srcRef   = useRef(src);   useEffect(() => { srcRef.current = src; }, [src]);
  const tgtRef   = useRef(tgt);   useEffect(() => { tgtRef.current = tgt; }, [tgt]);
  const modeRef  = useRef(mode);  useEffect(() => { modeRef.current = mode; }, [mode]);
  const speakRef = useRef(autoSpeak); useEffect(() => { speakRef.current = autoSpeak; }, [autoSpeak]);

  const sessionId    = useRef(`live-${Date.now()}`);
  const sessionStart = useRef(new Date().toISOString());
  const fadeAnim     = useRef(new Animated.Value(1)).current;

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

  // ─── Start recording ────────────────────────────────────────────────────────
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
    } catch (e: any) {
      Alert.alert("Recording failed", e?.message ?? "Could not start microphone.");
    }
  };

  // ─── Stop recording + transcribe + translate ────────────────────────────────
  const stopAndProcess = async () => {
    if (!audioRecorder.isRecording) return;

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
        }).catch(() => {});
        return next;
      });

      setDisplayTrans(translation);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      setStatus("TAP \u25CF TO SPEAK");

      // 4. TTS
      if (speakRef.current) {
        Speech.speak(translation, { language: LOCALES[t] ?? "en" });
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
      }).catch(() => {});
    }
    onBack();
  };

  const busy = recording || processing;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[ss.root, { paddingTop: insets.top }]}>

      {/* ── Top bar ── */}
      <View style={ss.topBar}>
        <Pressable onPress={handleBack} style={ss.iconBtn} accessibilityLabel="Back">
          <Ionicons name="menu-outline" size={22} color={DIM} />
        </Pressable>

        <View style={[ss.modePill, busy && ss.modePillDim]}>
          <Pressable
            onPress={() => !busy && setMode("one-way")}
            style={[ss.modeBtn, mode === "one-way" && ss.modeBtnWhite]}
          >
            <Text style={[ss.modeTxt, mode === "one-way" && ss.modeTxtDark]}>1-way</Text>
          </Pressable>
          <Pressable
            onPress={() => !busy && setMode("two-way")}
            style={[ss.modeBtn, mode === "two-way" && ss.modeBtnIndigo]}
          >
            <Text style={[ss.modeTxt, mode === "two-way" && ss.modeTxtWhite]}>2-way</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => setAutoSpeak((v) => !v)}
          style={ss.settingsBtn}
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
        style={ss.textArea}
        contentContainerStyle={ss.textContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Previous utterance bubbles */}
        {utterances.length > 1 && utterances.slice(0, -1).map((u) => (
          <View key={u.id} style={ss.bubble}>
            <Text style={ss.bubbleOrig}>{getFlag(u.sourceLang)} {u.original}</Text>
            <Text style={ss.bubbleTrans}>{u.translation}</Text>
          </View>
        ))}

        {/* Current state */}
        {processing ? (
          <View style={ss.loadingRow}>
            <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
            <Text style={ss.loadingTxt}>{status}</Text>
          </View>
        ) : utterances.length > 0 ? (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={[ss.transText, { fontSize: 24, color: "rgba(255,255,255,0.7)", marginBottom: 8 }]}>
              {getFlag(utterances[utterances.length - 1].sourceLang)} {utterances[utterances.length - 1].original}
            </Text>
            <Text style={ss.transText}>
              {utterances[utterances.length - 1].translation}
            </Text>
          </Animated.View>
        ) : (
          <Text style={[ss.placeholder, recording && ss.placeholderActive]}>
            {status}
          </Text>
        )}

        {/* Original below latest translation */}
        {!processing && utterances.length > 0 && (
          <Text style={ss.origBelow}>
            {getFlag(utterances[utterances.length - 1].sourceLang)}{" "}
            {utterances[utterances.length - 1].original}
          </Text>
        )}
      </ScrollView>

      {/* ── Waveform + record button ── */}
      <View style={ss.waveContainer}>
        <View style={ss.waveRow}>
          <Waveform active={recording} />
        </View>
        <Pressable
          onPress={toggle}
          disabled={processing}
          style={({ pressed }) => [
            ss.recBtn,
            recording && ss.recBtnActive,
            pressed && !processing && ss.recBtnDown,
            processing && ss.recBtnProcessing,
          ]}
          accessibilityRole="button"
          accessibilityLabel={recording ? "Stop recording" : "Start recording"}
        >
          {processing ? (
            <ActivityIndicator size="small" color={WHITE} />
          ) : recording ? (
            <View style={ss.pauseWrap}>
              <View style={ss.pauseBar} />
              <View style={ss.pauseBar} />
            </View>
          ) : (
            <View style={ss.recDot} />
          )}
        </Pressable>
      </View>

      {/* ── Bottom control bar ── */}
      <View style={[ss.controlBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <LangPill
          value={src}
          onChange={(v) => { if (!busy) { setSrc(v); setDisplayTrans(null); } }}
          disabled={busy}
          showDot
        />
        <Pressable
          onPress={swap}
          disabled={busy}
          style={[ss.iconBtn, busy && ss.iconBtnDim]}
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
          onPress={() => setAutoSpeak((v) => !v)}
          style={ss.iconBtn}
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  root:     { backgroundColor: BG, flex: 1 },

  topBar:       { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingBottom: 8, paddingHorizontal: 20, paddingTop: 8 },
  iconBtn:      { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  iconBtnDim:   { opacity: 0.3 },
  settingsBtn:  { alignItems: "center", backgroundColor: INDIGO, borderRadius: 99, height: 38, justifyContent: "center", width: 38 },

  modePill:      { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 99, flexDirection: "row", padding: 4 },
  modePillDim:   { opacity: 0.4 },
  modeBtn:       { borderRadius: 99, paddingHorizontal: 16, paddingVertical: 8 },
  modeBtnWhite:  { backgroundColor: WHITE },
  modeBtnIndigo: { backgroundColor: INDIGO },
  modeTxt:       { color: DIM, fontSize: 13, fontWeight: "600" },
  modeTxtDark:   { color: BG },
  modeTxtWhite:  { color: WHITE },

  textArea:    { flex: 1 },
  textContent: { flexGrow: 1, paddingBottom: 16, paddingHorizontal: 20, paddingTop: 14 },

  transText:        { color: WHITE, fontSize: 30, fontWeight: "300", letterSpacing: -0.4, lineHeight: 44 },
  placeholder:      { color: FAINT, fontSize: 12, fontWeight: "600", letterSpacing: 2 },
  placeholderActive:{ color: "#14b8a6", fontSize: 12, fontWeight: "600", letterSpacing: 2 },

  loadingRow:  { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 4 },
  loadingTxt:  { color: "rgba(255,255,255,0.4)", fontSize: 13 },
  origBelow:   { color: "rgba(255,255,255,0.22)", fontSize: 14, marginTop: 12 },

  bubble:      { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, marginBottom: 10, padding: 12 },
  bubbleOrig:  { color: "rgba(255,255,255,0.35)", fontSize: 12, marginBottom: 4 },
  bubbleTrans: { color: "rgba(255,255,255,0.7)", fontSize: 16, lineHeight: 24 },

  waveContainer:   { alignItems: "center", height: WAVE_H + 20, justifyContent: "center", marginBottom: 4 },
  waveRow:         { bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  recBtn:          { alignItems: "center", backgroundColor: RED, borderRadius: 99, elevation: 10, height: 62, justifyContent: "center", shadowColor: RED, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 18, width: 62 },
  recBtnActive:    { backgroundColor: "#c53030", transform: [{ scale: 1.08 }] },
  recBtnDown:      { transform: [{ scale: 0.91 }] },
  recBtnProcessing:{ backgroundColor: INDIGO, opacity: 0.8 },
  recDot:          { backgroundColor: WHITE, borderRadius: 99, height: 18, width: 18 },
  pauseWrap:       { alignItems: "center", flexDirection: "row", gap: 5 },
  pauseBar:        { backgroundColor: WHITE, borderRadius: 3, height: 20, width: 4 },

  controlBar: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "center", paddingHorizontal: 16, paddingTop: 10 },
});
