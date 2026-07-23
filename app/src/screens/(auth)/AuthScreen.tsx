import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthLogo } from "../../components/AuthLogo";
import { FormField } from "../../components/FormField";
import { PasswordField } from "../../components/PasswordField";
import { SocialButton } from "../../components/SocialButton";
import { useAuth } from "../../features/auth/auth";
import { useTypewriter } from "../../hooks/useTypewriter";
import { atoms } from "../../theme/atoms";

const PRIMARY = "#4B71C4";
const TEXT = "#161B2E";
const MUTED = "#7B8299";
const BORDER = "#DDE1EF";
const BG = "#FFFFFF";
const COOLDOWN = 30;

export function AuthScreen({ onForgotPassword }: { onForgotPassword?: () => void }) {
  const { authReady, signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [googleBusy, setGoogleBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const displayed = useTypewriter(mode === "signin" ? "Welcome back!" : "Create account");

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing details", "Add your email and password first.");
      return;
    }
    if (mode === "signup" && !displayName.trim()) {
      Alert.alert("Missing name", "Enter your display name.");
      return;
    }
    setBusy(true);
    const result =
      mode === "signin"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, displayName.trim());
    setBusy(false);

    if (result.error) {
      const msg = result.error.toLowerCase();
      if (msg.includes("rate limit") || msg.includes("too many")) {
        Alert.alert("Too many attempts", "Please wait a moment and try again.");
        setCooldown(COOLDOWN);
      } else if (msg.includes("email") && msg.includes("confirm")) {
        Alert.alert("Check your inbox", "We sent a confirmation link. Please check your email.");
      } else {
        Alert.alert("QuickVoice", result.error);
      }
      return;
    }
    if (mode === "signup") {
      Alert.alert("Account created", "You can start interpreting now.");
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
    } finally {
      setGoogleBusy(false);
    }
  };

  const canSubmit = !busy && !googleBusy && authReady && cooldown === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 30 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthLogo />

          <Text style={{ color: TEXT, fontSize: 26, fontWeight: "600", letterSpacing: -0.8, marginBottom: 28 }}>
            {displayed}<Text style={{ color: PRIMARY }}>|</Text>
          </Text>

          {!authReady && (
            <View style={{
              backgroundColor: "#FEF3C7", borderRadius: 12, flexDirection: "row",
              gap: 10, marginBottom: 20, padding: 14,
            }}>
              <Ionicons name="warning-outline" size={16} color="#B45309" style={{ marginTop: 1 }} />
              <Text style={{ color: "#B45309", flex: 1, fontSize: 12, lineHeight: 17 }}>
                Add Supabase credentials in app/.env to enable sign in.
              </Text>
            </View>
          )}

          {mode === "signup" && (
            <FormField
              autoCapitalize="words"
              label="Display name"
              placeholder="Your name"
              value={displayName}
              onChangeText={setDisplayName}
            />
          )}

          <FormField
            autoCapitalize="none"
            keyboardType="email-address"
            label="Email address"
            placeholder="yourname@gmail.com"
            value={email}
            onChangeText={setEmail}
          />

          <PasswordField label="Password" value={password} onChangeText={setPassword} />

          {mode === "signin" && (
            <View style={{ alignItems: "flex-end", marginBottom: 28 }}>
              <Pressable onPress={onForgotPassword ?? (() => Alert.alert("Reset", "Password reset coming soon."))}>
                <Text style={{ color: PRIMARY, fontSize: 13, fontWeight: "500" }}>Forgot Password?</Text>
              </Pressable>
            </View>
          )}

          {mode === "signup" && <View style={{ marginBottom: 28 }} />}

          <Pressable
            disabled={!canSubmit}
            onPress={submit}
            style={({ pressed }) => [{
              alignItems: "center", backgroundColor: canSubmit ? PRIMARY : "#A0B4D8",
              borderRadius: 14, flexDirection: "row", gap: 8, justifyContent: "center",
              minHeight: 50, paddingHorizontal: 24, paddingVertical: 16,
              shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
              shadowOpacity: canSubmit ? 0.2 : 0, shadowRadius: 10, elevation: canSubmit ? 4 : 0,
            }, pressed && canSubmit && { backgroundColor: "#3A5EA8" }]}
          >
            <Ionicons
              name={mode === "signin" ? "log-in-outline" : "person-add-outline"}
              size={18}
              color="#FFFFFF"
            />
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600", letterSpacing: 0.2 }}>
              {busy ? "Please wait…" : cooldown > 0 ? `Wait ${cooldown}s` : mode === "signin" ? "Sign In" : "Create Account"}
            </Text>
          </Pressable>

          <View style={{ alignItems: "center", flexDirection: "row", gap: 12, marginVertical: 24 }}>
            <View style={{ backgroundColor: BORDER, flex: 1, height: 1 }} />
            <Text style={{ color: MUTED, fontSize: 13, fontWeight: "500" }}>Continue with</Text>
            <View style={{ backgroundColor: BORDER, flex: 1, height: 1 }} />
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <SocialButton onPress={handleGoogleAuth} loading={googleBusy} />
          </View>

          <View style={{ alignItems: "center", paddingTop: 20 }}>
            <Text style={{ color: "#989898", fontSize: 15, fontWeight: "500" }}>
              {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
              <Text
                style={{ color: PRIMARY, fontWeight: "700" }}
                onPress={() => setMode(mode === "signin" ? "signup" : "signin")}
              >
                {mode === "signin" ? "Sign Up" : "Sign In"}
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
