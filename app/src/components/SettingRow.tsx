import { Ionicons } from "@expo/vector-icons";
import { Switch, Text, View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";
import { atoms } from "../theme/atoms";
import { spacing } from "../theme/theme";

export function SettingRow({
  icon,
  label,
  description,
  value,
  onChange,
}: {
  icon: string;
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const c = useTheme();
  return (
    <View style={[atoms.flexRow, atoms.itemsCenter, atoms.justifyBetween, { backgroundColor: c.background, borderColor: c.border, borderRadius: 8, borderWidth: 1, gap: spacing.md, padding: spacing.md }]}>
      <View style={[atoms.flexRow, atoms.itemsCenter, atoms.flex1, atoms.gapMd]}>
        <View style={{ alignItems: "center", backgroundColor: c.secondary, borderRadius: 8, height: 40, justifyContent: "center", width: 40 }}>
          <Ionicons name={icon as any} size={20} color={c.muted} />
        </View>
        <View style={[atoms.flex1, { gap: 2 }]}>
          <Text style={{ color: c.text, fontSize: 14, fontWeight: "600" }}>{label}</Text>
          <Text style={{ color: c.muted, fontSize: 12, lineHeight: 17 }}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: c.border, true: c.primary }}
        thumbColor="#fff"
        ios_backgroundColor={c.border}
      />
    </View>
  );
}
