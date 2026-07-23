
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePreferences } from "../features/preferences/context";
import TTSService from "../features/live-interpreter/services/tts/TTSService";
import { useLiveInterpretation } from "../hooks/useLiveInterpretation";
import { AnchoredMenu } from "../components/AnchoredMenu";
import { atoms } from "../theme/atoms";
import { languages, type LanguageCode } from "../constants/data";
import { saveLiveSessionLocally } from "../services/storage";

// ─── iOS-inspired palette ─────────────────────────────────────────────────────
const BG = "#F5F7FA";
const SURFACE = "#FFFFFF";
const INDIGO = "#007AFF";
const RED = "#e53e3e";
const WHITE = "#FFFFFF";
const DIM = "#6E7785";
const FAINT = "#A0A7B2";

// ─── Language helpers ─────────────────────────────────────────────────────────
const FLAGS: Record<string, string> = {
  en: "🇺🇸", ja: "🇯🇵", es: "🇪🇸", fr: "🇫🇷",
  de: "🇩🇪", zh: "🇨🇳", ko: "🇰🇷", kh: "🇰🇭",
};
const getFlag = (c: string) => FLAGS[c] ?? "🌐";
const getLabel = (c: string) => languages.find((l) => l.code === c)?.label ?? c;
const INPUT_PROMPTS: Partial<Record<LanguageCode, string>> = {
  en: "Type something…",
  ja: "日本語を入力…",
  kh: "សូមវាយអត្ថបទ…",
};
const LISTENING_LABELS: Partial<Record<LanguageCode, string>> = {
  en: "Listening…",
  ja: "聞き取り中…",
  kh: "កំពុងស្តាប់…",
};
const WAITING_LABELS: Partial<Record<LanguageCode, string>> = {
  en: "Waiting…",
  ja: "待機中…",
  kh: "កំពុងរង់ចាំ…",
};
const inputPrompt = (code: LanguageCode) => INPUT_PROMPTS[code] ?? `${getLabel(code)} text…`;

// ─── Waveform ─────────────────────────────────────────────────────────────────
const WAVE_H = 42;
const BAR_PX = [12, 19, 29, 20, 34, 25, 16, 27, 38, 23, 31, 18, 26, 14, 21, 11];

function Waveform({ active }: { active: boolean }) {
  const levels = useRef(BAR_PX.map(() => new Animated.Value(0.35))).current;

  useEffect(() => {
    if (active) {
      const animations = levels.map((level, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay((index % 5) * 34),
            Animated.timing(level, {
              duration: 230 + (index % 4) * 48,
              easing: Easing.inOut(Easing.sin),
              toValue: 0.72 + (index % 3) * 0.14,
              useNativeDriver: true,
            }),
            Animated.timing(level, {
              duration: 270 + ((index + 2) % 5) * 42,
              easing: Easing.inOut(Easing.sin),
              toValue: 0.28 + (index % 4) * 0.05,
              useNativeDriver: true,
            }),
          ])
        )
      );
      Animated.parallel(animations).start();
    } else {
      levels.forEach((level) => {
        level.stopAnimation();
        level.setValue(0.35);
      });
    }
  }, [active, levels]);

  return (
    <View style={wv.row}>
      {BAR_PX.map((h, i) => {
        return (
          <Animated.View
            key={i}
            style={[wv.bar, {
              height: h,
              opacity: active ? 0.9 : 0.32,
              transform: [{ scaleY: active ? levels[i] : 0.35 }],
            }]}
          />
        );
      })}
    </View>
  );
}

const wv = StyleSheet.create({
  row: { alignItems: "center", flex: 1, flexDirection: "row", gap: 4, justifyContent: "center", paddingHorizontal: 4 },
  bar: { backgroundColor: "#4A90F7", borderRadius: 99, width: 4 },
});

// ─── Language pill + picker ───────────────────────────────────────────────────
function LangPill({ value, onChange, disabled, showDot = false }: {
  value: LanguageCode;
  onChange: (v: LanguageCode) => void;
  disabled: boolean;
  showDot?: boolean;
}) {
  return (
    <AnchoredMenu
      items={languages.filter((language) => language.code === "en" || language.code === "ja").map((language) => ({
        key: language.code,
        label: `${getFlag(language.code)}  ${language.label}`,
        selected: language.code === value,
        onPress: () => onChange(language.code as LanguageCode),
      }))}
      width={190}
    >
      {(open) => (
        <Pressable disabled={disabled} onPress={open} style={[pl.pill, disabled && pl.pillOff]}>
          {showDot ? <View style={pl.dot} /> : <Text style={pl.flag}>{getFlag(value)}</Text>}
          <Text style={pl.lbl}>{getLabel(value)}</Text>
          <Ionicons name="chevron-down" size={11} color="#6E7785" />
        </Pressable>
      )}
    </AnchoredMenu>
  );
}

const pl = StyleSheet.create({
  pill: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "#EEF0F3", borderColor: "#D7DBE1", borderRadius: 99, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 6, paddingHorizontal: 13, paddingVertical: 10 },
  pillOff: { opacity: 0.4 },
  dot: { backgroundColor: RED, borderRadius: 99, height: 13, width: 13 },
  flag: { fontSize: 15 },
  lbl: { color: "#171A20", fontSize: 13, fontWeight: "600" },
});

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
  embedded = false,
  active = true,
}: {
  initialSource: LanguageCode;
  initialTarget: LanguageCode;
  onBack?: () => void;
  embedded?: boolean;
  active?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { session_mode: mode, auto_speak: autoSpeak, tts_speed, update: updatePrefs } = usePreferences();
  const sessionMode = embedded ? "two-way" : mode;

  const [src, setSrc] = useState<LanguageCode>(initialSource);
  const [tgt, setTgt] = useState<LanguageCode>(initialTarget);
  const [draftSource, setDraftSource] = useState("");
  const [draftTarget, setDraftTarget] = useState("");
  const [status, setStatus] = useState<string>("TAP \u25CF TO SPEAK");
  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const live = useLiveInterpretation(src, tgt);

  const srcRef = useRef(src); useEffect(() => { srcRef.current = src; }, [src]);
  const tgtRef = useRef(tgt); useEffect(() => { tgtRef.current = tgt; }, [tgt]);
  const modeRef = useRef(sessionMode); useEffect(() => { modeRef.current = sessionMode; }, [sessionMode]);
  const speakRef = useRef(autoSpeak); useEffect(() => { speakRef.current = autoSpeak; }, [autoSpeak]);
  const speedRef = useRef(tts_speed); useEffect(() => { speedRef.current = tts_speed; }, [tts_speed]);
  const handledEntryIdRef = useRef<string | null>(null);

  const sessionId = useRef(`live-${Date.now()}`);
  const sessionStart = useRef(new Date().toISOString());
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const controlTransition = useRef(new Animated.Value(live.isListening ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(controlTransition, {
      duration: 520,
      easing: Easing.inOut(Easing.cubic),
      toValue: live.isListening ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [controlTransition, live.isListening]);

  // Auto-scroll on new utterance
  useEffect(() => {
    if (utterances.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [utterances.length]);

  useEffect(() => {
    if (live.error) {
      setStatus(live.error);
    } else if (live.isListening) {
      setStatus("LISTENING…");
    } else {
      setStatus("TAP \u25CF TO SPEAK");
    }
  }, [live.error, live.isListening]);

  useEffect(() => {
    const latest = live.entries[live.entries.length - 1];
    if (!latest || handledEntryIdRef.current === latest.id) return;
    handledEntryIdRef.current = latest.id;

    const s = latest.sourceLang;
    const t = latest.targetLang;
    const utterance: Utterance = {
      id: latest.id,
      original: latest.original,
      translation: latest.translation,
      sourceLang: s,
      targetLang: t,
      createdAt: new Date().toISOString(),
    };

    setUtterances((prev) => {
      const next = [...prev, utterance];
      saveLiveSessionLocally({
        id: sessionId.current, sourceLang: s, targetLang: t,
        mode: modeRef.current, utterances: next,
        createdAt: sessionStart.current, endedAt: null,
      }).catch(() => { });
      return next;
    });

    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();

    // Do not play generated audio into an always-live microphone. On iOS that
    // interrupts the next recognition task and prevents person two from being
    // heard. The translation card's Play button remains available.
    if (speakRef.current && latest.translation && !live.isListening) {
      void TTSService.speak(
        latest.translation,
        t === "ja" ? "ja" : "en",
        speedRef.current,
      ).catch(() => undefined);
    }

    if (embedded || modeRef.current === "two-way") {
      setSrc(t as LanguageCode);
      setTgt(s as LanguageCode);
    }
  }, [embedded, fadeAnim, live.entries, live.isListening]);

  // ─── Toggle record ──────────────────────────────────────────────────────────
  const toggle = () => {
    if (live.isListening) {
      live.stop();
    } else {
      live.start();
    }
  };

  // ─── Swap languages ─────────────────────────────────────────────────────────
  const swap = () => {
    if (live.isListening) return;
    const tmp = srcRef.current;
    setSrc(tgtRef.current);
    setTgt(tmp);
  };

  // ─── Back ───────────────────────────────────────────────────────────────────
  const handleBack = async () => {
    if (live.isListening) live.stop();
    if (utterances.length > 0) {
      await saveLiveSessionLocally({
        id: sessionId.current, sourceLang: src, targetLang: tgt,
        mode: sessionMode, utterances, createdAt: sessionStart.current,
        endedAt: new Date().toISOString(),
      }).catch(() => { });
    }
    onBack?.();
  };

  const busy = live.isListening;
  const laneForLanguage = (language: LanguageCode | string) =>
    language === initialTarget ? ss.cardRight : ss.cardLeft;

  useEffect(() => {
    if (!active && live.isListening) live.stop();
  }, [active, live.isListening, live.stop]);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[atoms.flex1, { backgroundColor: BG, paddingTop: insets.top }]}>
      <View style={ss.topBar}>
        {embedded ? <View style={ss.circleButtonPlaceholder} /> : (
          <Pressable onPress={handleBack} style={ss.circleButton} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={22} color="#171A20" />
          </Pressable>
        )}
        <Text style={ss.screenTitle}>Live Interpreter</Text>
        <AnchoredMenu
          items={[
            {
              key: "auto-speak",
              label: autoSpeak ? "Turn Off Auto-Speak" : "Turn On Auto-Speak",
              icon: autoSpeak ? "volume-mute-outline" : "volume-high-outline",
              onPress: () => updatePrefs({ auto_speak: !autoSpeak }),
            },
            {
              key: "swap",
              label: "Swap Languages",
              icon: "swap-horizontal-outline",
              disabled: live.isListening,
              onPress: swap,
            },
          ]}
        >
          {(open) => (
            <Pressable onPress={open} style={ss.circleButton} accessibilityLabel="Live Interpreter actions">
              <Ionicons name="ellipsis-horizontal" size={21} color="#303640" />
            </Pressable>
          )}
        </AnchoredMenu>
      </View>

      <ScrollView
        alwaysBounceVertical={false}
        bounces={false}
        ref={scrollRef}
        style={[atoms.flex1, ss.conversationViewport]}
        contentContainerStyle={ss.conversation}
        overScrollMode="never"
        scrollsToTop
        showsVerticalScrollIndicator={false}
      >
        {live.error ? <View style={ss.errorCard}><Ionicons name="alert-circle-outline" size={20} color="#C63B32" /><Text style={ss.errorText}>{live.error}</Text></View> : null}

        {utterances.map((u, index) => (
          <Animated.View key={u.id} style={[ss.card, laneForLanguage(u.sourceLang), index === utterances.length - 1 && { opacity: fadeAnim }]}>
            <View style={ss.cardHeader}>
              <Text style={ss.cardLanguage}>{getLabel(u.sourceLang)}</Text>
              <Pressable
                onPress={() => {
                  void TTSService.speak(
                    u.translation,
                    u.targetLang === "ja" ? "ja" : "en",
                    speedRef.current,
                  ).catch((error: unknown) => {
                    Alert.alert(
                      "Audio unavailable",
                      error instanceof Error ? error.message : "Could not generate speech.",
                    );
                  });
                }}
                style={ss.playButton}
                accessibilityLabel="Play translation"
              >
                <Ionicons name="play" size={13} color={WHITE} />
              </Pressable>
            </View>
            <Text style={ss.cardOriginal}>{u.original}</Text>
            <View style={ss.divider} />
            <Text style={ss.translationLabel}>{getLabel(u.targetLang)}</Text>
            <Text style={ss.cardTranslation}>{u.translation}</Text>
          </Animated.View>
        ))}
      </ScrollView>

        <View style={ss.liveStatus}>
          <View style={[ss.waitingCard, ss.cardRight]}>
            <LangPill value={tgt} onChange={(value) => { if (!busy) setTgt(value); }} disabled={busy} />
            <View style={ss.contentTransition}>
              <Animated.View
                pointerEvents={busy ? "none" : "auto"}
                style={{
                  opacity: controlTransition.interpolate({ inputRange: [0, 0.62, 1], outputRange: [1, 0, 0] }),
                  transform: [{ translateY: controlTransition.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }],
                }}
              >
                <TextInput multiline editable={!busy} onChangeText={setDraftTarget} placeholder={inputPrompt(tgt)} placeholderTextColor={FAINT} scrollEnabled={false} style={ss.draftInput} value={draftTarget} />
              </Animated.View>
              <Animated.Text
                style={[
                  ss.waitingText,
                  ss.transitionText,
                  {
                    opacity: controlTransition.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0, 1] }),
                    transform: [{ translateY: controlTransition.interpolate({ inputRange: [0, 1], outputRange: [5, 0] }) }],
                  },
                ]}
              >
                {WAITING_LABELS[tgt] ?? "Waiting…"}
              </Animated.Text>
            </View>
          </View>
          <View style={[ss.waitingCard, ss.cardLeft]}>
            <LangPill value={src} onChange={(value) => { if (!busy) setSrc(value); }} disabled={busy} />
            <View
              style={[
                ss.contentTransition,
                live.isListening && live.interimText
                  ? { minHeight: Math.max(25, Math.ceil(live.interimText.length / (src === "ja" ? 13 : 24)) * 25) }
                  : null,
              ]}
            >
              <Animated.View
                pointerEvents={busy ? "none" : "auto"}
                style={{
                  opacity: controlTransition.interpolate({ inputRange: [0, 0.62, 1], outputRange: [1, 0, 0] }),
                  transform: [{ translateY: controlTransition.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }],
                }}
              >
                <TextInput multiline editable={!busy} onChangeText={setDraftSource} placeholder={inputPrompt(src)} placeholderTextColor={FAINT} scrollEnabled={false} style={ss.draftInput} value={draftSource} />
              </Animated.View>
              <Animated.Text
                style={[
                  ss.waitingText,
                  ss.transitionText,
                  {
                    opacity: controlTransition.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0, 1] }),
                    transform: [{ translateY: controlTransition.interpolate({ inputRange: [0, 1], outputRange: [5, 0] }) }],
                  },
                ]}
              >
                {live.interimText || LISTENING_LABELS[src] || "Listening…"}
              </Animated.Text>
            </View>
          </View>
        </View>

      <View style={[ss.listeningControl, !live.isListening && ss.listeningControlIdle]}>
        <Animated.View
          pointerEvents={live.isListening ? "auto" : "none"}
          style={[
            ss.waveWrap,
            {
              opacity: controlTransition,
              transform: [{
                scale: controlTransition.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }),
              }],
            },
          ]}
        >
          <Pressable accessibilityLabel="Stop listening" accessibilityRole="button" onPress={toggle} style={ss.fill}>
            <Waveform active={live.isListening} />
          </Pressable>
        </Animated.View>
        <Animated.View
          pointerEvents={live.isListening ? "none" : "auto"}
          style={[
            ss.micLayer,
            {
              opacity: controlTransition.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              transform: [{
                scale: controlTransition.interpolate({ inputRange: [0, 1], outputRange: [1, 0.76] }),
              }],
            },
          ]}
        >
          <Pressable onPress={toggle} style={({ pressed }) => [ss.micButton, pressed && { transform: [{ scale: 0.94 }] }]} accessibilityRole="button" accessibilityLabel="Start listening">
            <Ionicons name="mic" size={35} color={WHITE} />
          </Pressable>
        </Animated.View>
        <Animated.Text style={[ss.statusText, { opacity: controlTransition.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0, 0] }) }]}>
          {status === "TAP ● TO SPEAK" ? "Tap to speak" : status}
        </Animated.Text>
      </View>
      <View style={{ height: Math.max(insets.bottom, 12) }} />
    </View>
  );
}

const ss = StyleSheet.create({
  card: { backgroundColor: SURFACE, borderRadius: 20, marginBottom: 14, maxWidth: "88%", padding: 16, shadowColor: "#182238", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 3 },
  cardHeader: { alignItems: "center", flexDirection: "row", marginBottom: 10 },
  cardLanguage: { color: "#69717E", flex: 1, fontSize: 12, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" },
  cardLeft: { alignSelf: "flex-start" },
  cardOriginal: { color: "#15181E", fontSize: 21, fontWeight: "600", letterSpacing: -0.25, lineHeight: 29 },
  cardRight: { alignSelf: "flex-end" },
  cardTranslation: { color: INDIGO, fontSize: 20, fontWeight: "600", lineHeight: 28 },
  circleButton: { alignItems: "center", backgroundColor: WHITE, borderColor: "#D7DBE1", borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, height: 40, justifyContent: "center", shadowColor: "#202838", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, width: 40 },
  circleButtonPlaceholder: { height: 40, width: 40 },
  conversation: { flexGrow: 1, justifyContent: "flex-end", paddingBottom: 12, paddingHorizontal: 20, paddingTop: 18 },
  conversationViewport: { minHeight: 0, overflow: "hidden" },
  divider: { backgroundColor: "#E9ECF1", height: StyleSheet.hairlineWidth, marginVertical: 11 },
  contentTransition: { marginTop: 10, minHeight: 25, position: "relative" },
  draftInput: { color: "#171A20", fontSize: 18, fontWeight: "500", lineHeight: 25, minHeight: 25, padding: 0, textAlignVertical: "top" },
  emptyState: { flex: 1, justifyContent: "center", minHeight: 300, transform: [{ translateY: 155 }] },
  errorCard: { alignItems: "center", backgroundColor: "#FFF0EF", borderRadius: 14, flexDirection: "row", gap: 9, marginBottom: 14, padding: 13 },
  errorText: { color: "#A5322B", flex: 1, fontSize: 13, lineHeight: 18 },
  fill: { flex: 1 },
  languageControl: { alignItems: "center", flexDirection: "row", justifyContent: "center", paddingHorizontal: 20, paddingTop: 12 },
  listeningControl: { alignItems: "center", minHeight: 104, paddingHorizontal: 28, paddingTop: 4 },
  listeningControlIdle: { minHeight: 104 },
  liveStatus: { flexShrink: 0, justifyContent: "center", minHeight: 272, paddingHorizontal: 20 },
  liveDot: { backgroundColor: "#30C574", borderRadius: 99, height: 7, marginRight: 4, width: 7 },
  liveLabel: { color: "#27985B", fontSize: 10, fontWeight: "800", letterSpacing: 0.7 },
  micButton: { alignItems: "center", backgroundColor: INDIGO, borderRadius: 999, height: 72, justifyContent: "center", shadowColor: INDIGO, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 8, width: 72 },
  micButtonActive: { backgroundColor: "#FF3B30", shadowColor: "#FF3B30", top: 30 },
  micLayer: { alignItems: "center", left: 0, position: "absolute", right: 0, top: 14 },
  modeButton: { borderRadius: 999, paddingHorizontal: 15, paddingVertical: 7 },
  modeButtonActive: { backgroundColor: WHITE, shadowColor: "#222A38", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 5 },
  modeControl: { alignSelf: "center", backgroundColor: "#E9ECF1", borderRadius: 999, flexDirection: "row", marginTop: 12, padding: 3 },
  modeText: { color: "#737B87", fontSize: 12, fontWeight: "600" },
  modeTextActive: { color: "#171A20" },
  playButton: { alignItems: "center", backgroundColor: INDIGO, borderRadius: 999, height: 28, justifyContent: "center", width: 28 },
  screenTitle: { color: "#111318", fontSize: 20, fontWeight: "700", letterSpacing: -0.35 },
  statusText: { color: DIM, fontSize: 12, fontWeight: "600", marginTop: 86 },
  swapButton: { alignItems: "center", height: 42, justifyContent: "center", marginHorizontal: 7, width: 42 },
  topBar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 8 },
  translationLabel: { color: "#8A929E", fontSize: 10, fontWeight: "700", letterSpacing: 0.6, marginBottom: 4, textTransform: "uppercase" },
  waitingCard: { backgroundColor: WHITE, borderRadius: 20, marginVertical: 9, maxWidth: "76%", minWidth: "54%", padding: 14, shadowColor: "#182238", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 18 },
  waitingLanguage: { color: "#68717D", fontSize: 12, fontWeight: "700", marginBottom: 8 },
  transitionText: { left: 0, position: "absolute", right: 0, top: 0 },
  waitingText: { color: FAINT, fontSize: 18, fontWeight: "600", lineHeight: 25 },
  waveWrap: { alignSelf: "center", height: WAVE_H, position: "absolute", top: 13, width: 140 },
});
