import { Ionicons } from "@expo/vector-icons";
import { Poppins_800ExtraBold, useFonts } from "@expo-google-fonts/poppins";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/ui";
import { useAuth } from "../features/auth/auth";

const PRIMARY = "#4B71C4";
const TEXT = "#161B2E";
const MUTED = "#7B8299";
const BORDER = "#DDE1EF";
const BG = "#FFFFFF";
const INPUT_BG = "#F7F8FB";

export function UpdatePasswordScreen({ onDone }: { onDone: () => void }) {
  useFonts({ Poppins_800ExtraBold });
  const { width } = useWindowDimensions();
  const { authReady, user, signIn, updatePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!currentPassword) {
      Alert.alert("Missing password", "Enter your current password.");
      return;
    }
    if (!newPassword) {
      Alert.alert("Missing password", "Enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords don't match", "Make sure both passwords match.");
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert("Same password", "New password must be different from current.");
      return;
    }
    setBusy(true);

    // Re-authenticate before updating password
    const reAuth = await signIn(user?.email ?? "", currentPassword);
    if (reAuth.error) {
      setBusy(false);
      Alert.alert("QuickVoice", "Current password is incorrect.");
      return;
    }

    const result = await updatePassword(newPassword);
    setBusy(false);

    if (result.error) {
      Alert.alert("QuickVoice", result.error);
      return;
    }
    Alert.alert("Password updated", "Your password has been changed successfully.", [
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
          {/* ── Back button ── */}
          <Pressable onPress={onDone} style={{ alignSelf: "flex-start", marginBottom: 24, padding: 4 }}>
            <Ionicons name="arrow-back" size={24} color={TEXT} />
          </Pressable>

          {/* ── Heading ── */}
          <Text style={{
            color: "#050505",
            fontFamily: "Poppins_800ExtraBold",
            fontSize: width <= 350 ? 42 : 48,
            letterSpacing: width <= 350 ? 0.42 : 0.48,
            lineHeight: width <= 350 ? 52 : 60,
            marginBottom: 8,
          }}>
            {"Update\nYour password"}
          </Text>
          <Text style={{ color: MUTED, fontSize: 14, lineHeight: 21, marginBottom: 28 }}>
            Enter your current password and a new one.
          </Text>

          {/* ── Current password ── */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: TEXT, fontSize: 13, fontWeight: "600", letterSpacing: 0.2, marginBottom: 7 }}>
              Current password
            </Text>
            <View style={[{
              backgroundColor: INPUT_BG, borderColor: BORDER, borderRadius: 14,
              borderWidth: 1, flexDirection: "row", alignItems: "center",
              minHeight: 50, paddingHorizontal: 16,
            }]}>
              <Ionicons name="lock-closed-outline" size={20} color={MUTED} style={{ marginRight: 10 }} />
              <TextInput
                autoCapitalize="none"
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor={MUTED}
                secureTextEntry={!showCurrent}
                style={{ flex: 1, color: TEXT, fontSize: 15, paddingVertical: 14 }}
                value={currentPassword}
              />
              <Pressable onPress={() => setShowCurrent((v) => !v)} hitSlop={8}>
                <Ionicons
                  name={showCurrent ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={MUTED}
                />
              </Pressable>
            </View>
          </View>

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
              <Ionicons name="lock-closed-outline" size={20} color={MUTED} style={{ marginRight: 10 }} />
              <TextInput
                autoCapitalize="none"
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor={MUTED}
                secureTextEntry={!showNew}
                style={{ flex: 1, color: TEXT, fontSize: 15, paddingVertical: 14 }}
                value={newPassword}
              />
              <Pressable onPress={() => setShowNew((v) => !v)} hitSlop={8}>
                <Ionicons
                  name={showNew ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={MUTED}
                />
              </Pressable>
            </View>
          </View>

          {/* ── Confirm new password ── */}
          <View style={{ marginBottom: 28 }}>
            <Text style={{ color: TEXT, fontSize: 13, fontWeight: "600", letterSpacing: 0.2, marginBottom: 7 }}>
              Confirm new password
            </Text>
            <View style={{
              alignItems: "center", backgroundColor: INPUT_BG, borderColor: BORDER,
              borderRadius: 14, borderWidth: 1, flexDirection: "row", minHeight: 50,
              paddingHorizontal: 16,
            }}>
              <Ionicons name="lock-closed-outline" size={20} color={MUTED} style={{ marginRight: 10 }} />
              <TextInput
                autoCapitalize="none"
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                placeholderTextColor={MUTED}
                secureTextEntry={!showNew}
                style={{ color: TEXT, flex: 1, fontSize: 15, paddingVertical: 14 }}
                value={confirmPassword}
              />
              <Pressable onPress={() => setShowNew((v) => !v)} hitSlop={8}>
                <Ionicons
                  name={showNew ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={MUTED}
                />
              </Pressable>
            </View>
          </View>

          {/* ── Update button ── */}
          <View style={{ marginTop: 18 }}>
            <PrimaryButton
              authSize
              disabled={busy || !authReady}
              onPress={submit}
              tone="dark"
            >
              {busy ? "Updating…" : "Continue"}
            </PrimaryButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
