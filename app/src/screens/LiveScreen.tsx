import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  Pressable,
  StatusBar,
  Text,
  View,
} from "react-native";

import { LanguagePickerModal } from "../components/LanguagePickerModal";
import { LanguageSelectRow } from "../components/LanguageSelectRow";
import { languages, type LanguageCode } from "../constants/data";
import { usePreferences } from "../features/preferences/context";
import { useTypewriter } from "../hooks/useTypewriter";
import { atoms } from "../theme/atoms";
import { useTheme } from "../theme/ThemeProvider";
import { spacing } from "../theme/theme";
import { SessionScreen } from "./SessionScreen";

export function LiveScreen() {
  const { preferred_source_lang: defSource, preferred_target_lang: defTarget, update: updatePrefs } = usePreferences();
  const welcomeText = useTypewriter("Welcome!", { pauseMs: 3000 });
  const [source, setSource] = useState<LanguageCode>(defSource);
  const [target, setTarget] = useState<LanguageCode>(defTarget);
  const [pickerOpen, setPickerOpen] = useState<"source" | "target" | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const c = useTheme();

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

  return (
    <View style={atoms.gapLg}>
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

      <View style={{ gap: 6, paddingTop: 4 }}>
        <Text style={{ color: c.primary, fontSize: 40, fontWeight: "800", letterSpacing: -0.8, lineHeight: 46 }}>
          {welcomeText}<Text style={{ color: c.primary, opacity: 0.6 }}>|</Text>
        </Text>
        <Text style={{ color: c.muted, fontSize: 15, lineHeight: 22 }}>Real-time interpretation</Text>
      </View>

      <View style={{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 22, padding: spacing.lg, shadowColor: c.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
        <View style={[atoms.flexRow, atoms.itemsCenter, atoms.gapMd]}>
          <View style={{ alignItems: "center", backgroundColor: c.secondary, borderRadius: 8, height: 42, justifyContent: "center", width: 42 }}>
            <Ionicons name="language-outline" size={22} color={c.muted} />
          </View>
          <View style={[atoms.flex1, { gap: 2 }]}>
            <Text style={{ color: c.text, fontSize: 17, fontWeight: "700", letterSpacing: -0.2 }}>Language Pair</Text>
            <Text style={{ color: c.muted, fontSize: 13, lineHeight: 18 }}>
              English to Japanese or Japanese to English.
            </Text>
          </View>
        </View>

        <View style={{ height: 20 }} />

        <LanguageSelectRow
          label="Your Language"
          value={sourceLang}
          onPress={() => setPickerOpen("source")}
        />

        <View style={{ height: 10 }} />

        <LanguageSelectRow
          label="Their Language"
          value={targetLang}
          onPress={() => setPickerOpen("target")}
        />

        <View style={{ height: 7 }}>
          <Text>{ }</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            atoms.flexRow, atoms.itemsCenter, atoms.justifyCenter, { backgroundColor: c.primary, borderRadius: 14, gap: 8, marginTop: 4, minHeight: 52, paddingHorizontal: spacing.lg },
            source === target && { opacity: 0.45 },
            pressed && source !== target && { backgroundColor: c.primaryPressed },
          ]}
          onPress={() => setSessionActive(true)}
          disabled={source === target}
          accessibilityRole="button"
        >
          <Ionicons name="mic-outline" size={20} color="#fff" />
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700", letterSpacing: 0.1 }}>Start Interpret</Text>
        </Pressable>
      </View>

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
