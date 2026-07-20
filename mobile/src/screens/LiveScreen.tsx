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
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { colors, radius, spacing } from "../theme";
import { languages, type LanguageCode } from "../data";
import { SessionScreen } from "./SessionScreen";

export function LiveScreen() {
  const [source, setSource] = useState<LanguageCode>("en");
  const [target, setTarget] = useState<LanguageCode>("ja");
  const [pickerOpen, setPickerOpen] = useState<"source" | "target" | null>(null);
  const [sessionActive, setSessionActive] = useState(false);

  const sourceLang = languages.find((l) => l.code === source)?.label ?? "English";
  const targetLang = languages.find((l) => l.code === target)?.label ?? "Japanese";

  const selectSource = (code: LanguageCode) => {
    setSource(code);
    if (code === target) setTarget(code === "en" ? "ja" : "en");
    setPickerOpen(null);
  };

  const selectTarget = (code: LanguageCode) => {
    setTarget(code);
    if (code === source) setSource(code === "en" ? "ja" : "en");
    setPickerOpen(null);
  };

  // ── Language picker card page ──────────────────────────────────────────────
  return (
    <View style={styles.screen}>
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
      <View style={styles.heading}>
        <Text style={styles.headingTitle}>Welcome!</Text>
        <Text style={styles.headingSubtitle}>Real-time interpretation</Text>
      </View>

      {/* Language Pair card */}
      <View style={styles.card}>
        {/* Card header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardIconBox}>
            <Ionicons name="language-outline" size={22} color={colors.muted} />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Language Pair</Text>
            <Text style={styles.cardSubtitle}>
              English to Japanese or Japanese to English.
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Your Language */}
        <View style={styles.selectorGroup}>
          <Text style={styles.selectorLabel}>Your Language</Text>
          <Pressable
            style={styles.selector}
            onPress={() => setPickerOpen("source")}
            accessibilityRole="button"
            accessibilityLabel={`Your language: ${sourceLang}`}
          >
            <Text style={styles.selectorValue}>{sourceLang}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.muted} />
          </Pressable>
        </View>

        {/* Their Language */}
        <View style={styles.selectorGroup}>
          <Text style={styles.selectorLabel}>Their Language</Text>
          <Pressable
            style={styles.selector}
            onPress={() => setPickerOpen("target")}
            accessibilityRole="button"
            accessibilityLabel={`Their language: ${targetLang}`}
          >
            <Text style={styles.selectorValue}>{targetLang}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.muted} />
          </Pressable>
        </View>

        {/* Start Interpret */}
        <Pressable
          style={({ pressed }) => [
            styles.startBtn,
            source === target && styles.startBtnDisabled,
            pressed && source !== target && styles.startBtnPressed,
          ]}
          onPress={() => setSessionActive(true)}
          disabled={source === target}
          accessibilityRole="button"
        >
          <Ionicons name="mic-outline" size={20} color="#fff" />
          <Text style={styles.startBtnText}>Start Interpret</Text>
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
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>{title}</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {languages.map((lang, i) => {
            const isSelected = lang.code === selected;
            return (
              <TouchableOpacity
                key={lang.code}
                onPress={() => onSelect(lang.code as LanguageCode)}
                style={[
                  styles.modalItem,
                  i < languages.length - 1 && styles.modalItemBorder,
                ]}
                activeOpacity={0.6}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
              >
                <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg,
  },

  heading: {
    gap: 6,
    paddingTop: 4,
  },
  headingTitle: {
    color: colors.primary,
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 46,
  },
  headingSubtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xxl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  cardIconBox: {
    alignItems: "center",
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  cardHeaderText: { flex: 1, gap: 2 },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
    marginHorizontal: -spacing.lg,
  },

  // Selectors
  selectorGroup: { gap: 7 },
  selectorLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  selector: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 50,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  selectorValue: {
    color: colors.text,
    fontSize: 15,
  },

  // Start button
  startBtn: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 4,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  startBtnPressed: { backgroundColor: colors.primaryPressed },
  startBtnDisabled: { opacity: 0.45 },
  startBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.1,
  },

  // Modal
  modalBackdrop: {
    backgroundColor: "rgba(0,0,0,0.35)",
    bottom: 0, left: 0, position: "absolute", right: 0, top: 0,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    bottom: 0,
    left: 0,
    maxHeight: "60%",
    paddingBottom: 34,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    position: "absolute",
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 24,
  },
  modalHandle: {
    alignSelf: "center",
    backgroundColor: colors.border,
    borderRadius: 3,
    height: 4,
    marginBottom: spacing.md,
    width: 40,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginBottom: spacing.md,
  },
  modalItem: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 15,
  },
  modalItemBorder: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  modalItemText: {
    color: colors.text,
    fontSize: 15,
  },
  modalItemTextSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
});
