import { Ionicons } from "@expo/vector-icons";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Alert, Image, Modal, Pressable, StyleSheet, Switch, Text, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Tab } from "../../App";
import { useAuth } from "../features/auth/auth";
import { usePreferences } from "../features/preferences/context";
import { useTranslation } from "../i18n/I18nContext";
import { colors } from "../theme/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];
type SettingsDetail = "theme" | "text-size" | "language" | "ui-language";

export function SettingsScreen({ setActiveTab, onPrivacySecurity }: { setActiveTab: (tab: Tab) => void; onPrivacySecurity?: () => void }) {
  const { t } = useTranslation();
  const { signOut, user } = useAuth();
  const {
    appearance_mode: appearanceMode,
    ui_language: uiLanguage,
    auto_speak: autoSpeak,
    preferred_source_lang: preferredSource,
    session_alerts: sessionAlerts,
    text_size: textSize,
    update,
  } = usePreferences();
  const systemScheme = useColorScheme();
  const dark = appearanceMode === "dark" || (appearanceMode === "system" && systemScheme === "dark");
  const [detail, setDetail] = useState<SettingsDetail | null>(null);

  const email = user?.email ?? "quickvoice@example.com";
  const displayName = String(
    user?.user_metadata?.display_name ??
    user?.user_metadata?.full_name ??
    email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
  );
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <View style={[styles.page, dark && styles.pageDark]}>
      <Pressable onPress={() => setActiveTab("profile")} style={({ pressed }) => [styles.profileHeader, dark && styles.surfaceDark, pressed && styles.profilePressed]}>
        <View style={styles.profileAccent} />
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            {avatarUrl
              ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              : <Text style={styles.avatarInitials}>{initials || "QV"}</Text>}
          </View>
          <View style={styles.avatarBadge}>
            <Ionicons name="checkmark" size={11} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.profileEyebrow}>{t("settings.accountEyebrow")}</Text>
          <Text numberOfLines={1} style={[styles.profileName, dark && styles.textDark]}>{displayName}</Text>
          <Text numberOfLines={1} style={[styles.profileEmail, dark && styles.secondaryTextDark]}>{email}</Text>
          <View style={styles.manageProfile}>
            <Text style={styles.manageProfileText}>{t("settings.manageProfile")}</Text>
            <Ionicons name="arrow-forward" size={13} color="#007AFF" />
          </View>
        </View>
      </Pressable>

      <SettingsGroup dark={dark} label={t("settings.account")}>
        <SettingRow dark={dark} icon="person-outline" title={t("settings.myProfile")} subtitle={t("settings.profileSubtitle")} onPress={() => setActiveTab("profile")} />
        <SettingRow dark={dark} divider icon="shield-checkmark-outline" title={t("settings.privacy")} subtitle={t("settings.privacySubtitle")} onPress={onPrivacySecurity ?? (() => {})} />
      </SettingsGroup>

      <SettingsGroup dark={dark} label={t("settings.appearance")}>
        <NavigationSettingRow
          dark={dark}
          icon="contrast-outline"
          title={t("settings.theme")}
          subtitle={t("settings.themeSubtitle")}
          value={appearanceMode === "system" ? t("settings.system") : appearanceMode === "dark" ? t("settings.dark") : t("settings.light")}
          onPress={() => setDetail("theme")}
        />
        <NavigationSettingRow
          dark={dark}
          divider
          icon="text-outline"
          title={t("settings.textSize")}
          subtitle={t("settings.textSizeSubtitle")}
          value={textSize === "default" ? t("settings.default") : textSize === "large" ? t("settings.large") : t("settings.small")}
          onPress={() => setDetail("text-size")}
        />
        <NavigationSettingRow dark={dark} divider icon="globe-outline" title={t("settings.appLanguage")} subtitle={t("settings.appLanguageSubtitle")} value={uiLanguage === "ja" ? t("common.japanese") : t("common.english")} onPress={() => setDetail("ui-language")} />
      </SettingsGroup>

      <SettingsGroup dark={dark} label={t("settings.translation")}>
        <NavigationSettingRow
          dark={dark}
          icon="language-outline"
          title={t("settings.language")}
          subtitle={t("settings.languageSubtitle")}
          value={preferredSource === "ja" ? t("common.japanese") : t("common.english")}
          onPress={() => setDetail("language")}
        />

        <SettingRow
          dark={dark}
          divider
          icon="volume-high-outline"
          title={t("settings.speak")}
          subtitle={t("settings.speakSubtitle")}
          trailing={
            <Switch
              ios_backgroundColor="#D8DCE2"
              onValueChange={(value) => update({ auto_speak: value })}
              trackColor={{ false: "#D8DCE2", true: "#8AB9F6" }}
              thumbColor={autoSpeak ? "#007AFF" : "#FFFFFF"}
              value={autoSpeak}
            />
          }
        />
      </SettingsGroup>

      <SettingsGroup dark={dark} label={t("settings.notifications")}>
        <SettingRow
          dark={dark}
          icon="notifications-outline"
          title={t("settings.notificationsTitle")}
          subtitle={t("settings.notificationsSubtitle")}
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
      </SettingsGroup>

      <SettingsGroup dark={dark} label={t("settings.support")}>
        <SettingRow dark={dark} icon="help-circle-outline" title={t("settings.help")} subtitle={t("settings.helpSubtitle")} onPress={() => Alert.alert(t("settings.help"), t("settings.helpMessage"))} />
        <SettingRow dark={dark} divider icon="information-circle-outline" title={t("settings.about")} subtitle={t("settings.version")} onPress={() => Alert.alert(t("settings.about"), t("settings.aboutMessage"))} />
      </SettingsGroup>

      <Pressable accessibilityRole="button" onPress={signOut} style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}>
        <Ionicons name="log-out-outline" size={20} color="#D33A3A" />
        <Text style={styles.logoutText}>{t("settings.logout")}</Text>
      </Pressable>

      <Modal
        animationType="slide"
        onRequestClose={() => setDetail(null)}
        presentationStyle="fullScreen"
        visible={detail !== null}
      >
        <SettingsDetailScreen
          dark={dark}
          detail={detail}
          appearanceMode={appearanceMode}
          uiLanguage={uiLanguage}
          preferredSource={preferredSource}
          textSize={textSize}
          onBack={() => setDetail(null)}
          onAppearanceChange={(value) => update({ appearance_mode: value })}
          onUiLanguageChange={(value) => update({ ui_language: value })}
          onLanguageChange={(value) => update({
            preferred_source_lang: value,
            preferred_target_lang: value === "en" ? "ja" : "en",
          })}
          onTextSizeChange={(value) => update({ text_size: value })}
        />
      </Modal>
    </View>
  );
}

function SettingsGroup({ label, children, dark }: { label: string; children: ReactNode; dark?: boolean }) {
  return (
    <View style={styles.groupWrap}>
      <Text style={[styles.groupLabel, dark && styles.secondaryTextDark]}>{label}</Text>
      <View style={[styles.group, dark && styles.surfaceDark]}>{children}</View>
    </View>
  );
}

function SettingRow({ icon, title, subtitle, onPress, trailing, divider = false, dark = false }: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  divider?: boolean;
  dark?: boolean;
}) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.row, divider && styles.rowDivider, divider && dark && styles.rowDividerDark, pressed && (dark ? styles.pressedDark : styles.pressed)]}>
      <View style={[styles.iconBox, dark && styles.iconBoxDark]}><Ionicons name={icon} size={21} color={dark ? "#E9EDF4" : "#252A32"} /></View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, dark && styles.textDark]}>{title}</Text>
        {subtitle ? <Text numberOfLines={1} style={[styles.rowSubtitle, dark && styles.secondaryTextDark]}>{subtitle}</Text> : null}
      </View>
      {trailing ?? (onPress ? <Ionicons name="chevron-forward" size={18} color="#B3B8C0" /> : null)}
    </Pressable>
  );
}

function NavigationSettingRow({ dark, divider, icon, title, subtitle, value, onPress }: {
  dark: boolean;
  divider?: boolean;
  icon: IconName;
  title: string;
  subtitle: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <SettingRow
      dark={dark}
      divider={divider}
      icon={icon}
      title={title}
      subtitle={subtitle}
      onPress={onPress}
      trailing={
        <View style={styles.valueTrailing}>
          <Text style={styles.valueText}>{value}</Text>
          <Ionicons name="chevron-forward" size={17} color="#B3B8C0" />
        </View>
      }
    />
  );
}

function SettingsDetailScreen({
  appearanceMode,
  dark,
  detail,
  onAppearanceChange,
  onBack,
  onLanguageChange,
  onTextSizeChange,
  onUiLanguageChange,
  preferredSource,
  textSize,
  uiLanguage,
}: {
  appearanceMode: "system" | "light" | "dark";
  dark: boolean;
  detail: SettingsDetail | null;
  onAppearanceChange: (value: "system" | "light" | "dark") => void;
  onBack: () => void;
  onLanguageChange: (value: "en" | "ja") => void;
  onTextSizeChange: (value: "small" | "default" | "large") => void;
  onUiLanguageChange: (value: "en" | "ja") => void;
  preferredSource: string;
  textSize: "small" | "default" | "large";
  uiLanguage: "en" | "ja";
}) {
  const { t } = useTranslation();
  if (!detail) return null;

  const configuration = detail === "theme"
    ? {
        title: t("settings.theme"),
        body: t("settings.themeBody"),
        selected: appearanceMode,
        options: [
          { label: t("settings.system"), value: "system", subtitle: t("settings.systemSubtitle"), icon: "phone-portrait-outline" as IconName },
          { label: t("settings.light"), value: "light", subtitle: t("settings.lightSubtitle"), icon: "sunny-outline" as IconName },
          { label: t("settings.dark"), value: "dark", subtitle: t("settings.darkSubtitle"), icon: "moon-outline" as IconName },
        ],
      }
    : detail === "text-size"
      ? {
          title: t("settings.textSize"),
          body: t("settings.textSizeBody"),
          selected: textSize,
          options: [
            { label: t("settings.small"), value: "small", subtitle: t("settings.smallSubtitle"), icon: "text-outline" as IconName },
            { label: t("settings.default"), value: "default", subtitle: t("settings.defaultSubtitle"), icon: "text-outline" as IconName },
            { label: t("settings.large"), value: "large", subtitle: t("settings.largeSubtitle"), icon: "text-outline" as IconName },
          ],
        }
      : detail === "ui-language" ? {
          title: t("settings.appLanguage"),
          body: t("settings.appLanguageBody"),
          selected: uiLanguage,
          options: [
            { label: t("common.english"), value: "en", subtitle: "English", icon: "globe-outline" as IconName },
            { label: t("common.japanese"), value: "ja", subtitle: "日本語", icon: "globe-outline" as IconName },
          ],
        } : {
          title: t("settings.language"),
          body: t("settings.languageBody"),
          selected: preferredSource,
          options: [
            { label: t("common.english"), value: "en", subtitle: "English (United States)", icon: "language-outline" as IconName },
            { label: t("common.japanese"), value: "ja", subtitle: "日本語", icon: "language-outline" as IconName },
          ],
        };

  const select = (value: string) => {
    if (detail === "theme") onAppearanceChange(value as "system" | "light" | "dark");
    else if (detail === "text-size") onTextSizeChange(value as "small" | "default" | "large");
    else if (detail === "ui-language") onUiLanguageChange(value as "en" | "ja");
    else onLanguageChange(value as "en" | "ja");
  };

  return (
    <SafeAreaView style={[styles.detailPage, dark && styles.detailPageDark]}>
      <View style={styles.detailHeader}>
        <Pressable accessibilityLabel={t("privacy.back")} onPress={onBack} style={({ pressed }) => [styles.backButton, dark && styles.backButtonDark, pressed && styles.profilePressed]}>
          <Ionicons name="chevron-back" size={23} color={dark ? "#F5F7FA" : "#171A20"} />
        </Pressable>
        <Text style={[styles.detailTitle, dark && styles.textDark]}>{configuration.title}</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <View style={styles.detailContent}>
        <Text style={[styles.detailBody, dark && styles.secondaryTextDark]}>{configuration.body}</Text>
        <View style={[styles.optionGroup, dark && styles.surfaceDark]}>
          {configuration.options.map((option, index) => {
            const selected = configuration.selected === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => select(option.value)}
                style={({ pressed }) => [
                  styles.optionRow,
                  index > 0 && styles.rowDivider,
                  index > 0 && dark && styles.rowDividerDark,
                  pressed && (dark ? styles.pressedDark : styles.pressed),
                ]}
              >
                <View style={[styles.iconBox, dark && styles.iconBoxDark]}>
                  <Ionicons name={option.icon} size={21} color={selected ? "#007AFF" : dark ? "#E9EDF4" : "#252A32"} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={[styles.rowTitle, dark && styles.textDark, selected && styles.selectedOptionText]}>{option.label}</Text>
                  <Text style={[styles.rowSubtitle, dark && styles.secondaryTextDark]}>{option.subtitle}</Text>
                </View>
                {selected ? <Ionicons name="checkmark-circle" size={23} color="#007AFF" /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", backgroundColor: "#007AFF", borderRadius: 999, height: 64, justifyContent: "center", overflow: "hidden", width: 64 },
  avatarBadge: { alignItems: "center", backgroundColor: "#24B47E", borderColor: "#FFFFFF", borderRadius: 999, borderWidth: 2, bottom: 0, height: 21, justifyContent: "center", position: "absolute", right: 0, width: 21 },
  avatarInitials: { color: "#FFFFFF", fontSize: 21, fontWeight: "700", letterSpacing: 0.4 },
  avatarImage: { height: "100%", width: "100%" },
  avatarRing: { borderColor: "#D9E9FF", borderRadius: 999, borderWidth: 4, padding: 3, position: "relative" },
  backButton: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E0E3E8", borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, height: 42, justifyContent: "center", width: 42 },
  backButtonDark: { backgroundColor: "#25292F", borderColor: "#3A4049" },
  backButtonPlaceholder: { height: 42, width: 42 },
  detailBody: { color: "#727B88", fontSize: 15, lineHeight: 22, marginBottom: 22 },
  detailContent: { paddingHorizontal: 20, paddingTop: 22 },
  detailHeader: { alignItems: "center", flexDirection: "row", height: 64, justifyContent: "space-between", paddingHorizontal: 18 },
  detailPage: { backgroundColor: "#F5F6F8", flex: 1 },
  detailPageDark: { backgroundColor: "#0E1013" },
  detailTitle: { color: "#171A20", fontSize: 20, fontWeight: "700", letterSpacing: -0.35 },
  group: { backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden", shadowColor: "#182238", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.045, shadowRadius: 10, elevation: 2 },
  groupLabel: { color: "#8B929D", fontSize: 11, fontWeight: "600", letterSpacing: 0.8, marginBottom: 7, marginLeft: 6 },
  groupWrap: { width: "100%" },
  iconBox: { alignItems: "center", backgroundColor: "#F0F1F3", borderRadius: 11, height: 42, justifyContent: "center", width: 42 },
  iconBoxDark: { backgroundColor: "#343941" },
  logoutButton: { alignItems: "center", borderColor: "#E05A5A", borderRadius: 17, borderWidth: 1.2, flexDirection: "row", gap: 9, justifyContent: "center", minHeight: 56, width: "100%" },
  logoutPressed: { backgroundColor: "#FFF3F3", opacity: 0.8 },
  logoutText: { color: "#D33A3A", fontSize: 16, fontWeight: "600" },
  manageProfile: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "#EDF5FF", borderRadius: 999, flexDirection: "row", gap: 5, marginTop: 11, paddingHorizontal: 11, paddingVertical: 6 },
  manageProfileText: { color: "#007AFF", fontSize: 12, fontWeight: "600" },
  optionGroup: { backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden" },
  optionRow: { alignItems: "center", flexDirection: "row", gap: 13, minHeight: 78, paddingHorizontal: 15, paddingVertical: 12 },
  page: { gap: 22, width: "100%" },
  pageDark: { backgroundColor: "#0E1013" },
  pressed: { backgroundColor: "#F5F6F8" },
  pressedDark: { backgroundColor: "#30343A" },
  profileCopy: { flex: 1, minWidth: 0 },
  profileAccent: { backgroundColor: "#007AFF", borderBottomLeftRadius: 999, borderTopLeftRadius: 999, bottom: 16, left: 0, position: "absolute", top: 16, width: 4 },
  profileEmail: { color: "#7D8795", fontSize: 13, lineHeight: 18, marginTop: 2 },
  profileEyebrow: { color: "#7E9BC0", fontSize: 10, fontWeight: "700", letterSpacing: 1.05, marginBottom: 5 },
  profileHeader: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E8EEF6", borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 16, minHeight: 132, overflow: "hidden", paddingHorizontal: 20, paddingVertical: 18, shadowColor: "#194A85", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 3 },
  profileName: { color: colors.text, fontSize: 21, fontWeight: "700", letterSpacing: -0.45 },
  profilePressed: { opacity: 0.86, transform: [{ scale: 0.992 }] },
  row: { alignItems: "center", flexDirection: "row", gap: 13, minHeight: 72, paddingHorizontal: 15, paddingVertical: 11 },
  rowCopy: { flex: 1, minWidth: 0 },
  rowDivider: { borderTopColor: "#ECEEF2", borderTopWidth: StyleSheet.hairlineWidth },
  rowDividerDark: { borderTopColor: "#383D45" },
  rowSubtitle: { color: "#858C96", fontSize: 12, lineHeight: 17, marginTop: 2 },
  rowTitle: { color: "#20242B", fontSize: 16, fontWeight: "500", letterSpacing: -0.15 },
  secondaryTextDark: { color: "#9CA4B0" },
  selectedOptionText: { color: "#007AFF", fontWeight: "700" },
  surfaceDark: { backgroundColor: "#25292F", borderColor: "#3A4049" },
  textDark: { color: "#F5F7FA" },
  valueText: { color: "#7C8490", fontSize: 13, fontWeight: "500" },
  valueTrailing: { alignItems: "center", flexDirection: "row", gap: 4 },
});
