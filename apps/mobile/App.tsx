import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Alert, Animated, Image, PanResponder, Pressable, Text, View } from "react-native";
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
import { AnchoredMenu } from "./src/components/AnchoredMenu";
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
  const [activeTab, setActiveTab] = useState<Tab>("live");
  const [recordSessionActive, setRecordSessionActive] = useState(false);
  const [recordBackRequest, setRecordBackRequest] = useState(0);
  const [showUpdatePassword, setShowUpdatePassword] = useState(false);
  const [tabBarWidth, setTabBarWidth] = useState(0);
  const previousUserId = useRef<string | null>(null);
  const pageScrollY = useRef(new Animated.Value(0)).current;
  const tabIndicatorPosition = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const userId = user?.id ?? null;

    if (userId && userId !== previousUserId.current) {
      setActiveTab("live");
      setShowUpdatePassword(false);
    }

    previousUserId.current = userId;
  }, [user?.id]);

  useEffect(() => {
    pageScrollY.setValue(0);
  }, [activeTab, pageScrollY]);

  useEffect(() => {
    const index = activeTab === "home" ? 0 : activeTab === "profile" ? 3 : TABS.findIndex((tab) => tab.key === activeTab);
    if (index < 0) return;
    Animated.spring(tabIndicatorPosition, {
      damping: 21,
      mass: 0.72,
      stiffness: 185,
      toValue: index,
      useNativeDriver: true,
    }).start();
  }, [activeTab, tabIndicatorPosition]);

  const tabPanResponder = useMemo(() => {
    const positionForPageX = (pageX: number) => {
      if (tabBarWidth <= 0) return 0;
      const slotWidth = (tabBarWidth - 12) / TABS.length;
      const localX = pageX - 14;
      return Math.max(0, Math.min(TABS.length - 1, (localX - 6 - slotWidth / 2) / slotWidth));
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_event, gestureState) => {
        tabIndicatorPosition.stopAnimation();
        tabIndicatorPosition.setValue(positionForPageX(gestureState.x0));
      },
      onPanResponderMove: (_event, gestureState) => {
        tabIndicatorPosition.setValue(positionForPageX(gestureState.moveX));
      },
      onPanResponderRelease: (_event, gestureState) => {
        const index = Math.round(positionForPageX(gestureState.moveX || gestureState.x0));
        Animated.spring(tabIndicatorPosition, { damping: 21, mass: 0.72, stiffness: 185, toValue: index, useNativeDriver: true }).start();
        setActiveTab(TABS[index].key);
      },
      onPanResponderTerminate: () => {
        const index = activeTab === "home" ? 0 : activeTab === "profile" ? 3 : Math.max(0, TABS.findIndex((tab) => tab.key === activeTab));
        Animated.spring(tabIndicatorPosition, { damping: 21, mass: 0.72, stiffness: 185, toValue: index, useNativeDriver: true }).start();
      },
    });
  }, [activeTab, tabBarWidth, tabIndicatorPosition]);

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
  const pageHeaderHeight = insets.top + 64;

  return (
    <View style={[atoms.flex1, atoms.bgBackground]}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      {activeTab !== "live" ? (
        <Animated.View
          pointerEvents="box-none"
          style={{
            left: 0,
            opacity: pageScrollY.interpolate({ inputRange: [0, 38, 66], outputRange: [1, 0.45, 0], extrapolate: "clamp" }),
            position: "absolute",
            right: 0,
            top: 0,
            transform: [{ translateY: pageScrollY.interpolate({ inputRange: [0, 66], outputRange: [0, -pageHeaderHeight], extrapolate: "clamp" }) }],
            zIndex: 20,
          }}
        >
          <SafeAreaView edges={["top"]} style={{ backgroundColor: "transparent" }}>
            <View style={{ alignItems: activeTab === "history" ? "flex-start" : "center", height: 64, justifyContent: "center", paddingHorizontal: spacing.lg }}>
              <Text style={{ color: "#111318", fontSize: activeTab === "history" ? 30 : 20, fontWeight: "700", letterSpacing: activeTab === "history" ? -0.6 : -0.35, marginLeft: activeTab === "history" ? 8 : 0, textAlign: activeTab === "history" ? "left" : "center" }}>
                {activeTab === "record" ? (recordSessionActive ? "New Recording" : "Record") : activeTab === "history" ? "History" : activeTab === "settings" ? "Settings" : activeTab === "profile" ? "Profile" : "Home"}
              </Text>
              {activeTab === "record" && recordSessionActive ? (
                <Pressable
                  accessibilityLabel="Back to recording categories"
                  accessibilityRole="button"
                  onPress={() => setRecordBackRequest((request) => request + 1)}
                  style={({ pressed }) => ({ alignItems: "center", backgroundColor: pressed ? "#E5E8ED" : "rgba(255,255,255,0.92)", borderColor: "#D7DBE1", borderRadius: 999, borderWidth: 0.5, height: 40, justifyContent: "center", left: spacing.lg, position: "absolute", shadowColor: "#202838", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, width: 40 })}
                >
                  <Ionicons name="chevron-back" size={22} color="#171A20" />
                </Pressable>
              ) : null}
              {activeTab === "record" ? (
                <View style={{ position: "absolute", right: spacing.lg }}>
                  <AnchoredMenu
                    items={[
                      { key: "history", label: "Recording History", icon: "time-outline", onPress: () => setActiveTab("history") },
                      { key: "help", label: "How to Record", icon: "help-circle-outline", onPress: () => Alert.alert("How to Record", "Choose a category, select your languages, then tap the microphone to begin.") },
                    ]}
                  >
                    {(open) => (
                      <Pressable
                        accessibilityLabel="Record actions"
                        accessibilityRole="button"
                        onPress={open}
                        style={({ pressed }) => ({ alignItems: "center", backgroundColor: pressed ? "#E5E8ED" : "rgba(255,255,255,0.92)", borderColor: "#D7DBE1", borderRadius: 999, borderWidth: 0.5, height: 40, justifyContent: "center", shadowColor: "#202838", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, width: 40 })}
                      >
                        <Ionicons name="ellipsis-horizontal" size={21} color="#303640" />
                      </Pressable>
                    )}
                  </AnchoredMenu>
                </View>
              ) : null}
            </View>
          </SafeAreaView>
        </Animated.View>
      ) : null}

      {/* ── Content ── */}
      <View
        style={[
          { flex: 1, paddingBottom: TAB_HEIGHT + tabBarBottom },
          activeTab !== "live" && { display: "none" },
        ]}
      >
        <LiveScreen active={activeTab === "live"} />
      </View>
      {activeTab !== "live" ? <Animated.ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: TAB_HEIGHT + tabBarBottom + spacing.lg, paddingTop: pageHeaderHeight + spacing.sm }}
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: pageScrollY } } }], { useNativeDriver: true })}
        scrollEnabled={activeTab !== "record" || !recordSessionActive}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "home"     && <DashboardScreen setActiveTab={setActiveTab} />}
        {activeTab === "record"   && <RecordScreen setActiveTab={setActiveTab} onSessionChange={setRecordSessionActive} backRequest={recordBackRequest} />}
        {activeTab === "history"  && <HistoryScreen />}
        {activeTab === "settings" && <SettingsScreen setActiveTab={setActiveTab} onUpdatePassword={() => setShowUpdatePassword(true)} />}
        {activeTab === "profile"  && <ProfileScreen />}
      </Animated.ScrollView> : null}

      {/* ── Floating pill tab bar ── */}
      <View style={{ left: 14, position: "absolute", right: 14, bottom: tabBarBottom }} pointerEvents="box-none">
        <View {...tabPanResponder.panHandlers} onLayout={(event) => setTabBarWidth(event.nativeEvent.layout.width)} style={{ alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E3E6EB", borderRadius: 28, borderWidth: 1, elevation: 0, flexDirection: "row", height: 72, justifyContent: "space-around", paddingHorizontal: 6, shadowOpacity: 0 }}>
          {tabBarWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={{
                backgroundColor: "#EAF3FF",
                borderRadius: 20,
                height: 56,
                left: 8,
                position: "absolute",
                top: 7,
                transform: [{ translateX: Animated.multiply(tabIndicatorPosition, (tabBarWidth - 12) / 4) }],
                width: (tabBarWidth - 12) / 4 - 4,
              }}
            />
          ) : null}
          {TABS.map((tab) => {
            const active = activeTab === tab.key || (activeTab === "home" && tab.key === "live") || (activeTab === "profile" && tab.key === "settings");
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab.label}
                onPress={() => setActiveTab(tab.key)}
                style={{ alignItems: "center", backgroundColor: "transparent", borderRadius: 20, flex: 1, gap: 3, justifyContent: "center", marginHorizontal: 2, minHeight: 56, paddingHorizontal: 2, paddingVertical: 6 }}
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
