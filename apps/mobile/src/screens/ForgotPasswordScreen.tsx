import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  AuthScreenLayout,
  AuthTextField,
  authColors,
} from "../components/auth/AuthPageLayout";
import { PrimaryButton } from "../components/ui";
import { useAuth } from "../features/auth/auth";

const COOLDOWN = 60;

export function ForgotPasswordScreen({
  onBack,
  onOtpSent,
}: {
  onBack: () => void;
  onOtpSent: (email: string) => void;
}) {
  const { authReady, sendOTP } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((current) => current - 1), 1000);
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
        Alert.alert("Too many requests", "Please wait before requesting another code.");
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
    <AuthScreenLayout title={"Forgot\nYour password"} titleVariant="password">
      <View style={styles.formShell}>
        <View style={styles.formTop}>
          <AuthTextField
            icon="mail-outline"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            value={email}
          />
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.backLink}>
            <Text style={styles.backText}>
              Remember your password? <Text style={styles.link}>Back to sign in</Text>
            </Text>
          </Pressable>
        </View>
        <View style={styles.formBottom}>
          <PrimaryButton
            authSize
            disabled={!canSend}
            onPress={submit}
            textStyle={styles.buttonText}
            tone="dark"
          >
            {busy ? "Sending…" : cooldown > 0 ? `Wait ${cooldown}s` : "Continue"}
          </PrimaryButton>
        </View>
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  backLink: { alignSelf: "flex-start", paddingVertical: 2 },
  backText: { color: "#555555", fontFamily: "Poppins_600SemiBold", fontSize: 12 },
  buttonText: { fontFamily: "Poppins_600SemiBold" },
  formShell: { flex: 1, marginTop: 32 },
  formTop: { gap: 12 },
  formBottom: { marginTop: "auto" },
  link: { color: authColors.blue },
  passwordActionSpacing: { marginTop: 18 },
});
