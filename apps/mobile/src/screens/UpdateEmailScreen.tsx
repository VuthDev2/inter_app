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

import { useSwipeBack } from "../hooks/useSwipeBack";

import { PrimaryButton } from "../components/ui";
import { useAuth } from "../features/auth/auth";

const TEXT = "#161B2E";
const MUTED = "#7B8299";
const BORDER = "#DDE1EF";
const INPUT_BG = "#F7F8FB";

function EmailField({
  label,
  onChangeText,
  placeholder,
  value,
}: {
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: TEXT, fontSize: 13, fontWeight: "600", letterSpacing: 0.2, marginBottom: 7 }}>
        {label}
      </Text>
      <View style={{
        alignItems: "center",
        backgroundColor: INPUT_BG,
        borderColor: BORDER,
        borderRadius: 14,
        borderWidth: 1,
        flexDirection: "row",
        minHeight: 50,
        paddingHorizontal: 16,
      }}>
        <Ionicons name="mail-outline" size={20} color={MUTED} style={{ marginRight: 10 }} />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={MUTED}
          style={{ color: TEXT, flex: 1, fontSize: 15, paddingVertical: 14 }}
          value={value}
        />
      </View>
    </View>
  );
}

export function UpdateEmailScreen({ onDone }: { onDone: () => void }) {
  useFonts({ Poppins_800ExtraBold });
  const { width } = useWindowDimensions();
  const { authReady, updateEmail, user } = useAuth();
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const oldAddress = currentEmail.trim().toLowerCase();
    const nextAddress = newEmail.trim().toLowerCase();
    const confirmedAddress = confirmEmail.trim().toLowerCase();

    if (!oldAddress || !nextAddress || !confirmedAddress) {
      Alert.alert("Missing email", "Complete all three email fields.");
      return;
    }
    if (oldAddress !== user?.email?.toLowerCase()) {
      Alert.alert("Email doesn't match", "Enter the email currently connected to this account.");
      return;
    }
    if (nextAddress === oldAddress) {
      Alert.alert("Same email", "Your new email must be different from your current email.");
      return;
    }
    if (nextAddress !== confirmedAddress) {
      Alert.alert("Emails don't match", "Make sure both new email fields match.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(nextAddress)) {
      Alert.alert("Invalid email", "Enter a valid email address.");
      return;
    }

    setBusy(true);
    const result = await updateEmail(nextAddress);
    setBusy(false);

    if (result.error) {
      Alert.alert("QuickVoice", result.error);
      return;
    }

    Alert.alert(
      "Verify your new email",
      "We sent a confirmation link to your new email address. Open it to finish the change.",
      [{ text: "OK", onPress: onDone }],
    );
  };

  const swipeBack = useSwipeBack(onDone);

  return (
    <SafeAreaView style={{ backgroundColor: "#FFFFFF", flex: 1 }} {...swipeBack}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 30, paddingHorizontal: 24, paddingTop: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable accessibilityLabel="Back to Privacy and Security" onPress={onDone} style={{ alignSelf: "flex-start", marginBottom: 24, padding: 4 }}>
            <Ionicons name="arrow-back" size={24} color={TEXT} />
          </Pressable>

          <Text style={{
            color: "#050505",
            fontFamily: "Poppins_800ExtraBold",
            fontSize: width <= 350 ? 42 : 48,
            letterSpacing: width <= 350 ? 0.42 : 0.48,
            lineHeight: width <= 350 ? 52 : 60,
            marginBottom: 8,
          }}>
            {"Update\nYour email"}
          </Text>
          <Text style={{ color: MUTED, fontSize: 14, lineHeight: 21, marginBottom: 28 }}>
            Confirm your current email, then enter the new email you want to use.
          </Text>

          <EmailField label="Current email" onChangeText={setCurrentEmail} placeholder="Enter current email" value={currentEmail} />
          <EmailField label="New email" onChangeText={setNewEmail} placeholder="Enter new email" value={newEmail} />
          <EmailField label="Confirm new email" onChangeText={setConfirmEmail} placeholder="Re-enter new email" value={confirmEmail} />

          <View style={{ marginTop: 18 }}>
            <PrimaryButton authSize disabled={busy || !authReady} onPress={submit} tone="dark">
              {busy ? "Updating…" : "Continue"}
            </PrimaryButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
