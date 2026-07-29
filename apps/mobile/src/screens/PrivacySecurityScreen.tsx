import { Ionicons } from "@expo/vector-icons";
import { type ComponentProps, type ReactNode } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../features/auth/auth";
import { usePreferences } from "../features/preferences/context";
import { appStorage } from "../services/nativeStorage";

type IconName = ComponentProps<typeof Ionicons>["name"];

function SecurityRow({
  dark,
  destructive = false,
  divider = false,
  icon,
  onPress,
  subtitle,
  title,
  trailing,
}: {
  dark: boolean;
  destructive?: boolean;
  divider?: boolean;
  icon: IconName;
  onPress: () => void;
  subtitle: string;
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        divider && styles.divider,
        divider && dark && styles.dividerDark,
        pressed && (dark ? styles.pressedDark : styles.pressed),
      ]}
    >
      <View style={[styles.iconBox, dark && styles.iconBoxDark, destructive && styles.dangerIconBox]}>
        <Ionicons name={icon} size={21} color={destructive ? "#D33A3A" : dark ? "#E9EDF4" : "#252A32"} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, dark && styles.textDark, destructive && styles.dangerText]}>{title}</Text>
        <Text style={[styles.rowSubtitle, dark && styles.secondaryTextDark]}>{subtitle}</Text>
      </View>
      {trailing ?? <Ionicons name="chevron-forward" size={18} color="#B3B8C0" />}
    </Pressable>
  );
}

function Group({ children, dark, label }: { children: ReactNode; dark: boolean; label: string }) {
  return (
    <View style={styles.groupWrap}>
      <Text style={[styles.groupLabel, dark && styles.secondaryTextDark]}>{label}</Text>
      <View style={[styles.group, dark && styles.groupDark]}>{children}</View>
    </View>
  );
}

export function PrivacySecurityScreen({
  onBack,
  onChangeEmail,
  onChangePassword,
}: {
  onBack: () => void;
  onChangeEmail: () => void;
  onChangePassword: () => void;
}) {
  const { user } = useAuth();
  const { appearance_mode: appearanceMode } = usePreferences();
  const systemScheme = useColorScheme();
  const dark = appearanceMode === "dark" || (appearanceMode === "system" && systemScheme === "dark");

  const deleteLocalData = () => {
    Alert.alert(
      "Delete local QuickVoice data?",
      "This removes conversations, recordings, custom categories, and preferences stored on this phone. Your account is not deleted.",
      [
        { style: "cancel", text: "Cancel" },
        {
          style: "destructive",
          text: "Delete",
          onPress: () => {
            void appStorage.clearQuickVoiceData().then(() => {
              Alert.alert("Local data deleted", "QuickVoice data stored on this phone has been removed.");
            });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.page, dark && styles.pageDark]}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back to Settings" onPress={onBack} style={[styles.backButton, dark && styles.backButtonDark]}>
          <Ionicons name="chevron-back" size={23} color={dark ? "#F5F7FA" : "#171A20"} />
        </Pressable>
        <Text style={[styles.title, dark && styles.textDark]}>Privacy & Security</Text>
        <View style={styles.backPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.securitySummary, dark && styles.groupDark]}>
          <View style={styles.shield}>
            <Ionicons name="shield-checkmark" size={27} color="#007AFF" />
          </View>
          <View style={styles.rowCopy}>
            <Text style={[styles.summaryTitle, dark && styles.textDark]}>Account protection</Text>
            <Text numberOfLines={1} style={[styles.summaryEmail, dark && styles.secondaryTextDark]}>{user?.email}</Text>
          </View>
        </View>

        <Group dark={dark} label="ACCOUNT SECURITY">
          <SecurityRow dark={dark} icon="mail-outline" onPress={onChangeEmail} subtitle="Verify and replace your account email" title="Change Email" />
          <SecurityRow dark={dark} divider icon="key-outline" onPress={onChangePassword} subtitle="Confirm your current password first" title="Change Password" />
        </Group>

        <Group dark={dark} label="DATA & BACKUP">
          <SecurityRow
            dark={dark}
            icon="cloud-upload-outline"
            onPress={() => Alert.alert("Coming soon", "Cloud backup will be connected when the QuickVoice database is ready. Your data remains stored locally for now.")}
            subtitle="Store conversations and recordings securely"
            title="Cloud Backup & Sync"
            trailing={<View style={styles.comingSoon}><Text style={styles.comingSoonText}>COMING SOON</Text></View>}
          />
          <SecurityRow dark={dark} divider destructive icon="trash-outline" onPress={deleteLocalData} subtitle="Remove QuickVoice content from this phone" title="Delete Local Data" />
        </Group>

        <Group dark={dark} label="ACCOUNT DATA">
          <SecurityRow
            dark={dark}
            destructive
            icon="person-remove-outline"
            onPress={() => Alert.alert("Not connected yet", "Deleting the account and cloud data will be available when the database deletion service is ready.")}
            subtitle="Permanently remove your account and cloud data"
            title="Delete Account & Data"
            trailing={<Text style={[styles.unavailable, dark && styles.secondaryTextDark]}>Unavailable</Text>}
          />
        </Group>

        <Text style={[styles.footerNote, dark && styles.secondaryTextDark]}>
          QuickVoice currently keeps conversation data on this device. Cloud controls are shown now so they can be connected without redesigning this page later.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButton: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E0E3E8", borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, height: 42, justifyContent: "center", width: 42 },
  backButtonDark: { backgroundColor: "#25292F", borderColor: "#3A4049" },
  backPlaceholder: { height: 42, width: 42 },
  comingSoon: { backgroundColor: "#EAF3FF", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  comingSoonText: { color: "#007AFF", fontSize: 9, fontWeight: "800", letterSpacing: 0.45 },
  content: { gap: 22, paddingBottom: 32, paddingHorizontal: 20, paddingTop: 12 },
  dangerIconBox: { backgroundColor: "#FFF0F0" },
  dangerText: { color: "#C93636" },
  divider: { borderTopColor: "#ECEEF2", borderTopWidth: StyleSheet.hairlineWidth },
  dividerDark: { borderTopColor: "#383D45" },
  footerNote: { color: "#858C96", fontSize: 12, lineHeight: 18, paddingHorizontal: 5 },
  group: { backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden" },
  groupDark: { backgroundColor: "#25292F" },
  groupLabel: { color: "#8B929D", fontSize: 11, fontWeight: "600", letterSpacing: 0.8, marginBottom: 7, marginLeft: 6 },
  groupWrap: { width: "100%" },
  header: { alignItems: "center", flexDirection: "row", height: 64, justifyContent: "space-between", paddingHorizontal: 18 },
  iconBox: { alignItems: "center", backgroundColor: "#F0F1F3", borderRadius: 11, height: 42, justifyContent: "center", width: 42 },
  iconBoxDark: { backgroundColor: "#343941" },
  page: { backgroundColor: "#F5F6F8", flex: 1 },
  pageDark: { backgroundColor: "#0E1013" },
  pressed: { backgroundColor: "#F5F6F8" },
  pressedDark: { backgroundColor: "#30343A" },
  row: { alignItems: "center", flexDirection: "row", gap: 13, minHeight: 76, paddingHorizontal: 15, paddingVertical: 11 },
  rowCopy: { flex: 1, minWidth: 0 },
  rowSubtitle: { color: "#858C96", fontSize: 12, lineHeight: 17, marginTop: 2 },
  rowTitle: { color: "#20242B", fontSize: 16, fontWeight: "500", letterSpacing: -0.15 },
  secondaryTextDark: { color: "#9CA4B0" },
  securitySummary: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E2EAF5", borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 14, padding: 17 },
  shield: { alignItems: "center", backgroundColor: "#EAF3FF", borderRadius: 15, height: 52, justifyContent: "center", width: 52 },
  summaryEmail: { color: "#858C96", fontSize: 13, marginTop: 3 },
  summaryTitle: { color: "#20242B", fontSize: 17, fontWeight: "700" },
  textDark: { color: "#F5F7FA" },
  title: { color: "#171A20", fontSize: 20, fontWeight: "700", letterSpacing: -0.35 },
  unavailable: { color: "#8B929D", fontSize: 12 },
});
