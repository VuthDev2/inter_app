/**
 * SettingsScreen — mirrors web /settings page
 *
 * Web design:
 *  - max-w-lg, space-y-3
 *  - Page header: h1 "Settings", muted subtitle
 *  - SectionCard: rounded-2xl, backdrop-blur(14px), section title uppercase tracking-[0.12em]
 *  - ToggleRow: h-9 w-9 rounded-xl icon box (per-row color) + label + custom animated switch
 *  - LinkRow: same icon box + label + chevron (+ badge)
 *  - Sections: Notifications · Appearance · Language & Region · Account
 *  - Footer: "QuickVoice · v1.0" text-center text-xs muted
 */
import { useState } from "react";
import { Alert, Text, View } from "react-native";

import type { Tab } from "../../App";
import { useAuth } from "../auth";
import { LinkRow, ScreenHeader, ToggleRow } from "../components/ui";
import { atoms } from "../atoms";
import { colors, spacing } from "../theme";

export function SettingsScreen({ setActiveTab }: { setActiveTab: (tab: Tab) => void }) {
  const { signOut } = useAuth();

  // Notification prefs
  const [sessionAlerts, setSessionAlerts] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [haptics, setHaptics] = useState(false);

  // Appearance
  const [darkMode, setDarkMode] = useState(false);
  const [compactView, setCompactView] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <View style={[atoms.gapLg, { gap: spacing.md + 2 }]}>
      {/* Page header */}
      <ScreenHeader
        title="Settings"
        body="Manage your preferences and account."
      />

      {/* ── Notifications ── */}
      <SectionCard title="Notifications">
        <ToggleRow
          icon="notifications-outline"
          label="Session alerts"
          description="Get notified when someone joins your session"
          value={sessionAlerts}
          onValueChange={setSessionAlerts}
          accent="#4B71C4"
        />
        <ToggleRow
          icon="volume-high-outline"
          label="Sound effects"
          description="Audio cues for key events"
          value={soundEnabled}
          onValueChange={setSoundEnabled}
          accent={colors.amber}
        />
        <ToggleRow
          icon="phone-portrait-outline"
          label="Haptic feedback"
          description="Vibrate on important events"
          value={haptics}
          onValueChange={setHaptics}
          accent={colors.purple}
        />
      </SectionCard>

      {/* ── Appearance ── */}
      <SectionCard title="Appearance">
        <ToggleRow
          icon="moon-outline"
          label="Dark mode"
          description="Always-on dark interface"
          value={darkMode}
          onValueChange={(v) => {
            setDarkMode(v);
            Alert.alert("Theme", v ? "Dark mode enabled" : "Light mode enabled");
          }}
          accent="#7B8299"
        />
        <ToggleRow
          icon="eye-outline"
          label="Compact view"
          description="Denser layout for session transcripts"
          value={compactView}
          onValueChange={setCompactView}
          accent="#10B981"
        />
      </SectionCard>

      {/* ── Language & Region ── */}
      <SectionCard title="Language & Region">
        <LinkRow
          icon="language-outline"
          label="Language & preferences"
          description="Set your display name and default language"
          onPress={() => setActiveTab("profile")}
        />
      </SectionCard>

      {/* ── Account ── */}
      <SectionCard title="Account">
        <LinkRow
          icon="shield-checkmark-outline"
          label="Privacy policy"
          description="How we handle your data"
          onPress={() => Alert.alert("Privacy", "Connect to your privacy policy URL.")}
        />
        <LinkRow
          icon="log-out-outline"
          label="Sign out"
          description="Sign out of your account"
          onPress={handleSignOut}
        />
        <LinkRow
          icon="trash-outline"
          label="Delete account"
          description="Permanently remove your data"
          onPress={() =>
            Alert.alert(
              "Delete account",
              "Account deletion requires confirmation via email. A link will be sent to your inbox.",
            )
          }
          destructive
        />
      </SectionCard>

      {/* Footer */}
      <Text style={[atoms.textCenter, atoms.textXs, atoms.textMuted, { marginTop: spacing.sm }]}>QuickVoice · v1.0</Text>
    </View>
  );
}

/**
 * SectionCard — mirrors web SectionCard component
 */
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={[atoms.bgSurface, { borderColor: colors.border, borderRadius: 22, borderWidth: 1, overflow: "hidden", shadowColor: colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }]}>
      <Text style={[atoms.uppercase, atoms.textXs, atoms.fontSemibold, atoms.textMuted, { letterSpacing: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 4 }]}>{title}</Text>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: 4 }}>{children}</View>
    </View>
  );
}
