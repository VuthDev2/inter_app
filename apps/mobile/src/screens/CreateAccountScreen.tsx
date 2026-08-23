import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import {
  AuthDivider,
  AuthScreenLayout,
  AuthTextField,
  SocialAuthButtons,
  authColors,
} from "../components/auth/AuthPageLayout";
import { PrimaryButton } from "../components/ui";
import { useAuth } from "../features/auth/auth";

const DESCRIPTION = "Two-way chat with real-time voice translation, perfect for dialogues.";
const ENGLISH_TITLE = "Create Account";
const JAPANESE_TITLE = "アカウントを作成";

export function CreateAccountScreen({ onSignIn }: { onSignIn: () => void }) {
  const { authReady, signUp } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [animatedTitle, setAnimatedTitle] = useState(ENGLISH_TITLE);
  const [showTypingCursor, setShowTypingCursor] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const animationStarted = useRef(false);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const isJapanese = /[\u3040-\u30ff\u3400-\u9fff]/.test(animatedTitle);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!showTypingCursor) {
      setCursorVisible(false);
      return;
    }
    setCursorVisible(true);
    const id = setInterval(() => setCursorVisible((current) => !current), 520);
    return () => clearInterval(id);
  }, [showTypingCursor]);

  useEffect(() => {
    if (reduceMotion === null) return;
    if (reduceMotion) {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setAnimatedTitle(ENGLISH_TITLE);
      setShowTypingCursor(false);
      return;
    }
    if (animationStarted.current) return;
    animationStarted.current = true;
    let cancelled = false;
    const wait = (duration: number) => new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, duration);
      timers.current.push(timer);
    });
    const type = async (text: string, duration: number) => {
      const characters = Array.from(text);
      for (let index = 1; index <= characters.length; index += 1) {
        if (cancelled) return;
        setAnimatedTitle(characters.slice(0, index).join(""));
        await wait(duration);
      }
    };
    const remove = async (text: string, duration: number) => {
      const characters = Array.from(text);
      for (let length = characters.length - 1; length >= 0; length -= 1) {
        if (cancelled) return;
        setAnimatedTitle(characters.slice(0, length).join(""));
        await wait(duration);
      }
    };
    const run = async () => {
      await wait(2500);
      setShowTypingCursor(true);
      await remove(ENGLISH_TITLE, 95);
      await type(JAPANESE_TITLE, 140);
      await wait(1100);
      await remove(JAPANESE_TITLE, 110);
      await type(ENGLISH_TITLE, 95);
      setShowTypingCursor(false);
    };
    void run();
    return () => {
      cancelled = true;
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [reduceMotion]);

  const submit = async () => {
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert("Missing details", "Complete all account fields first.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Passwords do not match", "Enter the same password in both fields.");
      return;
    }
    if (!acceptedTerms) {
      Alert.alert("Terms required", "Accept the terms and privacy policy to continue.");
      return;
    }
    if (!authReady) {
      Alert.alert(
        "Authentication unavailable",
        "QuickVoice could not load the Supabase configuration. Restart Expo with the cache cleared.",
      );
      return;
    }

    setBusy(true);
    const result = await signUp(email.trim(), password, username.trim());
    setBusy(false);
    if (result.error) {
      Alert.alert("QuickVoice", result.error);
      return;
    }
    Alert.alert("Account created", "Your QuickVoice account is ready.");
  };

  return (
    <AuthScreenLayout
      description={DESCRIPTION}
      footer={(
        <Pressable accessibilityRole="button" onPress={onSignIn}>
          <Text style={styles.accountText}>
            Already have an account? <Text style={styles.accountLink}>Sign in</Text>
          </Text>
        </Pressable>
      )}
      title={`${animatedTitle}${showTypingCursor && cursorVisible ? "|" : ""}`}
      titleStyle={isJapanese ? styles.japaneseTitle : undefined}
      topSpacing="compact"
    >
      <View style={styles.form}>
        <AuthTextField
          icon="person-outline"
          onChangeText={setUsername}
          placeholder="User name"
          value={username}
        />
        <AuthTextField
          icon="mail-outline"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          value={email}
        />
        <AuthTextField
          icon="lock-closed-outline"
          onChangeText={setPassword}
          onToggleSecure={() => setShowPassword((current) => !current)}
          placeholder="Password"
          secureTextEntry={!showPassword}
          value={password}
        />
        <AuthTextField
          icon="lock-closed-outline"
          onChangeText={setConfirmPassword}
          onToggleSecure={() => setShowConfirmPassword((current) => !current)}
          placeholder="Confirm Password"
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
        />

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acceptedTerms }}
          onPress={() => setAcceptedTerms((current) => !current)}
          style={styles.termsRow}
        >
          <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
            {acceptedTerms ? <Ionicons name="checkmark" color="#FFFFFF" size={12} /> : null}
          </View>
          <Text style={styles.termsText}>I accept the terms and privacy policy</Text>
        </Pressable>

        <PrimaryButton
          authSize
          disabled={busy}
          onPress={submit}
          textStyle={styles.buttonText}
          tone="dark"
        >
          {busy ? "Please wait…" : "Continue"}
        </PrimaryButton>
        <AuthDivider />
        <SocialAuthButtons />
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  accountLink: { color: authColors.blue },
  accountText: {
    color: "#9A9A9A",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  buttonText: { fontFamily: "Poppins_600SemiBold" },
  checkbox: {
    alignItems: "center",
    borderColor: authColors.dark,
    borderRadius: 999,
    borderWidth: 1.5,
    height: 15,
    justifyContent: "center",
    width: 15,
  },
  checkboxChecked: { backgroundColor: authColors.dark },
  form: { gap: 18, marginTop: 24 },
  japaneseTitle: {
    fontFamily: Platform.select({ ios: "Hiragino Sans", android: "sans-serif" }),
    fontWeight: "700",
  },
  termsRow: { alignItems: "center", flexDirection: "row", gap: 10, paddingVertical: 2 },
  termsText: {
    color: "#656565",
    flex: 1,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
  },
});
