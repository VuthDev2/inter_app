/**
 * LiveScreen — matches the screenshot exactly
 *
 * Tapping "Start Interpret" pushes the dark full-screen SessionScreen.
 * That screen is rendered in-place (no React Navigation needed) via a
 * simple boolean state — the session overlays the entire app.
 */
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { usePreferences } from "../features/preferences/context";
import { atoms } from "../theme/atoms";
import { colors, spacing } from "../theme/theme";
import { languages, type LanguageCode } from "../constants/data";
import { SessionScreen } from "./SessionScreen";

export function LiveScreen() {
  const { preferred_source_lang: defSource, preferred_target_lang: defTarget, update: updatePrefs } = usePreferences();
  const [source, setSource] = useState<LanguageCode>(defSource);
  const [target, setTarget] = useState<LanguageCode>(defTarget);
  const [pickerOpen, setPickerOpen] = useState<"source" | "target" | null>(null);
  const [sessionActive, setSessionActive] = useState(false);

  const sourceLang = languages.find((l) => l.code === source)?.label ?? "English";
  const targetLang = languages.find((l) => l.code === target)?.label ?? "Japanese";

  const selectSource = (code: LanguageCode) => {
    setSource(code);
    updatePrefs({ preferred_source_lang: code });
    if (code === target) {
      const fallback = code === "en" ? "ja" : "en";
      setTarget(fallback);
      updatePrefs({ preferred_target_lang: fallback });
    }
    setPickerOpen(null);
  };

  const selectTarget = (code: LanguageCode) => {
    setTarget(code);
    updatePrefs({ preferred_target_lang: code });
    if (code === source) {
      const fallback = code === "en" ? "ja" : "en";
      setSource(fallback);
      updatePrefs({ preferred_source_lang: fallback });
    }
    setPickerOpen(null);
  };

  // ── Language picker card page ──────────────────────────────────────────────
  return (
    <View style={atoms.gapLg}>
      {/* Full-screen dark session modal — covers everything including tab bar */}
      <Modal
        visible={sessionActive}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setSessionActive(false)}
      >
        <StatusBar barStyle="light-content" backgroundColor="#0c0e17" />
        <SessionScreen
          initialSource={source}
          initialTarget={target}
          onBack={() => setSessionActive(false)}
        />
      </Modal>
      {/* Page heading */}
      <View style={{ gap: 6, paddingTop: 4 }}>
        <Text style={{ color: colors.primary, fontSize: 40, fontWeight: "800", letterSpacing: -0.8, lineHeight: 46 }}>Welcome!</Text>
        <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>Real-time interpretation</Text>
      </View>

      {/* Language Pair card */}
      <View style={atoms.cardXxl}>
        {/* Card header */}
        <View style={[atoms.flexRow, atoms.itemsCenter, atoms.gapMd]}>
          <View style={{ alignItems: "center", backgroundColor: colors.secondary, borderRadius: 8, height: 42, justifyContent: "center", width: 42 }}>
            <Ionicons name="language-outline" size={22} color={colors.muted} />
          </View>
          <View style={[atoms.flex1, { gap: 2 }]}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700", letterSpacing: -0.2 }}>Language Pair</Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
              English to Japanese or Japanese to English.
            </Text>
          </View>
        </View>

        <View style={{ backgroundColor: colors.border, height: 1, marginHorizontal: -spacing.lg }} />

        {/* Your Language */}
        <View style={{ gap: 7 }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: "500" }}>Your Language</Text>
          <Pressable
            style={[atoms.flexRow, atoms.itemsCenter, atoms.justifyBetween, atoms.bgSurface, atoms.border1, { borderColor: colors.border, borderRadius: 14, minHeight: 50, paddingHorizontal: spacing.md, paddingVertical: 13 }]}
            onPress={() => setPickerOpen("source")}
            accessibilityRole="button"
            accessibilityLabel={`Your language: ${sourceLang}`}
          >
            <Text style={{ color: colors.text, fontSize: 15 }}>{sourceLang}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.muted} />
          </Pressable>
        </View>

        {/* Their Language */}
        <View style={{ gap: 7 }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: "500" }}>Their Language</Text>
          <Pressable
            style={[atoms.flexRow, atoms.itemsCenter, atoms.justifyBetween, atoms.bgSurface, atoms.border1, { borderColor: colors.border, borderRadius: 14, minHeight: 50, paddingHorizontal: spacing.md, paddingVertical: 13 }]}
            onPress={() => setPickerOpen("target")}
            accessibilityRole="button"
            accessibilityLabel={`Their language: ${targetLang}`}
          >
            <Text style={{ color: colors.text, fontSize: 15 }}>{targetLang}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.muted} />
          </Pressable>
        </View>

        {/* Start Interpret */}
        <Pressable
          style={({ pressed }) => [
            atoms.flexRow, atoms.itemsCenter, atoms.justifyCenter, { backgroundColor: colors.primary, borderRadius: 14, gap: 8, marginTop: 4, minHeight: 52, paddingHorizontal: spacing.lg },
            source === target && { opacity: 0.45 },
            pressed && source !== target && { backgroundColor: colors.primaryPressed },
          ]}
          onPress={() => setSessionActive(true)}
          disabled={source === target}
          accessibilityRole="button"
        >
          <Ionicons name="mic-outline" size={20} color="#fff" />
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700", letterSpacing: 0.1 }}>Start Interpret</Text>
        </Pressable>
      </View>

      {/* Language picker bottom-sheet modal */}
      <LanguagePickerModal
        visible={pickerOpen !== null}
        title={pickerOpen === "source" ? "Your Language" : "Their Language"}
        selected={pickerOpen === "source" ? source : target}
        onSelect={(code) =>
          pickerOpen === "source" ? selectSource(code) : selectTarget(code)
        }
        onClose={() => setPickerOpen(null)}
      />
    </View>
  );
}

// ─── Language picker bottom-sheet ────────────────────────────────────────────
function LanguagePickerModal({
  visible,
  title,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  selected: LanguageCode;
  onSelect: (code: LanguageCode) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={{ backgroundColor: "rgba(0,0,0,0.35)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 }} onPress={onClose} />
      <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, bottom: 0, left: 0, maxHeight: "60%", paddingBottom: 34, paddingHorizontal: spacing.lg, paddingTop: spacing.md, position: "absolute", right: 0, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 24 }}>
        <View style={{ alignSelf: "center", backgroundColor: colors.border, borderRadius: 3, height: 4, marginBottom: spacing.md, width: 40 }} />
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700", letterSpacing: -0.2, marginBottom: spacing.md }}>{title}</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {languages.map((lang, i) => {
            const isSelected = lang.code === selected;
            return (
              <TouchableOpacity
                key={lang.code}
                onPress={() => onSelect(lang.code as LanguageCode)}
                style={[
                  atoms.flexRow, atoms.itemsCenter, atoms.justifyBetween, { paddingVertical: 15 },
                  i < languages.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
                ]}
                activeOpacity={0.6}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
              >
                <Text style={[{ color: colors.text, fontSize: 15 }, isSelected && { color: colors.primary, fontWeight: "600" }]}>
                  {lang.label}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}
