import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { languages, getFlag, getLabel, type LanguageCode } from "../constants/data";
import { dark } from "../theme/dark";

export function LangPill({
  value,
  onChange,
  disabled,
  showDot = false,
}: {
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
                  {sel && <Ionicons name="checkmark" size={16} color={dark.indigo} />}
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
  pill: { alignItems: "center", backgroundColor: dark.surface, borderRadius: 99, flexDirection: "row", gap: 6, paddingHorizontal: 14, paddingVertical: 11 },
  pillOff: { opacity: 0.4 },
  dot: { backgroundColor: dark.red, borderRadius: 99, height: 13, width: 13 },
  flag: { fontSize: 15 },
  lbl: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "500" },
  backdrop: { backgroundColor: "rgba(0,0,0,0.55)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  sheet: { backgroundColor: "#1c1f2e", borderTopLeftRadius: 24, borderTopRightRadius: 24, bottom: 0, left: 0, maxHeight: "62%", paddingBottom: 32, paddingHorizontal: 20, paddingTop: 12, position: "absolute", right: 0 },
  handle: { alignSelf: "center", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 3, height: 4, marginBottom: 16, width: 40 },
  sheetTitle: { color: dark.white, fontSize: 15, fontWeight: "700", marginBottom: 12 },
  item: { alignItems: "center", flexDirection: "row", gap: 12, paddingVertical: 14 },
  itemBorder: { borderBottomColor: dark.bdry, borderBottomWidth: 1 },
  itemFlag: { fontSize: 18 },
  itemText: { color: dark.dim, flex: 1, fontSize: 15 },
  itemSel: { color: dark.white, fontWeight: "600" },
});
