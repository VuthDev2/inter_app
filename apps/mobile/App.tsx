import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Alert, Animated, Easing, Image, PanResponder, Pressable, Text, useColorScheme, View } from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { atoms } from "./src/theme/atoms";
import { AuthProvider, useAuth } from "./src/features/auth/auth";
import { AuthScreen } from "./src/screens/AuthScreen";
import { CreateAccountScreen } from "./src/screens/CreateAccountScreen";
import { ForgotPasswordScreen } from "./src/screens/ForgotPasswordScreen";
import { OTPScreen } from "./src/screens/OTPScreen";
import { PreferencesProvider, usePreferences } from "./src/features/preferences/context";
import { I18nProvider, useTranslation } from "./src/i18n/I18nContext";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { HistoryScreen, type HistoryKind } from "./src/screens/HistoryScreen";
import { LiveScreen } from "./src/screens/LiveScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { PrivacySecurityScreen } from "./src/screens/PrivacySecurityScreen";
import { RecordScreen } from "./src/screens/RecordScreen";
import { ResetPasswordScreen } from "./src/screens/ResetPasswordScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { UpdatePasswordScreen } from "./src/screens/UpdatePasswordScreen";
import { UpdateEmailScreen } from "./src/screens/UpdateEmailScreen";
import { AnchoredMenu } from "./src/components/AnchoredMenu";
import { colors, spacing } from "./src/theme/theme";

export type Tab = "home" | "live" | "record" | "history" | "settings" | "profile";

const TABS: Array<{
  key: Tab;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: "live",     labelKey: "nav.live",     icon: "pulse-outline" },
  { key: "record",   labelKey: "nav.record",   icon: "mic-outline" },
  { key: "history",  labelKey: "nav.history",  icon: "time-outline" },
  { key: "settings", labelKey: "nav.settings", icon: "settings-outline" },
];

// Straight cross-fade: the outgoing page fades out, then the incoming one
// fades in. Cross-fading rather than sliding keeps tabs feeling like siblings
// instead of a hierarchy.
//
// Deliberately no scale. A scale reads differently on every page, because it
// pushes content away from the container's centre — the Live screen is
// centred so it grows in place, while a scrolling page's content sits up
// under the header and appears to leap upward. Same transform, two different
// motions. Opacity alone has no anchor point, so every tab enters identically.
const PAGE_FADE_OUT_MS = 120;
const PAGE_FADE_IN_MS = 300;

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
          <I18nProvider>
            <NavigationContainer>
              <AppFrame />
            </NavigationContainer>
          </I18nProvider>
        </PreferencesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppFrame() {
  const { t } = useTranslation();
  const { initialized, user } = useAuth();
  const { appearance_mode: appearanceMode } = usePreferences();
  const systemScheme = useColorScheme();
  const dark = appearanceMode === "dark" || (appearanceMode === "system" && systemScheme === "dark");
  const shell = dark
    ? { background: "#0E1013", border: "#383D45", surface: "#25292F", text: "#F5F7FA", muted: "#A4ABB5", indicator: "#163A62" }
    : { background: colors.background, border: "#E3E6EB", surface: "#FFFFFF", text: "#111318", muted: "#5F6670", indicator: "#EAF3FF" };
  const [activeTab, setActiveTab] = useState<Tab>("live");
  const [historyInitialKind, setHistoryInitialKind] = useState<HistoryKind>("conversations");
  // The tab bar follows `activeTab` immediately so a tap feels instant, while
  // the content keeps showing `renderedTab` until the outgoing page has faded.
  const [renderedTab, setRenderedTab] = useState<Tab>("live");
  const [reduceMotion, setReduceMotion] = useState(false);
  const contentTransition = useRef(new Animated.Value(1)).current;
  const [recordSessionActive, setRecordSessionActive] = useState(false);
  const [recordBackRequest, setRecordBackRequest] = useState(0);
  const [accountScreen, setAccountScreen] = useState<"privacy" | "email" | "password" | null>(null);
  const [tabBarWidth, setTabBarWidth] = useState(0);
  const previousUserId = useRef<string | null>(null);
  const pageScrollY = useRef(new Animated.Value(0)).current;
  const tabIndicatorPosition = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const userId = user?.id ?? null;

    if (userId && userId !== previousUserId.current) {
      setActiveTab("live");
      setAccountScreen(null);
    }

    previousUserId.current = userId;
  }, [user?.id]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    pageScrollY.setValue(0);
  }, [renderedTab, pageScrollY]);

  // Fade the outgoing page out, then hand over to the incoming one. Swapping
  // only once the screen is blank means the two pages are never visible at the
  // same time, so nothing appears to jump between layouts.
  useEffect(() => {
    if (activeTab === renderedTab) return;

    Animated.timing(contentTransition, {
      duration: reduceMotion ? 0 : PAGE_FADE_OUT_MS,
      easing: Easing.in(Easing.quad),
      toValue: 0,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setRenderedTab(activeTab);
    });
  }, [activeTab, contentTransition, reduceMotion, renderedTab]);

  useEffect(() => {
    Animated.timing(contentTransition, {
      duration: reduceMotion ? 0 : PAGE_FADE_IN_MS,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [contentTransition, reduceMotion, renderedTab]);

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
        if (TABS[index].key === "history") setHistoryInitialKind("conversations");
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

  if (accountScreen === "email") {
    return <UpdateEmailScreen onDone={() => setAccountScreen("privacy")} />;
  }

  if (accountScreen === "password") {
    return <UpdatePasswordScreen onDone={() => setAccountScreen("privacy")} />;
  }

  if (accountScreen === "privacy") {
    return (
      <PrivacySecurityScreen
        onBack={() => setAccountScreen(null)}
        onChangeEmail={() => setAccountScreen("email")}
        onChangePassword={() => setAccountScreen("password")}
      />
    );
  }

  // pill height + gap above bottom + safe-area
  const TAB_HEIGHT = 68;
  const tabBarBottom = Math.max(6, insets.bottom - 10);
  const pageHeaderHeight = insets.top + 64;
  const pageEnterStyle = { opacity: contentTransition };
  const headerButtonStyle = ({ pressed }: { pressed: boolean }) => ({
    alignItems: "center" as const,
    backgroundColor: pressed ? (dark ? "#333942" : "#E5E8ED") : shell.surface,
    borderColor: shell.border,
    borderRadius: 999,
    borderWidth: 0.5,
    height: 40,
    justifyContent: "center" as const,
    shadowColor: dark ? "#000000" : "#202838",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    width: 40,
  });

  return (
    <View style={[atoms.flex1, { backgroundColor: shell.background }]}>
      <StatusBar style={dark ? "light" : "dark"} />

      {/* ── Header ── */}
      {renderedTab !== "live" ? (
        <Animated.View
          pointerEvents="box-none"
          style={{
            left: 0,
            // Two independent fades: the scroll-away header, and the page
            // transition. Multiplying lets whichever is lower win.
            opacity: Animated.multiply(
              pageScrollY.interpolate({ inputRange: [0, 38, 66], outputRange: [1, 0.45, 0], extrapolate: "clamp" }),
              contentTransition,
            ),
            position: "absolute",
            right: 0,
            top: 0,
            transform: [{ translateY: pageScrollY.interpolate({ inputRange: [0, 66], outputRange: [0, -pageHeaderHeight], extrapolate: "clamp" }) }],
            zIndex: 20,
          }}
        >
          <SafeAreaView edges={["top"]} style={{ backgroundColor: "transparent" }}>
            <View style={{ alignItems: renderedTab === "history" ? "flex-start" : "center", height: 64, justifyContent: "center", paddingHorizontal: spacing.lg }}>
              <Text style={{ color: shell.text, fontSize: renderedTab === "history" ? 30 : 20, fontWeight: "700", letterSpacing: renderedTab === "history" ? -0.6 : -0.35, marginLeft: renderedTab === "history" ? 8 : 0, textAlign: renderedTab === "history" ? "left" : "center" }}>
                {renderedTab === "record" ? t("nav.record") : renderedTab === "history" ? t("nav.history") : renderedTab === "settings" ? t("nav.settings") : renderedTab === "profile" ? t("profile.title") : t("nav.live")}
              </Text>
              {renderedTab === "record" && recordSessionActive ? (
                <Pressable
                  accessibilityLabel={t("record.backToCategories")}
                  accessibilityRole="button"
                  onPress={() => setRecordBackRequest((request) => request + 1)}
                  style={(state) => [headerButtonStyle(state), { left: spacing.lg, position: "absolute" }]}
                >
                  <Ionicons name="chevron-back" size={22} color={shell.text} />
                </Pressable>
              ) : null}
              {renderedTab === "record" ? (
                <View style={{ position: "absolute", right: spacing.lg }}>
                  <AnchoredMenu
                    items={[
                      { key: "history", label: t("record.recordingHistory"), icon: "time-outline", onPress: () => setActiveTab("history") },
                      { key: "help", label: t("record.howToRecord"), icon: "help-circle-outline", onPress: () => Alert.alert(t("record.howToRecord"), t("record.howToRecordMessage")) },
                    ]}
                  >
                    {(open) => (
                      <Pressable
                        accessibilityLabel={t("record.actions")}
                        accessibilityRole="button"
                        onPress={open}
                        style={headerButtonStyle}
                      >
                        <Ionicons name="ellipsis-horizontal" size={21} color={dark ? "#E4E8EE" : "#303640"} />
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
      <Animated.View
        style={[
          { flex: 1, paddingBottom: TAB_HEIGHT + tabBarBottom },
          pageEnterStyle,
          renderedTab !== "live" && { display: "none" },
        ]}
      >
        {/* `activeTab`, not `renderedTab`: the microphone should stop the
            instant another tab is tapped, not after the fade finishes. */}
        <LiveScreen active={activeTab === "live"} />
      </Animated.View>
      {renderedTab !== "live" ? <Animated.ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: TAB_HEIGHT + tabBarBottom + spacing.lg, paddingTop: pageHeaderHeight + spacing.sm }}
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: pageScrollY } } }], { useNativeDriver: true })}
        scrollEnabled={renderedTab !== "record" || !recordSessionActive}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={pageEnterStyle}
      >
        {renderedTab === "home"     && <DashboardScreen setActiveTab={setActiveTab} />}
        {renderedTab === "record"   && <RecordScreen setActiveTab={(tab) => { setHistoryInitialKind("recordings"); setActiveTab(tab); }} onSessionChange={setRecordSessionActive} backRequest={recordBackRequest} />}
        {renderedTab === "history"  && <HistoryScreen initialKind={historyInitialKind} />}
        {renderedTab === "settings" && <SettingsScreen setActiveTab={setActiveTab} onPrivacySecurity={() => setAccountScreen("privacy")} />}
        {renderedTab === "profile"  && <ProfileScreen />}
      </Animated.ScrollView> : null}

      {/* ── Floating pill tab bar ── */}
      <View style={{ left: 14, position: "absolute", right: 14, bottom: tabBarBottom }} pointerEvents="box-none">
        <View {...tabPanResponder.panHandlers} onLayout={(event) => setTabBarWidth(event.nativeEvent.layout.width)} style={{ alignItems: "center", backgroundColor: shell.surface, borderColor: shell.border, borderRadius: 28, borderWidth: 1, elevation: 0, flexDirection: "row", height: 72, justifyContent: "space-around", paddingHorizontal: 6, shadowOpacity: 0 }}>
          {tabBarWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={{
                backgroundColor: shell.indicator,
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
                accessibilityLabel={t(tab.labelKey)}
                onPress={() => {
                  if (tab.key === "history") setHistoryInitialKind("conversations");
                  setActiveTab(tab.key);
                }}
                style={{ alignItems: "center", backgroundColor: "transparent", borderRadius: 20, flex: 1, gap: 3, justifyContent: "center", marginHorizontal: 2, minHeight: 56, paddingHorizontal: 2, paddingVertical: 6 }}
              >
                <Ionicons
                  name={tab.icon}
                  size={24}
                  color={active ? "#007AFF" : shell.muted}
                />
                <Text adjustsFontSizeToFit minimumFontScale={0.68} numberOfLines={1} style={[{ color: shell.muted, fontSize: 10, fontWeight: "500", letterSpacing: -0.1, maxWidth: "100%", textAlign: "center" }, active && { color: "#007AFF", fontWeight: "700" }]}>
                  {t(tab.labelKey)}
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
      id="Unauthenticated"
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
