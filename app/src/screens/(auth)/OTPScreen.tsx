import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
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

import { useAuth } from "../../features/auth/auth";

const COOLDOWN = 60;

const PRIMARY = "#4B71C4";
const TEXT = "#161B2E";
const MUTED = "#7B8299";
const BORDER = "#DDE1EF";
const BG = "#FFFFFF";
const INPUT_BG = "#F7F8FB";

export function OTPScreen({
  email,
  onBack,
  onVerified,
}: {
  email: string;
  onBack: () => void;
  onVerified: () => void;
}) {
  const { authReady, verifyOTP, sendOTP } = useAuth();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const handleCodeChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, "");
    if (digit.length > 1) return;

    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const submit = async () => {
    const token = code.join("");
    if (token.length !== 6) {
      Alert.alert("Incomplete code", "Please enter the full 6-digit code.");
      return;
    }
    setBusy(true);
    const result = await verifyOTP(email, token);
    setBusy(false);

    if (result.error) {
      Alert.alert("QuickVoice", result.error);
      return;
    }
    onVerified();
  };

  const resend = async () => {
    setResending(true);
    const result = await sendOTP(email);
    setResending(false);

    if (result.error) {
      if (result.error.toLowerCase().includes("rate limit")) {
        Alert.alert("Too many requests", "Please wait a moment before requesting another code.");
        setResendCooldown(COOLDOWN);
      } else {
        Alert.alert("QuickVoice", result.error);
      }
      return;
    }
    setCode(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
    Alert.alert("Code sent", "A new code has been sent to your email.");
    setResendCooldown(COOLDOWN);
  };

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
                source={require("../../../assets/logo.png")}
                style={{ height: 36, width: 36 }}
                resizeMode="contain"
              />
            </View>
            <Text style={{ color: TEXT, fontSize: 26, fontWeight: "700", letterSpacing: -0.5 }}>QuickVoice</Text>
          </View>

          {/* ── Heading ── */}
          <Text style={{ color: TEXT, fontSize: 28, fontWeight: "800", letterSpacing: -0.8, marginBottom: 8 }}>
            Check your email
          </Text>
          <Text style={{ color: MUTED, fontSize: 14, lineHeight: 21, marginBottom: 28 }}>
            We sent a 6-digit code to{" "}
            <Text style={{ color: TEXT, fontWeight: "600" }}>{email}</Text>
          </Text>

          {/* ── OTP input boxes ── */}
          <View style={{ flexDirection: "row", gap: 10, justifyContent: "center", marginBottom: 28 }}>
            {code.map((digit, i) => (
              <TextInput
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                autoFocus={i === 0}
                keyboardType="number-pad"
                maxLength={1}
                onChangeText={(t) => handleCodeChange(t, i)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                selectTextOnFocus
                style={{
                  backgroundColor: INPUT_BG, borderColor: BORDER, borderRadius: 14,
                  borderWidth: 1, color: TEXT, fontSize: 24, fontWeight: "700",
                  height: 60, textAlign: "center", width: 48,
                }}
                value={digit}
              />
            ))}
          </View>

          {/* ── Verify button ── */}
          <Pressable
            disabled={busy || !authReady}
            onPress={submit}
            style={({ pressed }) => [{
              alignItems: "center", backgroundColor: busy || !authReady ? "#A0B4D8" : PRIMARY,
              borderRadius: 14, flexDirection: "row", gap: 8, justifyContent: "center",
              minHeight: 54, paddingHorizontal: 24, paddingVertical: 16,
              shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
              shadowOpacity: busy || !authReady ? 0 : 0.2, shadowRadius: 10,
              elevation: busy || !authReady ? 0 : 4,
            }, pressed && !busy && authReady && { backgroundColor: "#3A5EA8" }]}
          >
            <Ionicons name="checkmark-outline" size={20} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600", letterSpacing: 0.2 }}>
              {busy ? "Verifying…" : "Verify Code"}
            </Text>
          </Pressable>

          {/* ── Resend ── */}
          <View style={{ alignItems: "center", marginTop: 24 }}>
            <Text style={{ color: MUTED, fontSize: 14 }}>
              Didn't receive the code?{" "}
              <Text
                style={{ color: resendCooldown > 0 ? MUTED : PRIMARY, fontWeight: "700" }}
                onPress={resendCooldown > 0 ? undefined : resend}
              >
                {resending ? "Resending…" : resendCooldown > 0 ? `Wait ${resendCooldown}s` : "Resend"}
              </Text>
            </Text>
          </View>

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
