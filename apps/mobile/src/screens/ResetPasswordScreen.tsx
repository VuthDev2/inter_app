import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
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

export function ResetPasswordScreen({ onDone }: { onDone: () => void }) {
  const { authReady, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!password) {
      Alert.alert("Missing password", "Enter a new password.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Passwords don't match", "Make sure both passwords match.");
      return;
    }
    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);

    if (result.error) {
      Alert.alert("QuickVoice", result.error);
      return;
    }
    Alert.alert("Password updated", "You can now sign in with your new password.", [
      { text: "OK", onPress: onDone },
    ]);
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
            Create new password
          </Text>
          <Text style={{ color: MUTED, fontSize: 14, lineHeight: 21, marginBottom: 28 }}>
            Your code is verified. Choose a new password for your account.
          </Text>

          {/* ── New password ── */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: TEXT, fontSize: 13, fontWeight: "600", letterSpacing: 0.2, marginBottom: 7 }}>
              New password
            </Text>
            <View style={[{
              backgroundColor: INPUT_BG, borderColor: BORDER, borderRadius: 14,
              borderWidth: 1, flexDirection: "row", alignItems: "center",
              minHeight: 50, paddingHorizontal: 16,
            }]}>
              <TextInput
                autoCapitalize="none"
                onChangeText={setPassword}
                placeholder="Enter new password"
                placeholderTextColor={MUTED}
                secureTextEntry={!showPassword}
                style={{ flex: 1, color: TEXT, fontSize: 15, paddingVertical: 14 }}
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

          {/* ── Confirm password ── */}
          <View style={{ marginBottom: 28 }}>
            <Text style={{ color: TEXT, fontSize: 13, fontWeight: "600", letterSpacing: 0.2, marginBottom: 7 }}>
              Confirm password
            </Text>
            <TextInput
              autoCapitalize="none"
              onChangeText={setConfirm}
              placeholder="Re-enter new password"
              placeholderTextColor={MUTED}
              secureTextEntry={!showPassword}
              style={{
                backgroundColor: INPUT_BG, borderColor: BORDER, borderRadius: 14,
                borderWidth: 1, color: TEXT, fontSize: 15, minHeight: 50,
                paddingHorizontal: 16, paddingVertical: 14,
              }}
              value={confirm}
            />
          </View>

          {/* ── Update button ── */}
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
            <Ionicons name="lock-closed-outline" size={18} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600", letterSpacing: 0.2 }}>
              {busy ? "Updating…" : "Update Password"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
