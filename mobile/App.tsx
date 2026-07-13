import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "./src/auth";
import { AuthScreen } from "./src/screens/AuthScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { LiveScreen } from "./src/screens/LiveScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { RecordScreen } from "./src/screens/RecordScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { colors, radius, spacing } from "./src/theme";

export type Tab = "home" | "live" | "record" | "history" | "settings" | "profile";

const TABS: Array<{
  key: Tab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: "live",     label: "Live",     icon: "radio-outline"    },
  { key: "record",   label: "Record",   icon: "mic-outline"      },
  { key: "history",  label: "History",  icon: "time-outline"     },
  { key: "settings", label: "Settings", icon: "settings-outline" },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppFrame />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppFrame() {
  const { initialized, user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("live");
  const insets = useSafeAreaInsets();

  if (!initialized) {
    return (
      <SafeAreaView style={styles.splash}>
        <StatusBar style="dark" />
        <Image source={require("./assets/logo.png")} style={styles.splashLogo} />
        <Text style={styles.splashText}>
          <Text style={styles.splashAccent}>Quick</Text>Voice
        </Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  // pill height + gap above bottom + safe-area
  const TAB_HEIGHT = 68;
  const TAB_GAP    = 12;
  const tabBarBottom = TAB_GAP + insets.bottom;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Image source={require("./assets/logo.png")} style={styles.logo} />
            <Text style={styles.brandText}>
              <Text style={styles.brandAccent}>Quick</Text>Voice
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Profile"
            onPress={() => setActiveTab("profile")}
            style={styles.profileBtn}
          >
            <Ionicons
              name="person-circle-outline"
              size={27}
              color={activeTab === "profile" ? colors.primary : colors.muted}
            />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* ── Content ── */}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: TAB_HEIGHT + tabBarBottom + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "home"     && <DashboardScreen setActiveTab={setActiveTab} />}
        {activeTab === "live"     && <LiveScreen />}
        {activeTab === "record"   && <RecordScreen />}
        {activeTab === "history"  && <HistoryScreen />}
        {activeTab === "settings" && <SettingsScreen setActiveTab={setActiveTab} />}
        {activeTab === "profile"  && <ProfileScreen />}
      </ScrollView>

      {/* ── Floating pill tab bar ── */}
      <View style={[styles.tabBarOuter, { bottom: tabBarBottom }]} pointerEvents="box-none">
        <View style={styles.tabBarPill}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab.label}
                onPress={() => setActiveTab(tab.key)}
                style={styles.tabBtn}
              >
                <Ionicons
                  name={tab.icon}
                  size={24}
                  color={active ? colors.primary : colors.tabInactive}
                />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
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

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, flex: 1 },

  splash: { alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center" },
  splashLogo: { borderRadius: radius.lg, height: 56, width: 56 },
  splashText: { color: colors.text, fontSize: 22, fontWeight: "700", letterSpacing: -0.3, marginTop: spacing.md },
  splashAccent: { color: colors.primary },

  headerSafe: { backgroundColor: colors.surface },
  header: { alignItems: "center", backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: 13 },
  brand: { alignItems: "center", flexDirection: "row", gap: 8 },
  logo: { borderRadius: 6, height: 30, width: 30 },
  brandText: { color: colors.text, fontSize: 17, fontWeight: "700", letterSpacing: -0.3 },
  brandAccent: { color: colors.primary },
  profileBtn: { padding: 2 },

  content: { padding: spacing.lg },

  // Floating pill
  tabBarOuter: { left: 16, position: "absolute", right: 16 },
  tabBarPill: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 50,
    elevation: 16,
    flexDirection: "row",
    height: 68,
    justifyContent: "space-around",
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  tabBtn: { alignItems: "center", flex: 1, gap: 3, justifyContent: "center", paddingVertical: 6 },
  tabLabel: { color: colors.tabInactive, fontSize: 11, fontWeight: "500", letterSpacing: 0.1 },
  tabLabelActive: { color: colors.primary, fontWeight: "600" },
});
