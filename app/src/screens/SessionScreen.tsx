import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import { LangPill } from "../components/LangPill";
import { ModeToggle } from "../components/ModeToggle";
import { RecordButton } from "../components/RecordButton";
import { UtteranceBubble } from "../components/UtteranceBubble";
import { Waveform } from "../components/Waveform";
import { LOCALES, getFlag, type LanguageCode, type Utterance } from "../constants/data";
import { usePreferences } from "../features/preferences/context";
import { useLiveInterpretation } from "../hooks/useLiveInterpretation";
import { saveLiveSession } from "../services/storage";
import { atoms } from "../theme/atoms";
import { useTheme } from "../theme/ThemeProvider";

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
  const { session_mode: mode, auto_speak: autoSpeak, tts_speed, update: updatePrefs } = usePreferences();

  const [src, setSrc] = useState<LanguageCode>(initialSource);
  const [tgt, setTgt] = useState<LanguageCode>(initialTarget);
  const [status, setStatus] = useState<string>("TAP | TO SPEAK");
  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const live = useLiveInterpretation(src, tgt);

  const srcRef = useRef(src); useEffect(() => { srcRef.current = src; }, [src]);
  const tgtRef = useRef(tgt); useEffect(() => { tgtRef.current = tgt; }, [tgt]);
  const modeRef = useRef(mode); useEffect(() => { modeRef.current = mode; }, [mode]);
  const speakRef = useRef(autoSpeak); useEffect(() => { speakRef.current = autoSpeak; }, [autoSpeak]);
  const speedRef = useRef(tts_speed); useEffect(() => { speedRef.current = tts_speed; }, [tts_speed]);
  const handledEntryIdRef = useRef<string | null>(null);

  const c = useTheme();

  const sessionId = useRef(`live-${Date.now()}`);
  const sessionStart = useRef(new Date().toISOString());
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (utterances.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [utterances.length]);

  useEffect(() => {
    if (live.error) setStatus(live.error);
    else if (live.isListening) setStatus("LISTENING…");
    else setStatus("TAP | TO SPEAK");
  }, [live.error, live.isListening]);

  useEffect(() => {
    const latest = live.entries[live.entries.length - 1];
    if (!latest || handledEntryIdRef.current === latest.id) return;
    handledEntryIdRef.current = latest.id;

    const s = srcRef.current;
    const t = tgtRef.current;
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
      saveLiveSession({
        id: sessionId.current, sourceLang: s, targetLang: t,
        mode: modeRef.current, utterances: next,
        createdAt: sessionStart.current, endedAt: null,
      }).catch(() => {});
      return next;
    });

    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();

    if (speakRef.current && latest.translation) {
      Speech.speak(latest.translation, { language: LOCALES[t] ?? "en", rate: speedRef.current });
    }

    if (modeRef.current === "two-way") {
      setSrc(t as LanguageCode);
      setTgt(s as LanguageCode);
    }
  }, [fadeAnim, live.entries]);

  const toggle = () => {
    if (live.isListening) live.stop();
    else live.start();
  };

  const swap = () => {
    if (live.isListening) return;
    const tmp = srcRef.current;
    setSrc(tgtRef.current);
    setTgt(tmp);
  };

  const handleBack = async () => {
    if (live.isListening) live.stop();
    if (utterances.length > 0) {
      await saveLiveSession({
        id: sessionId.current, sourceLang: src, targetLang: tgt,
        mode, utterances, createdAt: sessionStart.current,
        endedAt: new Date().toISOString(),
      }).catch(() => {});
    }
    onBack();
  };

  const busy = live.isListening;

  return (
    <View style={[atoms.flex1, { backgroundColor: c.background, paddingTop: insets.top }]}>

      {/* ── Top bar ── */}
      <View style={[atoms.flexRow, atoms.itemsCenter, atoms.justifyBetween, { paddingBottom: 8, paddingHorizontal: 20, paddingTop: 8 }]}>
        <Pressable onPress={handleBack} style={{ alignItems: "center", height: 40, justifyContent: "center", width: 40 }} accessibilityLabel="Back">
          <Ionicons name="menu-outline" size={22} color={c.subtleText} />
        </Pressable>

        <ModeToggle mode={mode} busy={busy} onChange={(m) => updatePrefs({ session_mode: m })} />

        <Pressable
          onPress={() => updatePrefs({ auto_speak: !autoSpeak })}
          style={{ alignItems: "center", backgroundColor: c.primary, borderRadius: 99, height: 38, justifyContent: "center", width: 38 }}
          accessibilityLabel="Toggle auto-speak"
        >
          <Ionicons
            name={autoSpeak ? "volume-high-outline" : "volume-mute-outline"}
            size={18}
            color={c.text}
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
        {utterances.length > 1 && utterances.slice(0, -1).map((u) => (
          <UtteranceBubble key={u.id} utterance={u} />
        ))}

        {live.isListening && (live.interimText || live.liveTranslation) ? (
          <View>
            <View style={[atoms.flexRow, atoms.itemsCenter, { gap: 6, marginBottom: 10 }]}>
              <View style={{ backgroundColor: c.primary, borderRadius: 99, height: 8, width: 8 }} />
              <Text style={{ color: c.primary, fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>LIVE</Text>
            </View>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 26, fontWeight: "300", letterSpacing: -0.3, lineHeight: 38 }}>
              {getFlag(src)} {live.interimText}
            </Text>
            {!!live.liveTranslation && (
              <Text style={{ color: c.text, fontSize: 30, fontWeight: "300", letterSpacing: -0.4, lineHeight: 44, marginTop: 12 }}>
                {live.liveTranslation}
              </Text>
            )}
          </View>
        ) : utterances.length > 0 ? (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={[{ color: c.text, fontSize: 30, fontWeight: "300", letterSpacing: -0.4, lineHeight: 44 }, { fontSize: 24, color: "rgba(255,255,255,0.7)", marginBottom: 8 }]}>
              {getFlag(utterances[utterances.length - 1].sourceLang)} {utterances[utterances.length - 1].original}
            </Text>
            <Text style={{ color: c.text, fontSize: 30, fontWeight: "300", letterSpacing: -0.4, lineHeight: 44 }}>
              {utterances[utterances.length - 1].translation}
            </Text>
          </Animated.View>
        ) : (
          <Text style={[{ color: c.muted, fontSize: 12, fontWeight: "600", letterSpacing: 2 }, live.isListening && { color: c.primary }]}>
            {status}
          </Text>
        )}

        {!live.isListening && utterances.length > 0 && (
          <Text style={{ color: "rgba(255,255,255,0.22)", fontSize: 14, marginTop: 12 }}>
            {getFlag(utterances[utterances.length - 1].sourceLang)}{" "}
            {utterances[utterances.length - 1].original}
          </Text>
        )}
      </ScrollView>

      {/* ── Waveform + record button ── */}
      <View style={[atoms.itemsCenter, atoms.justifyCenter, { height: 92, marginBottom: 4 }]}>
        <View style={{ bottom: 0, left: 0, position: "absolute", right: 0, top: 0 }}>
          <Waveform active={live.isListening} />
        </View>
        <RecordButton isListening={live.isListening} onPress={toggle} />
      </View>

      {/* ── Bottom control bar ── */}
      <View style={[atoms.flexRow, atoms.itemsCenter, atoms.justifyCenter, { gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <LangPill value={src} onChange={(v) => { if (!busy) setSrc(v); }} disabled={busy} showDot />
        <Pressable
          onPress={swap}
          disabled={busy}
          style={[{ alignItems: "center", height: 40, justifyContent: "center", width: 40 }, busy && { opacity: 0.3 }]}
          accessibilityLabel="Swap languages"
        >
          <Ionicons name="swap-horizontal-outline" size={20} color="rgba(255,255,255,0.65)" />
        </Pressable>
        <LangPill value={tgt} onChange={(v) => { if (!busy) setTgt(v); }} disabled={busy} />
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
