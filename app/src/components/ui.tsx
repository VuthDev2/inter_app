import { Ionicons } from "@expo/vector-icons";
import { useMemo, type ComponentProps, type ReactNode } from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/theme";

function useUIStyles() {
  const c = useTheme();
  return useMemo(() => ({
    headerGap: { gap: 6, paddingBottom: 4 } as const,
    eyebrow: { color: c.primary, fontSize: 13, fontWeight: "600", letterSpacing: 0.2 } as const,
    title: { color: c.text, fontSize: 30, fontWeight: "700", letterSpacing: -0.5, lineHeight: 36 } as const,
    body: { color: c.muted, fontSize: 14, lineHeight: 21, marginTop: 2 } as const,
    panel: {
      backgroundColor: c.surface, borderColor: c.border, borderRadius: radius.lg,
      borderWidth: 1, gap: spacing.md, padding: spacing.lg,
      shadowColor: c.text, shadowOffset: { width: 0, height: 2 } as const,
      shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    } as const,
    primaryButton: {
      alignItems: "center", backgroundColor: c.primary, borderRadius: radius.md,
      flexDirection: "row", gap: spacing.sm, justifyContent: "center",
      minHeight: 48, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    } as const,
    primaryButtonPressed: { backgroundColor: c.primaryPressed } as const,
    primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600", letterSpacing: 0.1 } as const,
    secondaryButton: {
      alignItems: "center", backgroundColor: c.secondary, borderColor: c.border,
      borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm,
      justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: 10,
    } as const,
    secondaryButtonPressed: { backgroundColor: c.surfaceMuted } as const,
    secondaryButtonText: { color: c.text, fontSize: 14, fontWeight: "600" } as const,
    fieldGap: { gap: 6 } as const,
    fieldLabel: { color: c.text, fontSize: 13, fontWeight: "500", letterSpacing: 0.1 } as const,
    input: {
      borderColor: c.border, borderRadius: radius.md, borderWidth: 1, color: c.text,
      fontSize: 15, minHeight: 44, paddingHorizontal: spacing.md, backgroundColor: c.surface,
    } as const,
    row: {
      alignItems: "center", borderTopColor: c.border, borderTopWidth: 1,
      flexDirection: "row", gap: spacing.md, justifyContent: "space-between",
      minHeight: 60, paddingVertical: spacing.md,
    } as const,
    rowMeta: { color: c.muted, fontSize: 12, lineHeight: 17 } as const,
    rowTitle: { color: c.text, fontSize: 14, fontWeight: "500" } as const,
    rowIconBox: { alignItems: "center", borderRadius: radius.xl, height: 38, justifyContent: "center", width: 38 } as const,
    chip: { backgroundColor: c.secondary, borderColor: c.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 } as const,
    chipSelected: { backgroundColor: c.primary, borderColor: c.primary } as const,
    chipText: { color: c.muted, fontSize: 13, fontWeight: "500" } as const,
    chipTextSelected: { color: "#FFFFFF", fontWeight: "600" } as const,
    divider: { backgroundColor: c.border, height: 1 } as const,
  }), [c]);
}

export function ScreenHeader({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  const s = useUIStyles();
  return (
    <View style={s.headerGap}>
      {eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}
      <Text style={s.title}>{title}</Text>
      {body ? <Text style={s.body}>{body}</Text> : null}
    </View>
  );
}

export function Panel({ children, style }: { children: ReactNode; style?: object }) {
  const s = useUIStyles();
  return <View style={[s.panel, style]}>{children}</View>;
}

export function PrimaryButton({
  children, icon, disabled, danger, onPress,
}: {
  children: string; icon?: ComponentProps<typeof Ionicons>["name"]; disabled?: boolean; danger?: boolean; onPress: () => void;
}) {
  const s = useUIStyles();
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.primaryButton,
        danger && { backgroundColor: c.red },
        disabled && { opacity: 0.5 },
        pressed && !disabled && s.primaryButtonPressed,
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color="#FFFFFF" /> : null}
      <Text style={s.primaryButtonText}>{children}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  children, icon, onPress, flex,
}: {
  children: string; icon?: ComponentProps<typeof Ionicons>["name"]; onPress: () => void; flex?: boolean;
}) {
  const s = useUIStyles();
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        s.secondaryButton, flex && { flex: 1 }, pressed && s.secondaryButtonPressed,
      ]}
    >
      {icon ? <Ionicons name={icon} size={17} color={c.primary} /> : null}
      <Text style={s.secondaryButtonText}>{children}</Text>
    </Pressable>
  );
}

export function Field({
  label, value, onChangeText, placeholder, secureTextEntry, keyboardType,
}: {
  label: string; value: string; onChangeText: (value: string) => void;
  placeholder?: string; secureTextEntry?: boolean; keyboardType?: "default" | "email-address";
}) {
  const s = useUIStyles();
  const c = useTheme();
  return (
    <View style={s.fieldGap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        secureTextEntry={secureTextEntry}
        style={s.input}
        value={value}
      />
    </View>
  );
}

export function ToggleRow({
  icon, label, description, value, onValueChange, accent,
}: {
  icon: ComponentProps<typeof Ionicons>["name"]; label: string; description?: string;
  value: boolean; onValueChange: (value: boolean) => void; accent?: string;
}) {
  const s = useUIStyles();
  const c = useTheme();
  const _accent = accent ?? c.primary;
  return (
    <View style={s.row}>
      <View style={{ alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.md }}>
        <View style={[s.rowIconBox, { backgroundColor: `${_accent}1A` }]}>
          <Ionicons name={icon} color={_accent} size={18} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.rowTitle}>{label}</Text>
          {description ? <Text style={s.rowMeta}>{description}</Text> : null}
        </View>
      </View>
      <Switch
        onValueChange={onValueChange}
        thumbColor="#FFFFFF"
        trackColor={{ false: c.border, true: c.primary }}
        value={value}
        ios_backgroundColor={c.border}
      />
    </View>
  );
}

export function LinkRow({
  icon, label, description, onPress, destructive, badge,
}: {
  icon: ComponentProps<typeof Ionicons>["name"]; label: string; description?: string;
  onPress: () => void; destructive?: boolean; badge?: string;
}) {
  const s = useUIStyles();
  const c = useTheme();
  const accent = destructive ? c.red : c.primary;
  const iconBg = destructive ? c.redSoft : c.primarySoft;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}
    >
      <View style={{ alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.md }}>
        <View style={[s.rowIconBox, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} color={accent} size={18} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[s.rowTitle, destructive && { color: c.red }]}>{label}</Text>
          {description ? <Text style={s.rowMeta}>{description}</Text> : null}
        </View>
      </View>
      <View style={{ alignItems: "center", flexDirection: "row", gap: 6 }}>
        {badge ? (
          <View style={{ backgroundColor: c.primarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: c.primary, fontSize: 11, fontWeight: "600" }}>{badge}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" color={c.muted} size={17} />
      </View>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const s = useUIStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[s.chip, selected && s.chipSelected]}
    >
      <Text style={[s.chipText, selected && s.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function SectionDivider() {
  const s = useUIStyles();
  return <View style={s.divider} />;
}

export const uiStyles = {
  rowMeta: { color: "#7B8299", fontSize: 12, lineHeight: 17 },
};
