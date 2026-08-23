import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, useColorScheme, View } from "react-native";

import { useAuth } from "../features/auth/auth";
import { usePreferences } from "../features/preferences/context";
import { supabase } from "../services/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../i18n/I18nContext";

export function ProfileScreen() {
  const { t } = useTranslation();
  const { session, user } = useAuth();
  const { appearance_mode: appearanceMode } = usePreferences();
  const systemScheme = useColorScheme();
  const dark = appearanceMode === "dark" || (appearanceMode === "system" && systemScheme === "dark");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !supabase) return;
    const client = supabase;

    const loadProfile = async () => {
      try {
        const { data } = await client
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle();
        setDisplayName(data?.display_name ?? "");
      } catch {
        // ignore load errors
      }
    };

    loadProfile();
  }, [session?.access_token, user]);

  const initials = useMemo(() => {
    const base = displayName.trim() || user?.email || "U";
    return (
      base
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || "U"
    );
  }, [displayName, user?.email]);

  const save = async () => {
    if (!user || !supabase) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: displayName });
    setBusy(false);
    Alert.alert("QuickVoice", error ? t("errors.profileSaveFailed") : t("profile.saved"));
  };

  return (
    <View style={[styles.screen, dark && styles.screenDark]}>
      <View style={[styles.hero, dark && styles.surfaceDark]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.identity}>
          <View style={[styles.accountBadge, dark && styles.blueBadgeDark]}>
            <Ionicons name="person" size={11} color="#3173D9" />
            <Text style={styles.accountBadgeText}>{t("profile.personalAccount")}</Text>
          </View>
          <Text numberOfLines={1} style={[styles.name, dark && styles.textDark]}>
            {displayName.trim() || t("profile.yourProfile")}
          </Text>
          <Text numberOfLines={1} style={[styles.email, dark && styles.secondaryTextDark]}>
            {user?.email ?? t("profile.signedIn")}
          </Text>
        </View>
        <View style={[styles.verified, dark && styles.verifiedDark]}>
          <Ionicons name="checkmark" size={15} color="#FFFFFF" />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <View>
            <Text style={[styles.sectionTitle, dark && styles.textDark]}>{t("profile.youCanEdit")}</Text>
            <Text style={[styles.sectionCaption, dark && styles.secondaryTextDark]}>{t("profile.editCaption")}</Text>
          </View>
          <View style={[styles.editableBadge, dark && styles.blueBadgeDark]}>
            <Ionicons name="pencil" size={12} color="#3173D9" />
            <Text style={styles.editableBadgeText}>{t("profile.editable")}</Text>
          </View>
        </View>

        <View style={[styles.card, dark && styles.surfaceDark]}>
          <View style={styles.formRow}>
            <View style={[styles.rowIcon, dark && styles.blueBadgeDark]}>
              <Ionicons name="person-outline" size={20} color="#3173D9" />
            </View>
            <View style={styles.formContent}>
              <Text style={[styles.fieldLabel, dark && styles.textDark]}>{t("profile.displayName")}</Text>
              <TextInput
                accessibilityLabel={t("profile.displayName")}
                autoCapitalize="words"
                onChangeText={setDisplayName}
                placeholder={t("profile.addName")}
                placeholderTextColor={dark ? "#7F8895" : "#9AA2AE"}
                returnKeyType="done"
                style={[styles.nameInput, dark && styles.textDark]}
                value={displayName}
              />
            </View>
            <Ionicons name="pencil-outline" size={17} color={dark ? "#8E97A4" : "#9AA2AE"} />
          </View>

        </View>

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={save}
          style={({ pressed }) => [
            styles.saveButton,
            busy && styles.saveButtonDisabled,
            pressed && !busy && styles.saveButtonPressed,
          ]}
        >
          <Text style={styles.saveButtonText}>{busy ? t("profile.saving") : t("profile.save")}</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <View>
            <Text style={[styles.sectionTitle, dark && styles.textDark]}>{t("profile.accountInfo")}</Text>
            <Text style={[styles.sectionCaption, dark && styles.secondaryTextDark]}>{t("profile.accountInfoCaption")}</Text>
          </View>
          <View style={[styles.lockedBadge, dark && styles.lockedBadgeDark]}>
            <Ionicons name="lock-closed" size={11} color={dark ? "#A6AEBA" : "#6B7280"} />
            <Text style={[styles.lockedBadgeText, dark && styles.secondaryTextDark]}>{t("profile.readOnly")}</Text>
          </View>
        </View>

        <View style={[styles.card, dark && styles.surfaceDark]}>
          <View style={styles.readOnlyRow}>
            <View style={[styles.rowIcon, styles.readOnlyIcon, dark && styles.readOnlyIconDark]}>
              <Ionicons name="mail-outline" size={20} color={dark ? "#AAB2BE" : "#687386"} />
            </View>
            <View style={styles.formContent}>
              <Text style={[styles.fieldLabel, dark && styles.textDark]}>{t("profile.email")}</Text>
              <Text numberOfLines={1} style={[styles.readOnlyValue, dark && styles.secondaryTextDark]}>
                {user?.email ?? t("profile.signedIn")}
              </Text>
            </View>
            <Ionicons name="lock-closed-outline" size={17} color={dark ? "#8E97A4" : "#9AA2AE"} />
          </View>

          <View style={[styles.divider, dark && styles.dividerDark]} />

          <View style={styles.readOnlyRow}>
            <View style={[styles.rowIcon, styles.readOnlyIcon, dark && styles.readOnlyIconDark]}>
              <Ionicons name="checkmark-circle-outline" size={20} color={dark ? "#AAB2BE" : "#687386"} />
            </View>
            <View style={styles.formContent}>
              <Text style={[styles.fieldLabel, dark && styles.textDark]}>{t("profile.accountStatus")}</Text>
              <Text style={[styles.readOnlyValue, dark && styles.secondaryTextDark]}>{t("profile.active")}</Text>
            </View>
            <View style={styles.statusDot} />
          </View>
        </View>

        <Text style={[styles.readOnlyNote, dark && styles.secondaryTextDark]}>
          {t("profile.readOnlyNote")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  accountBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EAF3FF",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  accountBadgeText: { color: "#3173D9", fontSize: 11, fontWeight: "700" },
  avatar: {
    alignItems: "center",
    backgroundColor: "#1677E8",
    borderRadius: 25,
    height: 76,
    justifyContent: "center",
    shadowColor: "#1677E8",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    width: 76,
  },
  avatarText: { color: "#FFFFFF", fontSize: 25, fontWeight: "800", letterSpacing: -0.5 },
  blueBadgeDark: { backgroundColor: "#173459" },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E8ED",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  divider: { backgroundColor: "#ECEEF2", height: StyleSheet.hairlineWidth, marginLeft: 68 },
  dividerDark: { backgroundColor: "#3A4049" },
  editableBadge: {
    alignItems: "center",
    backgroundColor: "#EAF3FF",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  editableBadgeText: { color: "#3173D9", fontSize: 11, fontWeight: "700" },
  email: { color: "#7A8493", fontSize: 14, marginTop: 3 },
  fieldLabel: { color: "#1A1D24", fontSize: 14, fontWeight: "700" },
  formContent: { flex: 1, minWidth: 0 },
  formRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 84,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  hero: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E8ED",
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 16,
    padding: 18,
  },
  identity: { flex: 1, minWidth: 0 },
  lockedBadge: {
    alignItems: "center",
    backgroundColor: "#ECEEF2",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  lockedBadgeText: { color: "#6B7280", fontSize: 11, fontWeight: "700" },
  lockedBadgeDark: { backgroundColor: "#343941" },
  name: { color: "#111318", fontSize: 22, fontWeight: "800", letterSpacing: -0.5, marginTop: 9 },
  nameInput: {
    color: "#2B3038",
    fontSize: 16,
    marginTop: 4,
    paddingHorizontal: 0,
    paddingVertical: 3,
  },
  readOnlyIcon: { backgroundColor: "#F1F3F6" },
  readOnlyIconDark: { backgroundColor: "#343941" },
  readOnlyNote: { color: "#8A929F", fontSize: 12, lineHeight: 17, paddingHorizontal: 4 },
  readOnlyRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  readOnlyValue: { color: "#687386", fontSize: 14, marginTop: 4 },
  rowIcon: {
    alignItems: "center",
    backgroundColor: "#EAF3FF",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#1677E8",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    shadowColor: "#1677E8",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonPressed: { backgroundColor: "#0967CC", transform: [{ scale: 0.99 }] },
  saveButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  screen: { gap: 28 },
  screenDark: { backgroundColor: "#0E1013" },
  section: { gap: 12 },
  sectionCaption: { color: "#858E9C", fontSize: 12, marginTop: 3 },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  sectionTitle: { color: "#15181E", fontSize: 18, fontWeight: "800", letterSpacing: -0.25 },
  secondaryTextDark: { color: "#9CA4B0" },
  statusDot: { backgroundColor: "#34C759", borderRadius: 999, height: 9, width: 9 },
  surfaceDark: { backgroundColor: "#25292F", borderColor: "#3A4049" },
  textDark: { color: "#F5F7FA" },
  verified: {
    alignItems: "center",
    backgroundColor: "#34C759",
    borderColor: "#FFFFFF",
    borderRadius: 999,
    borderWidth: 2,
    height: 25,
    justifyContent: "center",
    position: "absolute",
    bottom: 17,
    left: 70,
    width: 25,
  },
  verifiedDark: { borderColor: "#25292F" },
});
