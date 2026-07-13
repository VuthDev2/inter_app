/**
 * AuthScreen — mirrors web /auth page
 *
 * Web design:
 *  - Full-screen centered, max-w-md
 *  - Logo: h-14 w-14 rounded-2xl bg-primary, Languages icon inside
 *  - Title: font-display text-3xl font-semibold "QuickVoice"
 *  - Subtitle: text-sm text-muted-foreground
 *  - glass-card p-6: Tabs (Sign in / Sign up) + fields + button
 *  - OR divider + "Continue with Google" secondary button
 */
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../auth";
import { Field, PrimaryButton, SecondaryButton } from "../components/ui";
import { colors, radius, spacing } from "../theme";

type Mode = "signin" | "signup";

export function AuthScreen() {
  const { authReady, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing details", "Add your email and password first.");
      return;
    }
    setBusy(true);
    const result =
      mode === "signin"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, displayName.trim());
    setBusy(false);

    if (result.error) {
      Alert.alert("QuickVoice", result.error);
      return;
    }
    if (mode === "signup") {
      Alert.alert("Account created", "You can start interpreting now.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.container}
      >
        {/* Brand block */}
        <View style={styles.brandBlock}>
          {/* Logo box: h-14 w-14 rounded-2xl bg-primary */}
          <View style={styles.logoBox}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>QuickVoice</Text>
          <Text style={styles.subtitle}>
            Real-time AI interpretation between two languages.
          </Text>
        </View>

        {/* Card — glass-card equivalent */}
        <View style={styles.card}>
          {/* Tab switcher: Sign in / Sign up */}
          <View style={styles.tabs}>
            <TabButton
              label="Sign in"
              active={mode === "signin"}
              onPress={() => setMode("signin")}
            />
            <TabButton
              label="Sign up"
              active={mode === "signup"}
              onPress={() => setMode("signup")}
            />
          </View>

          {/* Auth-not-ready warning */}
          {!authReady ? (
            <View style={styles.notice}>
              <Ionicons name="warning-outline" size={16} color={colors.amber} />
              <Text style={styles.noticeText}>
                Add SUPABASE credentials in mobile/.env to enable sign in.
              </Text>
            </View>
          ) : null}

          {/* Sign up: extra display name field */}
          {mode === "signup" ? (
            <Field
              label="Display name"
              onChangeText={setDisplayName}
              placeholder="Your name"
              value={displayName}
            />
          ) : null}

          <Field
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="you@example.com"
            value={email}
          />
          <Field
            label="Password"
            onChangeText={setPassword}
            secureTextEntry
            value={password}
          />

          <PrimaryButton
            disabled={busy || !authReady}
            icon={mode === "signin" ? "log-in-outline" : "person-add-outline"}
            onPress={submit}
          >
            {busy
              ? "Please wait..."
              : mode === "signin"
              ? "Sign in"
              : "Create account"}
          </PrimaryButton>

          {/* OR divider */}
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.orLine} />
          </View>

          {/* Google — secondary button */}
          <SecondaryButton
            icon="logo-google"
            onPress={() =>
              Alert.alert("Google sign-in", "OAuth requires a web browser redirect.")
            }
          >
            Continue with Google
          </SecondaryButton>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <View
      style={[styles.tabBtn, active && styles.tabBtnActive]}
    >
      <Text
        style={[styles.tabBtnText, active && styles.tabBtnTextActive]}
        onPress={onPress}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  container: {
    flex: 1,
    gap: spacing.xl,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },

  // Brand block
  brandBlock: {
    alignItems: "center",
    gap: spacing.sm,
  },
  logoBox: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.xxl,
    height: 56,
    justifyContent: "center",
    marginBottom: 4,
    width: 56,
  },
  logoImage: {
    height: 38,
    width: 38,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 280,
    textAlign: "center",
  },

  // Card — glass-card p-6
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xxl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  // Tab row — mirrors shadcn Tabs
  tabs: {
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  tabBtn: {
    borderRadius: radius.sm,
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "500",
  },
  tabBtnTextActive: {
    color: colors.text,
    fontWeight: "600",
  },

  // Notice
  notice: {
    alignItems: "flex-start",
    backgroundColor: colors.amberSoft,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  noticeText: {
    color: colors.amber,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },

  // OR divider
  orRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    marginVertical: 4,
  },
  orLine: {
    backgroundColor: colors.border,
    flex: 1,
    height: 1,
  },
  orText: {
    color: colors.muted,
    fontSize: 12,
  },
});
