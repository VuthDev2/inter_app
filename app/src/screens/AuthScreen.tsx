
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../features/auth/auth";
import { Field, PrimaryButton, SecondaryButton } from "../components/ui";
import { atoms } from "../theme/atoms";
import { colors, spacing } from "../theme/theme";

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
    <SafeAreaView style={[atoms.bgBackground, atoms.flex1]}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={[atoms.flex1, atoms.gapXl, atoms.justifyCenter, { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl }]}
      >
        {/* Brand block */}
        <View style={[atoms.itemsCenter, atoms.gapSm]}>
          <View style={{ alignItems: "center", backgroundColor: colors.primary, borderRadius: 22, height: 56, justifyContent: "center", marginBottom: 4, width: 56 }}>
            <Image
              source={require("../../assets/logo.png")}
              style={{ height: 38, width: 38 }}
              resizeMode="contain"
            />
          </View>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: "700", letterSpacing: -0.5 }}>QuickVoice</Text>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20, maxWidth: 280, textAlign: "center" }}>
            Real-time AI interpretation between two languages.
          </Text>
        </View>

        {/* Card — glass-card equivalent */}
        <View style={atoms.cardXxl}>
          {/* Tab switcher: Sign in / Sign up */}
          <View style={{ backgroundColor: colors.secondary, borderRadius: 8, flexDirection: "row", gap: 4, padding: 4 }}>
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
            <View style={{ alignItems: "flex-start", backgroundColor: colors.amberSoft, borderRadius: 8, flexDirection: "row", gap: spacing.sm, padding: spacing.md }}>
              <Ionicons name="warning-outline" size={16} color={colors.amber} />
              <Text style={{ color: colors.amber, flex: 1, fontSize: 12, lineHeight: 17 }}>
                Add SUPABASE credentials in app/.env to enable sign in.
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
          <View style={[atoms.flexRow, atoms.itemsCenter, atoms.gapMd, { marginVertical: 4 }]}>
            <View style={{ backgroundColor: colors.border, flex: 1, height: 1 }} />
            <Text style={{ color: colors.muted, fontSize: 12 }}>or</Text>
            <View style={{ backgroundColor: colors.border, flex: 1, height: 1 }} />
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
      style={[atoms.flex1, atoms.itemsCenter, { borderRadius: 6, paddingVertical: 9 }, active && { backgroundColor: colors.surface, shadowColor: colors.text, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }]}
    >
      <Text
        style={[{ color: colors.muted, fontSize: 14, fontWeight: "500" }, active && { color: colors.text, fontWeight: "600" }]}
        onPress={onPress}
      >
        {label}
      </Text>
    </View>
  );
}
