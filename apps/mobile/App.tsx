import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { atoms } from "./src/theme/atoms";
import { AuthProvider, useAuth } from "./src/features/auth/auth";
import { AuthScreen } from "./src/screens/AuthScreen";
import { CreateAccountScreen } from "./src/screens/CreateAccountScreen";
import { ForgotPasswordScreen } from "./src/screens/ForgotPasswordScreen";
import { OTPScreen } from "./src/screens/OTPScreen";
import { PreferencesProvider } from "./src/features/preferences/context";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { LiveScreen } from "./src/screens/LiveScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { RecordScreen } from "./src/screens/RecordScreen";
import { ResetPasswordScreen } from "./src/screens/ResetPasswordScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { UpdatePasswordScreen } from "./src/screens/UpdatePasswordScreen";
import { colors, spacing } from "./src/theme/theme";

export type Tab = "home" | "live" | "record" | "history" | "settings" | "profile";

const TABS: Array<{
  key: Tab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: "live",     label: "Live Interpreter", icon: "pulse-outline" },
  { key: "record",   label: "Record",           icon: "mic-outline" },
  { key: "history",  label: "History",          icon: "time-outline" },
  { key: "settings", label: "Settings",         icon: "settings-outline" },
];

type UnauthenticatedStackParamList = {
  Onboarding: undefined;
  Authentication: undefined;
  CreateAccount: undefined;
  ForgotPassword: undefined;
  OTP: { email: string };
  ResetPassword: undefined;
};

const UnauthenticatedStack = createNativeStackNavigator<UnauthenticatedStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PreferencesProvider>
          <NavigationContainer>
            <AppFrame />
          </NavigationContainer>
        </PreferencesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppFrame() {
  const { initialized, user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [showUpdatePassword, setShowUpdatePassword] = useState(false);
  const previousUserId = useRef<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const userId = user?.id ?? null;

    if (userId && userId !== previousUserId.current) {
      setActiveTab("home");
      setShowUpdatePassword(false);
    }

    previousUserId.current = userId;
  }, [user?.id]);

  if (!initialized) {
    return (
      <SafeAreaView style={[atoms.bgBackground, atoms.flex1, atoms.itemsCenter, atoms.justifyCenter]}>
        <StatusBar style="dark" />
        <Image source={require("./assets/logo.png")} style={{ borderRadius: 14, height: 56, width: 56 }} />
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700", letterSpacing: -0.3, marginTop: spacing.md }}>
          <Text style={{ color: colors.primary }}>Quick</Text>Voice
        </Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return <UnauthenticatedFlow />;
  }

  if (showUpdatePassword) {
    return <UpdatePasswordScreen onDone={() => setShowUpdatePassword(false)} />;
  }

  // pill height + gap above bottom + safe-area
  const TAB_HEIGHT = 68;
  const tabBarBottom = Math.max(6, insets.bottom - 10);

  return (
    <View style={[atoms.flex1, atoms.bgBackground]}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      {activeTab !== "live" ? <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.background }}>
        <View style={{ alignItems: activeTab === "history" ? "flex-start" : "center", height: 64, justifyContent: "center", paddingHorizontal: spacing.lg }}>
          <Text style={{ color: "#111318", fontSize: activeTab === "history" ? 30 : 20, fontWeight: "700", letterSpacing: activeTab === "history" ? -0.6 : -0.35, marginLeft: activeTab === "history" ? 8 : 0, textAlign: activeTab === "history" ? "left" : "center" }}>
            {activeTab === "record" ? "Record" : activeTab === "history" ? "History" : activeTab === "settings" ? "Settings" : activeTab === "profile" ? "Profile" : "Home"}
          </Text>
          {activeTab === "record" ? (
            <Pressable
              accessibilityLabel="Record actions"
              accessibilityRole="button"
              onPress={() => Alert.alert("Record", "Choose an action", [
                { text: "View Recording History", onPress: () => setActiveTab("history") },
                { text: "How to Record", onPress: () => Alert.alert("How to Record", "Choose a category, select your languages, then tap the microphone to begin.") },
                { text: "Cancel", style: "cancel" },
              ])}
              style={({ pressed }) => ({ alignItems: "center", backgroundColor: pressed ? "#E5E8ED" : "#FFFFFF", borderRadius: 999, height: 40, justifyContent: "center", position: "absolute", right: spacing.lg, shadowColor: "#202838", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, width: 40 })}
            >
              <Ionicons name="ellipsis-horizontal" size={21} color="#303640" />
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView> : null}

      {/* ── Content ── */}
      {activeTab === "live" ? (
        <View style={{ flex: 1, paddingBottom: TAB_HEIGHT + tabBarBottom }}>
          <LiveScreen />
        </View>
      ) : <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: TAB_HEIGHT + tabBarBottom + spacing.lg }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "home"     && <DashboardScreen setActiveTab={setActiveTab} />}
        {activeTab === "record"   && <RecordScreen setActiveTab={setActiveTab} />}
        {activeTab === "history"  && <HistoryScreen />}
        {activeTab === "settings" && <SettingsScreen setActiveTab={setActiveTab} onUpdatePassword={() => setShowUpdatePassword(true)} />}
        {activeTab === "profile"  && <ProfileScreen />}
      </ScrollView>}

      {/* ── Floating pill tab bar ── */}
      <View style={{ left: 14, position: "absolute", right: 14, bottom: tabBarBottom }} pointerEvents="box-none">
        <View style={{ alignItems: "center", backgroundColor: "rgba(255,255,255,0.98)", borderColor: "rgba(25,35,50,0.06)", borderRadius: 28, borderWidth: 1, elevation: 16, flexDirection: "row", height: 72, justifyContent: "space-around", paddingHorizontal: 6, shadowColor: "#172033", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 22 }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab.label}
                onPress={() => setActiveTab(tab.key)}
                style={{ alignItems: "center", backgroundColor: active ? "#EAF3FF" : "transparent", borderRadius: 20, flex: 1, gap: 3, justifyContent: "center", marginHorizontal: 2, minHeight: 56, paddingHorizontal: 2, paddingVertical: 6 }}
              >
                <Ionicons
                  name={tab.icon}
                  size={24}
                  color={active ? "#007AFF" : "#5F6670"}
                />
                <Text adjustsFontSizeToFit minimumFontScale={0.68} numberOfLines={1} style={[{ color: "#5F6670", fontSize: 10, fontWeight: "500", letterSpacing: -0.1, maxWidth: "100%", textAlign: "center" }, active && { color: "#007AFF", fontWeight: "700" }]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function UnauthenticatedFlow() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => subscription.remove();
  }, []);

  return (
    <UnauthenticatedStack.Navigator
      screenOptions={{
        animation: reduceMotion ? "fade" : "simple_push",
        animationDuration: reduceMotion ? 180 : 360,
        animationMatchesGesture: true,
        contentStyle: { backgroundColor: "#FFFFFF" },
        fullScreenGestureEnabled: !reduceMotion,
        gestureEnabled: true,
        headerShown: false,
      }}
    >
      <UnauthenticatedStack.Screen name="Onboarding" options={{ gestureEnabled: false }}>
        {({ navigation }) => (
          <OnboardingScreen onFinished={() => navigation.navigate("Authentication")} />
        )}
      </UnauthenticatedStack.Screen>
      <UnauthenticatedStack.Screen
        name="Authentication"
        options={{ animation: "fade", animationDuration: 220 }}
      >
        {({ navigation }) => (
          <AuthScreen
            onForgotPassword={() => navigation.navigate("ForgotPassword")}
            onSignUp={() => navigation.navigate("CreateAccount")}
          />
        )}
      </UnauthenticatedStack.Screen>
      <UnauthenticatedStack.Screen name="CreateAccount">
        {({ navigation }) => (
          <CreateAccountScreen onSignIn={() => navigation.goBack()} />
        )}
      </UnauthenticatedStack.Screen>
      <UnauthenticatedStack.Screen name="ForgotPassword">
        {({ navigation }) => (
          <ForgotPasswordScreen
            onBack={() => navigation.goBack()}
            onOtpSent={(email) => navigation.navigate("OTP", { email })}
          />
        )}
      </UnauthenticatedStack.Screen>
      <UnauthenticatedStack.Screen name="OTP">
        {({ navigation, route }) => (
          <OTPScreen
            email={route.params.email}
            onBack={() => navigation.goBack()}
            onVerified={() => navigation.navigate("ResetPassword")}
          />
        )}
      </UnauthenticatedStack.Screen>
      <UnauthenticatedStack.Screen name="ResetPassword">
        {({ navigation }) => (
          <ResetPasswordScreen onDone={() => navigation.popTo("Authentication")} />
        )}
      </UnauthenticatedStack.Screen>
    </UnauthenticatedStack.Navigator>
  );
}
