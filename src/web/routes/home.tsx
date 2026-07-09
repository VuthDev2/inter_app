import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Activity, BookOpen, Chrome, Clock, Mic, MonitorSmartphone, Radio } from "lucide-react";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Dashboard - QuickVoice" },
      { name: "description", content: "Quick starts, recent work, usage, and connected devices." },
    ],
  }),
  component: () => (
    <AppShell>
      <DashboardPage />
    </AppShell>
  ),
});

const recentSessions = [
  { title: "English to Japanese standup", type: "Live", time: "Today, 09:40", minutes: 8 },
  { title: "Lecture interpretation draft", type: "Speech", time: "Yesterday", minutes: 42 },
  { title: "Conference Q&A", type: "Speech", time: "Monday", minutes: 26 },
];

function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Productivity platform</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Start interpretation quickly, pick up recent sessions, and keep your browser extension connected.
          </p>
        </div>
        <Button asChild>
          <Link to="/live">
            <Radio className="mr-2 h-4 w-4" />
            Start Live
          </Link>
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <QuickStartCard
          icon={<Radio className="h-5 w-5" />}
          title="Live conversation"
          description="Short English to Japanese conversations with microphone input."
          to="/live"
        />
        <QuickStartCard
          icon={<Mic className="h-5 w-5" />}
          title="Long speech"
          description="Presentation, lecture, and conference interpretation with transcripts."
          to="/speech"
        />
        <QuickStartCard
          icon={<Chrome className="h-5 w-5" />}
          title="Chrome extension"
          description="Install or update the extension and check connection health."
          to="/extension"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-lg border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">Recent Sessions</h2>
              <p className="text-sm text-muted-foreground">Live sessions, speech sessions, and transcripts.</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/library">
                <BookOpen className="mr-2 h-4 w-4" />
                Library
              </Link>
            </Button>
          </div>
          <div className="divide-y">
            {recentSessions.map((session) => (
              <div key={session.title} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <div className="font-medium">{session.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {session.type} · {session.time}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {session.minutes}m
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <MetricCard icon={<Activity className="h-5 w-5" />} label="Usage this week" value="76 min" />
          <MetricCard icon={<BookOpen className="h-5 w-5" />} label="Saved transcripts" value="18" />
          <MetricCard icon={<MonitorSmartphone className="h-5 w-5" />} label="Connected devices" value="2 active" />
        </div>
      </section>
    </div>
  );
}

function QuickStartCard({
  icon,
  title,
  description,
  to,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  to: "/live" | "/speech" | "/extension";
}) {
  return (
    <Link to={to} className="rounded-lg border bg-card p-5 transition-colors hover:bg-accent">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
        {icon}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
