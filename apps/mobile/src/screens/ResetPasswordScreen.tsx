import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import {
  AuthScreenLayout,
  AuthTextField,
} from "../components/auth/AuthPageLayout";
import { PrimaryButton } from "../components/ui";
import { useAuth } from "../features/auth/auth";

export function ResetPasswordScreen({ onDone }: { onDone: () => void }) {
  const { authReady, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    if (password !== confirmPassword) {
      Alert.alert("Passwords don’t match", "Make sure both passwords match.");
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
    <AuthScreenLayout title={"Change\nYour password"} titleVariant="password">
      <View style={styles.formShell}>
        <View style={styles.formTop}>
          <AuthTextField
            onChangeText={setPassword}
            onToggleSecure={() => setShowPassword((current) => !current)}
            placeholder="New Password"
            secureTextEntry={!showPassword}
            value={password}
          />
          <AuthTextField
            onChangeText={setConfirmPassword}
            onToggleSecure={() => setShowConfirmPassword((current) => !current)}
            placeholder="Confirm New Password"
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
          />
        </View>
        <View style={styles.formBottom}>
          <PrimaryButton
            authSize
            disabled={busy || !authReady}
            onPress={submit}
            textStyle={styles.buttonText}
            tone="dark"
          >
            {busy ? "Updating…" : "Continue"}
          </PrimaryButton>
        </View>
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  buttonText: { fontFamily: "Poppins_600SemiBold" },
  form: { gap: 22, marginTop: 32 },
  passwordActionSpacing: { marginTop: 18 },
});
