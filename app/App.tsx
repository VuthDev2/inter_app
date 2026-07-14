import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { atoms } from "./src/theme/atoms";
import { AuthProvider, useAuth } from "./src/features/auth/auth";
import { AuthScreen } from "./src/screens/AuthScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { LiveScreen } from "./src/screens/LiveScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { RecordScreen } from "./src/screens/RecordScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { colors, spacing } from "./src/theme/theme";

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
    return <AuthScreen />;
  }

  // pill height + gap above bottom + safe-area
  const TAB_HEIGHT = 68;
  const TAB_GAP    = 12;
  const tabBarBottom = TAB_GAP + insets.bottom;

  return (
    <View style={[atoms.flex1, atoms.bgBackground]}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.surface }}>
        <View style={[atoms.flexRow, atoms.itemsCenter, atoms.justifyBetween, atoms.bgSurface, { borderBottomColor: colors.border, borderBottomWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: 13 }]}>
          <View style={[atoms.flexRow, atoms.itemsCenter, { gap: 8 }]}>
            <Image source={require("./assets/logo.png")} style={{ borderRadius: 6, height: 30, width: 30 }} />
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700", letterSpacing: -0.3 }}>
              <Text style={{ color: colors.primary }}>Quick</Text>Voice
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Profile"
            onPress={() => setActiveTab("profile")}
            style={{ padding: 2 }}
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
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: TAB_HEIGHT + tabBarBottom + spacing.lg }}
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
      <View style={{ left: 16, position: "absolute", right: 16, bottom: tabBarBottom }} pointerEvents="box-none">
        <View style={{ alignItems: "center", backgroundColor: colors.surface, borderRadius: 50, elevation: 16, flexDirection: "row", height: 68, justifyContent: "space-around", paddingHorizontal: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16 }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab.label}
                onPress={() => setActiveTab(tab.key)}
                style={{ alignItems: "center", flex: 1, gap: 3, justifyContent: "center", paddingVertical: 6 }}
              >
                <Ionicons
                  name={tab.icon}
                  size={24}
                  color={active ? colors.primary : colors.tabInactive}
                />
                <Text style={[{ color: colors.tabInactive, fontSize: 11, fontWeight: "500", letterSpacing: 0.1 }, active && { color: colors.primary, fontWeight: "600" }]}>
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
