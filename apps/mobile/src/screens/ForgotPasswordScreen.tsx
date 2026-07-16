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

const PRIMARY = "#4B71C4";
const TEXT = "#161B2E";
const MUTED = "#7B8299";
const BORDER = "#DDE1EF";
const BG = "#FFFFFF";
const INPUT_BG = "#F7F8FB";
const COOLDOWN = 60;

export function ForgotPasswordScreen({ onBack, onOtpSent }: { onBack: () => void; onOtpSent: (email: string) => void }) {
  const { authReady, sendOTP } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const submit = async () => {
    if (!email.trim()) {
      Alert.alert("Missing email", "Enter your email address first.");
      return;
    }
    setBusy(true);
    const result = await sendOTP(email.trim());
    setBusy(false);

    if (result.error) {
      if (result.error.toLowerCase().includes("rate limit")) {
        Alert.alert("Too many requests", "Please wait a moment before requesting another code.");
        setCooldown(COOLDOWN);
      } else {
        Alert.alert("QuickVoice", result.error);
      }
      return;
    }
    onOtpSent(email.trim());
  };

  const canSend = !busy && authReady && cooldown === 0;

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
          {/* ── Back button ── */}
          <Pressable onPress={onBack} style={{ alignSelf: "flex-start", marginBottom: 16, padding: 4 }}>
            <Ionicons name="arrow-back" size={24} color={TEXT} />
          </Pressable>

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
          </View>

          {/* ── Heading ── */}
          <Text style={{ color: TEXT, fontSize: 28, fontWeight: "800", letterSpacing: -0.8, marginBottom: 8 }}>
            Reset password
          </Text>
          <Text style={{ color: MUTED, fontSize: 14, lineHeight: 21, marginBottom: 28 }}>
            Enter your email address and we'll send you a one-time code to reset your password.
          </Text>

          {/* ── Email ── */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: TEXT, fontSize: 13, fontWeight: "600", letterSpacing: 0.2, marginBottom: 7 }}>
              Email address
            </Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={MUTED}
              style={{
                backgroundColor: INPUT_BG, borderColor: BORDER, borderRadius: 14,
                borderWidth: 1, color: TEXT, fontSize: 15, minHeight: 50,
                paddingHorizontal: 16, paddingVertical: 14,
              }}
              value={email}
            />
          </View>

          {/* ── Send code button ── */}
          <Pressable
            disabled={!canSend}
            onPress={submit}
            style={({ pressed }) => [{
              alignItems: "center", backgroundColor: canSend ? PRIMARY : "#A0B4D8",
              borderRadius: 14, flexDirection: "row", gap: 8, justifyContent: "center",
              minHeight: 54, paddingHorizontal: 24, paddingVertical: 16,
              shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
              shadowOpacity: canSend ? 0.2 : 0, shadowRadius: 10,
              elevation: canSend ? 4 : 0,
            }, pressed && canSend && { backgroundColor: "#3A5EA8" }]}
          >
            <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600", letterSpacing: 0.2 }}>
              {busy ? "Sending…" : cooldown > 0 ? `Wait ${cooldown}s` : "Send Code"}
            </Text>
          </Pressable>

          {/* ── Back to sign in ── */}
          <View style={{ alignItems: "center", marginTop: "auto", paddingTop: 40 }}>
            <Text style={{ color: "#989898", fontSize: 15, fontWeight: "500" }}>
              Remember your password?{" "}
              <Text style={{ color: PRIMARY, fontWeight: "700" }} onPress={onBack}>
                Sign In
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
