import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../features/auth/auth";
import { atoms } from "../theme/atoms";

const PRIMARY = "#4B71C4";
const TEXT = "#161B2E";
const MUTED = "#7B8299";
const BORDER = "#DDE1EF";
const BG = "#FFFFFF";
const INPUT_BG = "#F7F8FB";
const COOLDOWN = 30;

export function AuthScreen({ onForgotPassword }: { onForgotPassword?: () => void }) {
  const { authReady, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

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

  const canSubmit = !busy && authReady && cooldown === 0;

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
          {/* ── Logo ── */}
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <View style={{
              alignItems: "center", backgroundColor: PRIMARY, borderRadius: 24,
              height: 64, justifyContent: "center", marginBottom: 14, width: 64,
              shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
            }}>
              <Image
                source={require("../../assets/logo.png")}
                style={{ height: 36, width: 36 }}
                resizeMode="contain"
              />
            </View>
            <Text style={{ color: TEXT, fontSize: 26, fontWeight: "700", letterSpacing: -0.5 }}>QuickVoice</Text>
            <Text style={{ color: MUTED, fontSize: 14, lineHeight: 20, marginTop: 4, textAlign: "center" }}>
              Real-time AI interpretation
            </Text>
          </View>

          {/* ── Heading ── */}
          <Text style={{ color: TEXT, fontSize: 26, fontWeight: "600", letterSpacing: -0.8, marginBottom: 28 }}>
            {mode === "signin" ? "Welcome back!" : "Create account"}
          </Text>

          {/* ── Auth warning ── */}
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

          {/* ── Display name (sign up only) ── */}
          {mode === "signup" && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: TEXT, fontSize: 13, fontWeight: "600", letterSpacing: 0.2, marginBottom: 7 }}>
                Display name
              </Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={MUTED}
                style={inputStyle}
                value={displayName}
              />
            </View>
          )}

          {/* ── Email ── */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: TEXT, fontSize: 13, fontWeight: "600", letterSpacing: 0.2, marginBottom: 7 }}>
              Email address
            </Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="yourname@gmail.com"
              placeholderTextColor={MUTED}
              style={inputStyle}
              value={email}
            />
          </View>

          {/* ── Password ── */}
          <View style={{ marginBottom: 8 }}>
            <Text style={{ color: TEXT, fontSize: 13, fontWeight: "600", letterSpacing: 0.2, marginBottom: 7 }}>
              Password
            </Text>
            <View style={[inputStyle, atoms.flexRow, atoms.itemsCenter]}>
              <TextInput
                autoCapitalize="none"
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={MUTED}
                secureTextEntry={!showPassword}
                style={{ flex: 1, color: TEXT, fontSize: 15, paddingVertical: 0 }}
                value={password}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={MUTED}
                />
              </Pressable>
            </View>
          </View>

          {/* ── Forgot Password ── */}
          {mode === "signin" && (
            <View style={{ alignItems: "flex-end", marginBottom: 28 }}>
              <Pressable onPress={onForgotPassword ?? (() => Alert.alert("Reset", "Password reset coming soon."))}>
                <Text style={{ color: PRIMARY, fontSize: 13, fontWeight: "500" }}>Forgot Password?</Text>
              </Pressable>
            </View>
          )}

          {mode === "signup" && <View style={{ marginBottom: 28 }} />}

          {/* ── Primary button ── */}
          <Pressable
            disabled={!canSubmit}
            onPress={submit}
            style={({ pressed }) => [{
              alignItems: "center", backgroundColor: canSubmit ? PRIMARY : "#A0B4D8",
              borderRadius: 14, flexDirection: "row", gap: 8, justifyContent: "center",
              minHeight: 54, paddingHorizontal: 24, paddingVertical: 16,
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

          {/* ── Divider ── */}
          <View style={{ alignItems: "center", flexDirection: "row", gap: 12, marginVertical: 24 }}>
            <View style={{ backgroundColor: BORDER, flex: 1, height: 1 }} />
            <Text style={{ color: MUTED, fontSize: 13, fontWeight: "500" }}>Continue with</Text>
            <View style={{ backgroundColor: BORDER, flex: 1, height: 1 }} />
          </View>

          {/* ── Social buttons ── */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={() => Alert.alert("Google sign-in", "OAuth requires a web browser redirect.")}
              style={({ pressed }) => [socialBtn, pressed && { backgroundColor: "#EEE" }]}
            >
              <Ionicons name="logo-google" size={19} color={TEXT} />
              <Text style={{ color: TEXT, fontSize: 14, fontWeight: "600" }}>Google</Text>
            </Pressable>
          </View>

          {/* ── Bottom prompt ── */}
          <View style={{ alignItems: "center", marginTop: "auto", paddingTop: 40 }}>
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle = {
  backgroundColor: INPUT_BG,
  borderColor: BORDER,
  borderRadius: 14,
  borderWidth: 1,
  color: TEXT,
  fontSize: 15,
  minHeight: 50,
  paddingHorizontal: 16,
  paddingVertical: 14,
} as const;

const socialBtn = {
  alignItems: "center" as const,
  backgroundColor: INPUT_BG,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: BORDER,
  flex: 1,
  flexDirection: "row" as const,
  gap: 8,
  justifyContent: "center" as const,
  minHeight: 48,
  paddingHorizontal: 12,
  paddingVertical: 12,
};
