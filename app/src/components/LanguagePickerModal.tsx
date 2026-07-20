import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { languages, type LanguageCode } from "../constants/data";
import { useTheme } from "../theme/ThemeProvider";
import { atoms } from "../theme/atoms";
import { spacing } from "../theme/theme";

export function LanguagePickerModal({
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
  const c = useTheme();
  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={{ backgroundColor: "rgba(0,0,0,0.35)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 }} onPress={onClose} />
      <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, bottom: 0, left: 0, maxHeight: "60%", paddingBottom: 34, paddingHorizontal: spacing.lg, paddingTop: spacing.md, position: "absolute", right: 0, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 24 }}>
        <View style={{ alignSelf: "center", backgroundColor: c.border, borderRadius: 3, height: 4, marginBottom: spacing.md, width: 40 }} />
        <Text style={{ color: c.text, fontSize: 16, fontWeight: "700", letterSpacing: -0.2, marginBottom: spacing.md }}>{title}</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {languages.map((lang, i) => {
            const isSelected = lang.code === selected;
            return (
              <TouchableOpacity
                key={lang.code}
                onPress={() => onSelect(lang.code as LanguageCode)}
                style={[
                  atoms.flexRow, atoms.itemsCenter, atoms.justifyBetween, { paddingVertical: 15 },
                  i < languages.length - 1 && { borderBottomColor: c.border, borderBottomWidth: 1 },
                ]}
                activeOpacity={0.6}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
              >
                <Text style={[{ color: c.text, fontSize: 15 }, isSelected && { color: c.primary, fontWeight: "600" }]}>
                  {lang.label}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={18} color={c.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}
