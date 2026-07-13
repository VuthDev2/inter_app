/**
 * UI primitives – mirrors the web app's shadcn/Tailwind design system.
 *
 * Design tokens from web styles.css (oklch-based):
 *   --primary:  oklch(0.55 0.15 250) ≈ #4B71C4
 *   --radius:   0.875rem (14px), radius-md = 12px, radius-lg = 14px, radius-2xl = 22px
 *   --font:     Space Grotesk (display/headings) + Inter (body) → system fallback on mobile
 */
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { colors, radius, spacing } from "../theme";

// ─── ScreenHeader ────────────────────────────────────────────────────────────
// Matches web: eyebrow (text-sm font-medium text-primary), h1 font-display 3xl,
// muted description paragraph.
export function ScreenHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
}) {
  return (
    <View style={styles.header}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
    </View>
  );
}

// ─── Panel / Card ─────────────────────────────────────────────────────────────
// Matches web: rounded-lg border bg-card p-5 (radius-lg = 14px, white bg, border)
export function Panel({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

// ─── PrimaryButton ────────────────────────────────────────────────────────────
// Matches web: h-12 w-full, bg-primary, text-primary-foreground, rounded-md
export function PrimaryButton({
  children,
  icon,
  disabled,
  onPress,
  danger,
}: {
  children: string;
  icon?: ComponentProps<typeof Ionicons>["name"];
  disabled?: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        danger && styles.dangerButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.primaryButtonPressed,
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color="#FFFFFF" /> : null}
      <Text style={styles.primaryButtonText}>{children}</Text>
    </Pressable>
  );
}

// ─── SecondaryButton ──────────────────────────────────────────────────────────
// Matches web: variant="outline" / variant="secondary" — bg-secondary border rounded-md
export function SecondaryButton({
  children,
  icon,
  onPress,
  flex,
}: {
  children: string;
  icon?: ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  flex?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        flex && { flex: 1 },
        pressed && styles.secondaryButtonPressed,
      ]}
    >
      {icon ? <Ionicons name={icon} size={17} color={colors.primary} /> : null}
      <Text style={styles.secondaryButtonText}>{children}</Text>
    </Pressable>
  );
}

// ─── Field (labeled TextInput) ────────────────────────────────────────────────
// Matches web Input / Label pair: label text-sm font-medium, input h-9 border rounded-md
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

// ─── StatusPill ───────────────────────────────────────────────────────────────
export function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={[styles.statusPill, ok ? styles.statusOk : styles.statusMuted]}>
      <View style={[styles.statusDot, ok ? styles.statusDotOk : styles.statusDotMuted]} />
      <Text style={[styles.statusText, ok ? styles.statusTextOk : styles.statusTextMuted]}>
        {label}
      </Text>
    </View>
  );
}

// ─── ToggleRow ────────────────────────────────────────────────────────────────
// Matches web SectionCard ToggleRow: h-9 w-9 rounded-xl icon box + label + custom switch
export function ToggleRow({
  icon,
  label,
  description,
  value,
  onValueChange,
  accent = colors.primary,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  accent?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={[styles.rowIconBox, { backgroundColor: `${accent}1A` }]}>
          <Ionicons name={icon} color={accent} size={18} />
        </View>
        <View style={styles.rowCopy}>
          <Text style={styles.rowTitle}>{label}</Text>
          {description ? <Text style={styles.rowMeta}>{description}</Text> : null}
        </View>
      </View>
      <Switch
        onValueChange={onValueChange}
        thumbColor="#FFFFFF"
        trackColor={{ false: colors.border, true: colors.primary }}
        value={value}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

// ─── LinkRow ──────────────────────────────────────────────────────────────────
// Matches web LinkRow: icon box + label/description + chevron
export function LinkRow({
  icon,
  label,
  description,
  onPress,
  destructive,
  badge,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  description?: string;
  onPress: () => void;
  destructive?: boolean;
  badge?: string;
}) {
  const accent = destructive ? colors.red : colors.primary;
  const iconBg = destructive ? colors.redSoft : colors.primarySoft;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.rowIconBox, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} color={accent} size={18} />
        </View>
        <View style={styles.rowCopy}>
          <Text style={[styles.rowTitle, destructive && { color: colors.red }]}>{label}</Text>
          {description ? <Text style={styles.rowMeta}>{description}</Text> : null}
        </View>
      </View>
      <View style={styles.rowRight}>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" color={colors.muted} size={17} />
      </View>
    </Pressable>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────
// Matches web FilterLink: rounded-full border, selected = bg-primary text-white
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

// ─── SectionDivider ───────────────────────────────────────────────────────────
export function SectionDivider() {
  return <View style={styles.divider} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ScreenHeader
  header: {
    gap: 6,
    paddingBottom: 4,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 2,
  },

  // Panel — rounded-lg border bg-card p-5
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    // Subtle shadow matching web glass-card
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  // PrimaryButton — h-12 full-width bg-primary rounded-md
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  dangerButton: {
    backgroundColor: colors.red,
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.1,
  },

  // SecondaryButton — bg-secondary border rounded-md
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  secondaryButtonPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },

  // Field / Input
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  input: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },

  // StatusPill
  statusPill: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDot: {
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  statusOk: {
    backgroundColor: "#DCFCE7",
  },
  statusMuted: {
    backgroundColor: colors.surfaceMuted,
  },
  statusDotOk: {
    backgroundColor: "#16A34A",
  },
  statusDotMuted: {
    backgroundColor: colors.muted,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusTextOk: {
    color: "#166534",
  },
  statusTextMuted: {
    color: colors.muted,
  },

  // Row (shared by ToggleRow and LinkRow)
  row: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 60,
    paddingVertical: spacing.md,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.md,
  },
  rowRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  // Icon box: h-9 w-9 rounded-xl (web uses rounded-xl = radius + 4px ≈ 18px)
  rowIconBox: {
    alignItems: "center",
    borderRadius: radius.xl,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  rowMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },

  // Badge
  badge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "600",
  },

  // Chip — rounded-full border
  chip: {
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "500",
  },
  chipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  // Divider
  divider: {
    backgroundColor: colors.border,
    height: 1,
  },

  // Label utility (used inline with uiStyles)
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "500",
  },
});

export const uiStyles = styles;
