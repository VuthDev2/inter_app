/**
 * ProfileScreen — mirrors web /profile page
 *
 * Web design:
 *  - glass-card with gradient header (from-primary/15 via-background to-background)
 *  - Avatar: h-16 w-16 rounded-2xl bg-primary text-white initials, shadow
 *  - Heading: "Make the experience feel like yours"
 *  - "Account ready" info panel (rounded-2xl border bg-background/70)
 *  - Form: Display name Input + Preferred language Select + Save button
 *  - Right panel: "Your profile preview" — email row + dashed preview box
 *
 * Mobile adaptation: single-column, profile header card at top
 */
import { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../auth";
import { Chip, Field, Panel, PrimaryButton, ScreenHeader, uiStyles } from "../components/ui";
import { languages, type LanguageCode } from "../data";
import { supabase } from "../supabase";
import { colors, radius, spacing } from "../theme";
import { Ionicons } from "@expo/vector-icons";

export function ProfileScreen() {
  const { session, user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [preferred, setPreferred] = useState<LanguageCode>("en");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !supabase) return;
    const client = supabase;

    const loadProfile = async () => {
      try {
        const { data } = await client
          .from("profiles")
          .select("display_name, preferred_language")
          .eq("id", user.id)
          .maybeSingle();
        setDisplayName(data?.display_name ?? "");
        setPreferred((data?.preferred_language ?? "en") as LanguageCode);
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

  const selectedLang = languages.find((l) => l.code === preferred)?.label ?? "English";

  const save = async () => {
    if (!user || !supabase) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: displayName, preferred_language: preferred });
    setBusy(false);
    Alert.alert("QuickVoice", error ? error.message : "Profile saved");
  };

  return (
    <View style={styles.screen}>
      {/* ── Glass card header — gradient from-primary/15 ── */}
      <View style={styles.profileCard}>
        {/* Gradient header area */}
        <View style={styles.gradientHeader}>
          <View style={styles.avatarRow}>
            {/* Avatar: h-16 w-16 rounded-2xl bg-primary */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileMeta}>
              <View style={styles.profileMetaTag}>
                <Ionicons name="person-outline" size={12} color={colors.primary} />
                <Text style={styles.profileMetaTagText}>Personal profile</Text>
              </View>
              <Text style={styles.profileName}>
                {displayName.trim() || "Make it yours"}
              </Text>
              <Text style={uiStyles.rowMeta}>{user?.email ?? "Signed in"}</Text>
            </View>
          </View>

          {/* Account ready info box */}
          <View style={styles.accountBox}>
            <View style={styles.accountBoxHeader}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
              <Text style={styles.accountBoxTitle}>Account ready</Text>
            </View>
            <Text style={uiStyles.rowMeta}>
              Your preferences sync automatically for future sessions.
            </Text>
          </View>
        </View>

        {/* ── Form section ── */}
        <View style={styles.formSection}>
          <ScreenHeader
            title="Make it yours"
            body="Update your display name and default language for interpretation and captions."
          />

          <Field
            label="Display name"
            onChangeText={setDisplayName}
            placeholder="Add your name"
            value={displayName}
          />

          {/* Preferred language — Chip picker */}
          <View style={styles.langSection}>
            <Text style={styles.langLabel}>Preferred language</Text>
            <View style={styles.chips}>
              {languages.map((lang) => (
                <Chip
                  key={lang.code}
                  label={lang.label}
                  selected={preferred === lang.code}
                  onPress={() => setPreferred(lang.code)}
                />
              ))}
            </View>
          </View>

          <PrimaryButton disabled={busy} icon="save-outline" onPress={save}>
            {busy ? "Saving…" : "Save changes"}
          </PrimaryButton>
        </View>

        {/* ── Profile preview box — dashed border ── */}
        <View style={styles.previewSection}>
          <View style={styles.previewBox}>
            <View style={styles.previewHeader}>
              <Ionicons name="language-outline" size={13} color={colors.primary} />
              <Text style={styles.previewHeaderText}>Your profile preview</Text>
            </View>

            {/* Email row */}
            <View style={styles.emailRow}>
              <View style={styles.emailIconBox}>
                <Ionicons name="mail-outline" size={15} color={colors.primary} />
              </View>
              <View style={styles.emailCopy}>
                <Text style={styles.emailText}>{user?.email ?? "Signed in"}</Text>
                <Text style={uiStyles.rowMeta}>Primary email</Text>
              </View>
            </View>

            {/* Dashed preview box */}
            <View style={styles.previewDashed}>
              <Text style={styles.previewLabel}>Preview</Text>
              <Text style={styles.previewName}>
                {displayName.trim() || "Your display name"}
              </Text>
              <Text style={uiStyles.rowMeta}>Default language: {selectedLang}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg,
  },

  // Main profile card — glass-card equivalent
  profileCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xxl,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  // Gradient header area (primary/15 tint)
  gradientHeader: {
    backgroundColor: "#EEF2FC", // colors.primarySoft — approximates from-primary/15
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  avatarRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
  },
  // Avatar: h-16 w-16 rounded-2xl bg-primary, shadow
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.xxl,
    height: 64,
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    width: 64,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
  profileMeta: {
    flex: 1,
    gap: 4,
  },
  profileMetaTag: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  profileMetaTagText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "500",
  },
  profileName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  // Account ready box
  accountBox: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  accountBoxHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  accountBoxTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },

  // Form section
  formSection: {
    gap: spacing.md,
    padding: spacing.lg,
  },

  // Language section
  langSection: {
    gap: 8,
  },
  langLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "500",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  // Preview section
  previewSection: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: spacing.lg,
  },
  previewBox: {
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    gap: 10,
    padding: spacing.md,
  },
  previewHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  previewHeaderText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "500",
  },
  emailRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 10,
  },
  emailIconBox: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  emailCopy: {
    flex: 1,
    gap: 2,
  },
  emailText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "500",
  },
  previewDashed: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 4,
    padding: 10,
  },
  previewLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  previewName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
});
