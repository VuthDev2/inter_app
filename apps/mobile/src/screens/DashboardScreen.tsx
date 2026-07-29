import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import type { Tab } from "../../App";
import { getBackendHealth, type BackendHealth } from "../services/api";
import { Panel, ScreenHeader, StatusPill, uiStyles } from "../components/ui";
import { loadLiveSessions, loadSavedRecordingSessions, type LiveSession } from "../services/storage";
import type { SavedRecordingSession } from "../constants/data";
import { atoms } from "../theme/atoms";
import { colors, spacing } from "../theme/theme";

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
    <View style={atoms.gapLg}>
      <View style={[atoms.flexRow, atoms.itemsStart, atoms.gapMd, atoms.justifyBetween]}>
        <View style={atoms.flex1}>
          <ScreenHeader
            eyebrow="Productivity platform"
            title="Dashboard"
            body="Start interpretation quickly, pick up recent sessions, and keep your app connected."
          />
        </View>
        <Pressable onPress={() => setActiveTab("live")} style={[atoms.flexRow, atoms.itemsCenter, atoms.gapXs, { backgroundColor: colors.primary, borderRadius: 8, marginTop: 8, paddingHorizontal: 12, paddingVertical: 8 }]} accessibilityRole="button">
          <Ionicons name="radio-outline" size={15} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Start Live</Text>
        </Pressable>
      </View>

      <View style={[atoms.flexRow, atoms.gapMd]}>
        <QuickCard icon="radio-outline"  title="Live conversation" body="Short conversations with microphone input." onPress={() => setActiveTab("live")} />
        <QuickCard icon="mic-outline"    title="Long speech"       body="Lecture and conference interpretation."      onPress={() => setActiveTab("live")} />
      </View>

      <Panel>
        <View style={[atoms.flexRow, atoms.itemsStart, atoms.justifyBetween]}>
          <View>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700", letterSpacing: -0.2 }}>Recent Sessions</Text>
            <Text style={uiStyles.rowMeta}>Live sessions, speech sessions, and transcripts.</Text>
          </View>
          <Pressable onPress={() => setActiveTab("history")} style={[atoms.flexRow, atoms.itemsCenter, atoms.gapXs, atoms.bgSurface, atoms.border1, { borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }]} accessibilityRole="button">
            <Ionicons name="book-outline" size={13} color={colors.text} />
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: "500" }}>Library</Text>
          </Pressable>
        </View>
        {recentDynamic.length === 0 ? (
          <View style={{ padding: 16, alignItems: "center" }}>
            <Text style={{ color: colors.muted }}>No recent sessions found.</Text>
          </View>
        ) : recentDynamic.map((session, i) => (
          <View key={i} style={[atoms.flexRow, atoms.itemsCenter, atoms.justifyBetween, { borderTopColor: colors.border, borderTopWidth: 1, paddingVertical: 12 }]}>
            <View style={[atoms.flexRow, atoms.itemsCenter, atoms.gapMd, atoms.flex1]}>
              <View style={{ alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 8, height: 34, justifyContent: "center", width: 34 }}>
                <Ionicons name="document-text-outline" color={colors.primary} size={17} />
              </View>
              <View style={[atoms.flex1, { gap: 2 }]}>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: "500" }}>{session.title}</Text>
                <Text style={uiStyles.rowMeta}>{session.type} · {session.time}</Text>
              </View>
            </View>
            <View style={[atoms.flexRow, atoms.itemsCenter, { gap: 3 }]}>
              <Ionicons name="time-outline" size={13} color={colors.muted} />
              <Text style={{ color: colors.muted, fontSize: 12 }}>{session.minutes}m</Text>
            </View>
          </View>
        ))}
      </Panel>

      <View style={[atoms.flexRow, atoms.flexWrap, atoms.gapMd]}>
        <MetricCard icon="analytics-outline"    label="Saved sessions"    value={String(savedCount)} />
        <MetricCard icon="book-outline"          label="Saved transcripts" value={String(savedCount)}     />
        <MetricCard icon="phone-portrait-outline" label="Connected devices" value="This device" />
        <View style={[{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexBasis: "100%", flexGrow: 1, gap: spacing.md, padding: spacing.md, shadowColor: colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }, atoms.flexRow, atoms.itemsCenter]}>
          <View style={{ alignItems: "center", backgroundColor: colors.secondary, borderRadius: 8, height: 36, justifyContent: "center", width: 36 }}>
            <Ionicons name="server-outline" color={colors.muted} size={18} />
          </View>
          <View style={[atoms.flex1, { gap: 2 }]}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700", letterSpacing: -0.3 }}>Backend</Text>
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
    <Pressable onPress={onPress} style={({ pressed }) => [atoms.card, atoms.flex1, { gap: 8 }, pressed && atoms.bgSecondary]} accessibilityRole="button">
      <View style={{ alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 8, height: 42, justifyContent: "center", width: 42 }}>
        <Ionicons name={icon} color={colors.primary} size={20} />
      </View>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700", letterSpacing: -0.2, lineHeight: 20 }}>{title}</Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>{body}</Text>
    </Pressable>
  );
}

function MetricCard({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={[{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexBasis: "47%", flexGrow: 1, gap: 6, padding: spacing.md, shadowColor: colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }]}>
      <View style={{ alignItems: "center", backgroundColor: colors.secondary, borderRadius: 8, height: 36, justifyContent: "center", width: 36 }}>
        <Ionicons name={icon} color={colors.muted} size={18} />
      </View>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700", letterSpacing: -0.3 }}>{value}</Text>
      <Text style={uiStyles.rowMeta}>{label}</Text>
    </View>
  );
}
