import { useEffect, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";

import { useAuth } from "../features/auth/auth";
import { usePreferences } from "../features/preferences/context";
import { Chip, Field, Panel, PrimaryButton, ScreenHeader, uiStyles } from "../components/ui";
import { languages, type LanguageCode } from "../constants/data";
import { supabase } from "../services/supabase";
import { atoms } from "../theme/atoms";
import { useTheme } from "../theme/ThemeProvider";
import { spacing } from "../theme/theme";
import { Ionicons } from "@expo/vector-icons";

export function ProfileScreen() {
  const { session, user } = useAuth();
  const { update: updatePrefs } = usePreferences();
  const [displayName, setDisplayName] = useState("");
  const [preferred, setPreferred] = useState<LanguageCode>("en");
  const [busy, setBusy] = useState(false);
  const c = useTheme();

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
        const fallbackName = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.display_name || "";
        setDisplayName(data?.display_name || fallbackName);
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
    if (!error) {
      updatePrefs({ preferred_source_lang: preferred });
    }
    setBusy(false);
    Alert.alert("QuickVoice", error ? error.message : "Profile saved");
  };

  return (
    <View style={atoms.gapLg}>
      {/* ── Glass card header ── */}
      <View style={[{ backgroundColor: c.surface }, atoms.border1, atoms.overflowHidden, { borderColor: c.border, borderRadius: 22, shadowColor: c.text, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 }]}>
        {/* Gradient header area */}
        <View style={[atoms.gapMd, { backgroundColor: c.primarySoft, borderBottomColor: c.border, borderBottomWidth: 1, padding: spacing.lg }]}>
          <View style={[atoms.flexRow, atoms.itemsStart, atoms.gapMd]}>
            {/* Avatar: h-16 w-16 rounded-2xl bg-primary */}
            <View style={{ alignItems: "center", backgroundColor: c.primary, borderRadius: 22, height: 64, justifyContent: "center", shadowColor: c.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4, width: 64 }}>
              <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "700" }}>{initials}</Text>
            </View>
            <View style={[atoms.flex1, { gap: 4 }]}>
              <View style={[atoms.flexRow, atoms.itemsCenter, { gap: 4 }]}>
                <Ionicons name="person-outline" size={12} color={c.primary} />
                <Text style={{ color: c.primary, fontSize: 12, fontWeight: "500" }}>Personal profile</Text>
              </View>
              <Text style={{ color: c.text, fontSize: 18, fontWeight: "700", letterSpacing: -0.3 }}>
                {displayName.trim() || "Make it yours"}
              </Text>
              <Text style={uiStyles.rowMeta}>{user?.email ?? "Signed in"}</Text>
            </View>
          </View>

          {/* Account ready info box */}
          <View style={[{ backgroundColor: c.surface }, atoms.border1, { borderColor: c.border, borderRadius: 14, gap: 4, padding: 12 }]}>
            <View style={[atoms.flexRow, atoms.itemsCenter, { gap: 5 }]}>
              <Ionicons name="shield-checkmark-outline" size={14} color={c.primary} />
              <Text style={{ color: c.text, fontSize: 13, fontWeight: "600" }}>Account ready</Text>
            </View>
            <Text style={uiStyles.rowMeta}>
              Your preferences sync automatically for future sessions.
            </Text>
          </View>
        </View>

        {/* ── Form section ── */}
        <View style={[atoms.gapMd, { padding: spacing.lg }]}>
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
          <View style={{ gap: 8 }}>
            <Text style={{ color: c.text, fontSize: 13, fontWeight: "500" }}>Preferred language</Text>
            <View style={[atoms.flexRow, atoms.flexWrap, { gap: 7 }]}>
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

        {/* ── Profile preview box ── */}
        <View style={{ borderTopColor: c.border, borderTopWidth: 1, padding: spacing.lg }}>
          <View style={[{ backgroundColor: c.secondary }, { borderRadius: 14, gap: 10, padding: spacing.md }]}>
            <View style={[atoms.flexRow, atoms.itemsCenter, { gap: 5 }]}>
              <Ionicons name="language-outline" size={13} color={c.primary} />
              <Text style={{ color: c.text, fontSize: 13, fontWeight: "500" }}>Your profile preview</Text>
            </View>

            {/* Email row */}
            <View style={[atoms.flexRow, atoms.itemsCenter, { backgroundColor: c.surface }, atoms.border1, { borderColor: c.border, borderRadius: 8, gap: 10, padding: 10 }]}>
              <View style={{ alignItems: "center", backgroundColor: c.primarySoft, borderRadius: 999, height: 34, justifyContent: "center", width: 34 }}>
                <Ionicons name="mail-outline" size={15} color={c.primary} />
              </View>
              <View style={[atoms.flex1, { gap: 2 }]}>
                <Text style={{ color: c.text, fontSize: 13, fontWeight: "500" }}>{user?.email ?? "Signed in"}</Text>
                <Text style={uiStyles.rowMeta}>Primary email</Text>
              </View>
            </View>

            {/* Dashed preview box */}
            <View style={{ borderColor: c.border, borderRadius: 8, borderStyle: "dashed", borderWidth: 1, gap: 4, padding: 10 }}>
              <Text style={{ color: c.muted, fontSize: 10, fontWeight: "600", letterSpacing: 1.2, textTransform: "uppercase" }}>Preview</Text>
              <Text style={{ color: c.text, fontSize: 15, fontWeight: "600" }}>
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
