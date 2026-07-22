import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Alert, Image, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import type { Tab } from "../../App";
import { useAuth } from "../features/auth/auth";
import { usePreferences } from "../features/preferences/context";
import { colors } from "../theme/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

export function SettingsScreen({ setActiveTab, onUpdatePassword }: { setActiveTab: (tab: Tab) => void; onUpdatePassword?: () => void }) {
  const { signOut, user } = useAuth();
  const { session_alerts: sessionAlerts, update } = usePreferences();

  const email = user?.email ?? "quickvoice@example.com";
  const displayName =
    user?.user_metadata?.display_name ??
    user?.user_metadata?.full_name ??
    email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <View style={styles.page}>
      <Pressable onPress={() => setActiveTab("profile")} style={({ pressed }) => [styles.profileHeader, pressed && styles.pressed]}>
        <View style={styles.avatar}>
          {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} /> : <Ionicons name="person" size={31} color="#FFFFFF" />}
        </View>
        <View style={styles.profileCopy}>
          <Text numberOfLines={1} style={styles.profileName}>{displayName}</Text>
          <Text numberOfLines={1} style={styles.profileEmail}>{email}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#A8AFB9" />
      </Pressable>

      <SettingsGroup label="ACCOUNT">
        <SettingRow icon="person-outline" title="My Profile" subtitle="View and edit your profile" onPress={() => setActiveTab("profile")} />
        <SettingRow divider icon="id-card-outline" title="Personal Information" subtitle="Name, email, and account details" onPress={() => setActiveTab("profile")} />
      </SettingsGroup>

      <SettingsGroup label="PREFERENCES">
        <SettingRow
          icon="notifications-outline"
          title="Notifications"
          subtitle="Session alerts and updates"
          trailing={
            <Switch
              ios_backgroundColor="#D8DCE2"
              onValueChange={(value) => update({ session_alerts: value })}
              trackColor={{ false: "#D8DCE2", true: "#8AB9F6" }}
              thumbColor={sessionAlerts ? "#007AFF" : "#FFFFFF"}
              value={sessionAlerts}
            />
          }
        />
        <SettingRow
          divider
          icon="language-outline"
          title="Language"
          subtitle="English (US)"
          onPress={() => Alert.alert("Language", "QuickVoice currently supports English and Japanese.")}
        />
        <SettingRow divider icon="shield-checkmark-outline" title="Privacy & Security" subtitle="Password and account security" onPress={onUpdatePassword ?? (() => {})} />
      </SettingsGroup>

      <SettingsGroup label="SUPPORT">
        <SettingRow icon="help-circle-outline" title="Help & Support" subtitle="FAQs and contact support" onPress={() => Alert.alert("Help & Support", "QuickVoice support options will be available here.")} />
        <SettingRow divider icon="information-circle-outline" title="About QuickVoice" subtitle="Version 1.0" onPress={() => Alert.alert("About QuickVoice", "QuickVoice · Version 1.0")} />
      </SettingsGroup>

      <Pressable accessibilityRole="button" onPress={signOut} style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}>
        <Ionicons name="log-out-outline" size={20} color="#D33A3A" />
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
    </View>
  );
}

function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.groupWrap}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

function SettingRow({ icon, title, subtitle, onPress, trailing, divider = false }: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  divider?: boolean;
}) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.row, divider && styles.rowDivider, pressed && styles.pressed]}>
      <View style={styles.iconBox}><Ionicons name={icon} size={21} color="#252A32" /></View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text numberOfLines={1} style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ?? (onPress ? <Ionicons name="chevron-forward" size={18} color="#B3B8C0" /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", backgroundColor: "#1D2026", borderRadius: 999, height: 68, justifyContent: "center", overflow: "hidden", width: 68 },
  avatarImage: { height: "100%", width: "100%" },
  group: { backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden", shadowColor: "#182238", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.045, shadowRadius: 10, elevation: 2 },
  groupLabel: { color: "#8B929D", fontSize: 11, fontWeight: "600", letterSpacing: 0.8, marginBottom: 7, marginLeft: 6 },
  groupWrap: { width: "100%" },
  iconBox: { alignItems: "center", backgroundColor: "#F0F1F3", borderRadius: 11, height: 42, justifyContent: "center", width: 42 },
  logoutButton: { alignItems: "center", borderColor: "#E05A5A", borderRadius: 17, borderWidth: 1.2, flexDirection: "row", gap: 9, justifyContent: "center", minHeight: 56, width: "100%" },
  logoutPressed: { backgroundColor: "#FFF3F3", opacity: 0.8 },
  logoutText: { color: "#D33A3A", fontSize: 16, fontWeight: "600" },
  page: { gap: 22, width: "100%" },
  pressed: { backgroundColor: "#F5F6F8" },
  profileCopy: { flex: 1, minWidth: 0 },
  profileEmail: { color: "#858C96", fontSize: 14, lineHeight: 20, marginTop: 3 },
  profileHeader: { alignItems: "center", borderRadius: 18, flexDirection: "row", gap: 15, paddingHorizontal: 4, paddingVertical: 8 },
  profileName: { color: colors.text, fontSize: 23, fontWeight: "700", letterSpacing: -0.4 },
  row: { alignItems: "center", flexDirection: "row", gap: 13, minHeight: 72, paddingHorizontal: 15, paddingVertical: 11 },
  rowCopy: { flex: 1, minWidth: 0 },
  rowDivider: { borderTopColor: "#ECEEF2", borderTopWidth: StyleSheet.hairlineWidth },
  rowSubtitle: { color: "#858C96", fontSize: 12, lineHeight: 17, marginTop: 2 },
  rowTitle: { color: "#20242B", fontSize: 16, fontWeight: "500", letterSpacing: -0.15 },
});
