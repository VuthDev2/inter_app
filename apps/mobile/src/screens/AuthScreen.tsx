import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from "@expo-google-fonts/poppins";
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
const ENGLISH_TITLE = "Welcome back";
const JAPANESE_TITLE = "おかえりなさい";
const COOLDOWN = 30;

export function AuthScreen({
  onForgotPassword,
  onSignUp,
}: {
  onForgotPassword?: () => void;
  onSignUp?: () => void;
}) {
  const { authReady, signIn } = useAuth();
  useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
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
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((current) => current - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

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
    if (!email.trim() || !password) {
      Alert.alert("Missing details", "Add your email and password first.");
      return;
    }
    setBusy(true);
    const result = await signIn(email.trim(), password);
    setBusy(false);
    if (result.error) {
      const message = result.error.toLowerCase();
      if (message.includes("rate limit") || message.includes("too many")) {
        Alert.alert("Too many attempts", "Please wait a moment and try again.");
        setCooldown(COOLDOWN);
      } else {
        Alert.alert("QuickVoice", result.error);
      }
    }
  };

  const canSubmit = !busy && authReady && cooldown === 0;

  return (
    <AuthScreenLayout
      description={DESCRIPTION}
      footer={(
        <Pressable accessibilityRole="button" onPress={onSignUp}>
          <Text style={styles.accountText}>
            Don’t have an account? <Text style={styles.link}>Sign up</Text>
          </Text>
        </Pressable>
      )}
      title={`${animatedTitle}${showTypingCursor && cursorVisible ? "|" : ""}`}
      titleStyle={isJapanese ? styles.japaneseTitle : undefined}
    >
      <View style={styles.form}>
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
        <Pressable accessibilityRole="button" onPress={onForgotPassword} style={styles.forgot}>
          <Text style={styles.forgotText}>Forgot Password ?</Text>
        </Pressable>
        <PrimaryButton
          authSize
          disabled={!canSubmit}
          onPress={submit}
          textStyle={styles.buttonText}
          tone="dark"
        >
          {busy ? "Please wait…" : cooldown > 0 ? `Wait ${cooldown}s` : "Continue"}
        </PrimaryButton>
        <AuthDivider />
        <SocialAuthButtons />
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  accountText: {
    color: "#9A9A9A",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  buttonText: { fontFamily: "Poppins_600SemiBold" },
  forgot: { alignSelf: "flex-end", paddingVertical: 2 },
  forgotText: { color: "#454545", fontFamily: "Poppins_600SemiBold", fontSize: 12 },
  form: { gap: 20, marginTop: 36 },
  japaneseTitle: {
    fontFamily: Platform.select({ ios: "Hiragino Sans", android: "sans-serif" }),
    fontWeight: "700",
  },
  link: { color: authColors.blue },
});
