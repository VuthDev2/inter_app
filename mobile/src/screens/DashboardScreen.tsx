import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Tab } from "../../App";
import { getBackendHealth, type BackendHealth } from "../api";
import { Panel, ScreenHeader, StatusPill, uiStyles } from "../components/ui";
import { loadLiveSessions, loadSavedRecordingSessions, type LiveSession } from "../storage";
import type { SavedRecordingSession } from "../data";
import { colors, radius, spacing } from "../theme";

export function DashboardScreen({ setActiveTab }: { setActiveTab: (tab: Tab) => void }) {
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [recentDynamic, setRecentDynamic] = useState<Array<{ title: string; type: string; time: string; minutes: number }>>([]);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    
    // Fetch backend health
    getBackendHealth()
      .then((r) => mounted && setHealth(r))
      .catch((e) => {
        if (mounted) setHealth({ ok: false, error: e instanceof Error ? e.message : "Could not reach backend" });
      });

    // Fetch unified data for dashboard
    async function loadStats() {
      try {
        const [recs, live] = await Promise.all([
          loadSavedRecordingSessions(),
          loadLiveSessions()
        ]);
        
        if (!mounted) return;
        
        setSavedCount(recs.length + live.length);
        
        const all: Array<{ title: string; type: string; date: Date; minutes: number }> = [
          ...recs.map(r => ({
            title: r.title,
            type: "Speech",
            date: new Date(r.createdAt),
            minutes: Math.max(1, Math.round(r.transcript.length / 200)) // rough estimate
          })),
          ...live.map(l => ({
            title: `Live (${l.sourceLang} → ${l.targetLang})`,
            type: "Live",
            date: new Date(l.createdAt),
            minutes: l.utterances.length
          }))
        ];
        
        all.sort((a, b) => b.date.getTime() - a.date.getTime());
        
        setRecentDynamic(all.slice(0, 3).map(item => ({
          title: item.title,
          type: item.type,
          time: item.date.toLocaleDateString(),
          minutes: item.minutes
        })));
      } catch (err) {
        console.error("Dashboard stats error:", err);
      }
    }
    
    loadStats();

    return () => { mounted = false; };
  }, []);

  return (
    <View style={s.screen}>
      <View style={s.headerRow}>
        <View style={s.headerText}>
          <ScreenHeader
            eyebrow="Productivity platform"
            title="Dashboard"
            body="Start interpretation quickly, pick up recent sessions, and keep your app connected."
          />
        </View>
        <Pressable onPress={() => setActiveTab("live")} style={s.startBtn} accessibilityRole="button">
          <Ionicons name="radio-outline" size={15} color="#fff" />
          <Text style={s.startBtnText}>Start Live</Text>
        </Pressable>
      </View>

      <View style={s.quickGrid}>
        <QuickCard icon="radio-outline"  title="Live conversation" body="Short conversations with microphone input." onPress={() => setActiveTab("live")} />
        <QuickCard icon="mic-outline"    title="Long speech"       body="Lecture and conference interpretation."      onPress={() => setActiveTab("live")} />
      </View>

      <Panel>
        <View style={s.panelHeader}>
          <View>
            <Text style={s.panelTitle}>Recent Sessions</Text>
            <Text style={uiStyles.rowMeta}>Live sessions, speech sessions, and transcripts.</Text>
          </View>
          <Pressable onPress={() => setActiveTab("history")} style={s.libBtn} accessibilityRole="button">
            <Ionicons name="book-outline" size={13} color={colors.text} />
            <Text style={s.libBtnText}>Library</Text>
          </Pressable>
        </View>
        {recentDynamic.length === 0 ? (
          <View style={{ padding: 16, alignItems: "center" }}>
            <Text style={{ color: colors.muted }}>No recent sessions found.</Text>
          </View>
        ) : recentDynamic.map((session, i) => (
          <View key={i} style={s.sessionRow}>
            <View style={s.sessionLeft}>
              <View style={s.sessionIcon}>
                <Ionicons name="document-text-outline" color={colors.primary} size={17} />
              </View>
              <View style={s.sessionCopy}>
                <Text style={s.sessionTitle}>{session.title}</Text>
                <Text style={uiStyles.rowMeta}>{session.type} · {session.time}</Text>
              </View>
            </View>
            <View style={s.sessionTime}>
              <Ionicons name="time-outline" size={13} color={colors.muted} />
              <Text style={s.sessionTimeText}>{session.minutes}m</Text>
            </View>
          </View>
        ))}
      </Panel>

      <View style={s.metricsGrid}>
        <MetricCard icon="analytics-outline"    label="Usage this week"   value={`${savedCount * 12} min`} />
        <MetricCard icon="book-outline"          label="Saved transcripts" value={String(savedCount)}     />
        <MetricCard icon="phone-portrait-outline" label="Connected devices" value="2 active" />
        <View style={[s.metricCard, s.metricCardFull]}>
          <View style={s.metricIconBox}>
            <Ionicons name="server-outline" color={colors.muted} size={18} />
          </View>
          <View style={s.metricText}>
            <Text style={s.metricValue}>Backend</Text>
            <Text style={uiStyles.rowMeta}>{health?.message || health?.error || "Checking connection…"}</Text>
          </View>
          <StatusPill ok={Boolean(health?.ok)} label={health?.ok ? "Online" : "Check"} />
        </View>
      </View>
    </View>
  );
}

function QuickCard({ icon, title, body, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.quickCard, pressed && s.quickCardPressed]} accessibilityRole="button">
      <View style={s.quickIconBox}>
        <Ionicons name={icon} color={colors.primary} size={20} />
      </View>
      <Text style={s.quickTitle}>{title}</Text>
      <Text style={s.quickBody}>{body}</Text>
    </Pressable>
  );
}

function MetricCard({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={s.metricCard}>
      <View style={s.metricIconBox}>
        <Ionicons name={icon} color={colors.muted} size={18} />
      </View>
      <Text style={s.metricValue}>{value}</Text>
      <Text style={uiStyles.rowMeta}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { gap: spacing.lg },
  headerRow: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  headerText: { flex: 1 },
  startBtn: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: 5, marginTop: 8, paddingHorizontal: 12, paddingVertical: 8 },
  startBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  quickGrid: { flexDirection: "row", gap: spacing.md },
  quickCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flex: 1, gap: 8, padding: spacing.lg, shadowColor: colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  quickCardPressed: { backgroundColor: colors.secondary },
  quickIconBox: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 42, justifyContent: "center", width: 42 },
  quickTitle: { color: colors.text, fontSize: 15, fontWeight: "700", letterSpacing: -0.2, lineHeight: 20 },
  quickBody: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  panelHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  panelTitle: { color: colors.text, fontSize: 17, fontWeight: "700", letterSpacing: -0.2 },
  libBtn: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: 4, paddingHorizontal: 10, paddingVertical: 6 },
  libBtnText: { color: colors.text, fontSize: 12, fontWeight: "500" },
  sessionRow: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingVertical: 12 },
  sessionLeft: { alignItems: "center", flex: 1, flexDirection: "row", gap: 10 },
  sessionIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 34, justifyContent: "center", width: 34 },
  sessionCopy: { flex: 1, gap: 2 },
  sessionTitle: { color: colors.text, fontSize: 14, fontWeight: "500" },
  sessionTime: { alignItems: "center", flexDirection: "row", gap: 3 },
  sessionTimeText: { color: colors.muted, fontSize: 12 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  metricCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexBasis: "47%", flexGrow: 1, gap: 6, padding: spacing.md, shadowColor: colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  metricCardFull: { alignItems: "center", flexBasis: "100%", flexDirection: "row", gap: spacing.md },
  metricIconBox: { alignItems: "center", backgroundColor: colors.secondary, borderRadius: radius.md, height: 36, justifyContent: "center", width: 36 },
  metricText: { flex: 1, gap: 2 },
  metricValue: { color: colors.text, fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
});
