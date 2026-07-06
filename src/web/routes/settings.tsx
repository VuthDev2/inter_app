import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme-provider";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Bell,
  Moon,
  Globe,
  Shield,
  Trash2,
  LogOut,
  ChevronRight,
  Volume2,
  Vibrate,
  Eye,
} from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Kotoba" },
      { name: "description", content: "Manage your app preferences, notifications, and account settings." },
    ],
  }),
  component: () => (
    <AppShell>
      <SettingsPage />
    </AppShell>
  ),
});

type ToggleRowProps = {
  id: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
};

function ToggleRow({ id, icon, iconColor, iconBg, label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </span>
        <div>
          <div className="text-sm font-medium">{label}</div>
          {description && (
            <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
          )}
        </div>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        style={{
          background: checked ? "oklch(0.78 0.16 200)" : "oklch(0.28 0.03 255)",
          boxShadow: checked ? "0 0 12px oklch(0.78 0.16 200 / 40%)" : "none",
        }}
      >
        <span
          className="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200"
          style={{ transform: checked ? "translateX(20px)" : "translateX(0px)" }}
        />
      </button>
    </div>
  );
}

type LinkRowProps = {
  id: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  label: string;
  description?: string;
  badge?: string;
  onClick: () => void;
  destructive?: boolean;
};

function LinkRow({ id, icon, iconColor, iconBg, label, description, badge, onClick, destructive }: LinkRowProps) {
  return (
    <button
      id={id}
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 py-3.5 transition-opacity hover:opacity-80 active:opacity-60"
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </span>
        <div className="text-left">
          <div
            className="text-sm font-medium"
            style={{ color: destructive ? "oklch(0.65 0.22 25)" : undefined }}
          >
            {label}
          </div>
          {description && (
            <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ background: "oklch(0.78 0.16 200 / 15%)", color: "oklch(0.78 0.16 200)" }}>
            {badge}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        background: "white, color-mix(in oklab, oklch(0.21 0.025 255) 82%, transparent)",
        backdropFilter: "blur(14px)",
        border: "1px solid oklch(0.3 0.02 255 / 60%)",
      }}
    >
      <div className="px-5 pt-4 pb-1">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </h2>
      </div>
      <div className="divide-y px-5" style={{ borderColor: "oklch(0.3 0.02 255 / 40%)" }}>
        {children}
      </div>
    </div>
  );
}

function SettingsPage() {
  const { signOut } = useAuth();
  const router = useRouter();

  // Notification preferences
  const [sessionAlerts, setSessionAlerts] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibration, setVibration] = useState(false);

  // Appearance
  const { theme, setTheme } = useTheme();
  const darkMode = theme === "dark";
  const [compactView, setCompactView] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.navigate({ to: "/auth" });
  };

  const handleDeleteAccount = () => {
    toast.error("Account deletion requires confirmation via email.", {
      description: "A link will be sent to your inbox.",
    });
  };

  const handlePrivacy = () => {
    toast.info("Privacy policy opens in a new tab.");
  };

  const handleLanguageRegion = () => {
    router.navigate({ to: "/profile" });
  };

  return (
    <div className="mx-auto max-w-lg space-y-3">
      {/* Page header */}
      <div className="pb-2">
        <h1 className="font-display text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your preferences and account.
        </p>
      </div>

      {/* Notifications */}
      <SectionCard title="Notifications">
        <ToggleRow
          id="toggle-session-alerts"
          icon={<Bell className="h-4 w-4" />}
          iconColor="oklch(0.78 0.16 200)"
          iconBg="oklch(0.78 0.16 200 / 12%)"
          label="Session alerts"
          description="Get notified when someone joins your session"
          checked={sessionAlerts}
          onChange={setSessionAlerts}
        />
        <ToggleRow
          id="toggle-sound"
          icon={<Volume2 className="h-4 w-4" />}
          iconColor="oklch(0.72 0.18 30)"
          iconBg="oklch(0.72 0.18 30 / 12%)"
          label="Sound effects"
          description="Audio cues for key events"
          checked={soundEnabled}
          onChange={setSoundEnabled}
        />
        <ToggleRow
          id="toggle-vibration"
          icon={<Vibrate className="h-4 w-4" />}
          iconColor="oklch(0.75 0.15 280)"
          iconBg="oklch(0.75 0.15 280 / 12%)"
          label="Haptic feedback"
          description="Vibrate on important events"
          checked={vibration}
          onChange={setVibration}
        />
      </SectionCard>

      {/* Appearance */}
      <SectionCard title="Appearance">
        <ToggleRow
          id="toggle-dark-mode"
          icon={<Moon className="h-4 w-4" />}
          iconColor="oklch(0.75 0.12 260)"
          iconBg="oklch(0.75 0.12 260 / 12%)"
          label="Dark mode"
          description="Always-on dark interface"
          checked={darkMode}
          onChange={(v) => {
            setTheme(v ? "dark" : "light");
            toast.info(v ? "Dark mode enabled" : "Light mode enabled");
          }}
        />
        <ToggleRow
          id="toggle-compact"
          icon={<Eye className="h-4 w-4" />}
          iconColor="oklch(0.72 0.14 170)"
          iconBg="oklch(0.72 0.14 170 / 12%)"
          label="Compact view"
          description="Denser layout for session transcripts"
          checked={compactView}
          onChange={setCompactView}
        />
      </SectionCard>

      {/* Language & Region */}
      <SectionCard title="Language & Region">
        <LinkRow
          id="settings-language"
          icon={<Globe className="h-4 w-4" />}
          iconColor="oklch(0.78 0.16 200)"
          iconBg="oklch(0.78 0.16 200 / 12%)"
          label="Language & preferences"
          description="Set your display name and default language"
          onClick={handleLanguageRegion}
        />
      </SectionCard>

      {/* Account */}
      <SectionCard title="Account">
        <LinkRow
          id="settings-privacy"
          icon={<Shield className="h-4 w-4" />}
          iconColor="oklch(0.72 0.18 30)"
          iconBg="oklch(0.72 0.18 30 / 12%)"
          label="Privacy policy"
          description="How we handle your data"
          onClick={handlePrivacy}
        />
        <LinkRow
          id="settings-sign-out"
          icon={<LogOut className="h-4 w-4" />}
          iconColor="oklch(0.68 0.02 255)"
          iconBg="oklch(0.28 0.03 255)"
          label="Sign out"
          description="Sign out of your account"
          onClick={handleSignOut}
        />
        <LinkRow
          id="settings-delete-account"
          icon={<Trash2 className="h-4 w-4" />}
          iconColor="oklch(0.65 0.22 25)"
          iconBg="oklch(0.65 0.22 25 / 12%)"
          label="Delete account"
          description="Permanently remove your data"
          onClick={handleDeleteAccount}
          destructive
        />
      </SectionCard>

      {/* App version */}
      <p className="text-center text-xs text-muted-foreground pb-2">
        QuickVoice · v1.0.
      </p>
    </div>
  );
}
