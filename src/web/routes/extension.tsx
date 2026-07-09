import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { BadgeCheck, BookOpen, Chrome, Download, RefreshCw, Wifi } from "lucide-react";

export const Route = createFileRoute("/extension")({
  head: () => ({
    meta: [
      { title: "Extension - QuickVoice" },
      { name: "description", content: "Install, connect, update, and document the QuickVoice Chrome extension." },
    ],
  }),
  component: () => (
    <AppShell>
      <ExtensionPage />
    </AppShell>
  ),
});

function ExtensionPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Browser productivity</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Extension</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Install the Chrome extension, verify connection status, check updates, and open documentation.
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Install Chrome Extension
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Panel
          icon={<Wifi className="h-5 w-5" />}
          title="Connection Status"
          description="Extension bridge is ready to pair with this workspace."
          action="Check Connection"
        />
        <Panel
          icon={<RefreshCw className="h-5 w-5" />}
          title="Update Extension"
          description="Keep browser capture and translation helpers on the latest version."
          action="Check for Updates"
        />
        <Panel
          icon={<BookOpen className="h-5 w-5" />}
          title="Documentation"
          description="Setup steps, permissions, troubleshooting, and release notes."
          action="Open Docs"
        />
        <Panel
          icon={<Chrome className="h-5 w-5" />}
          title="Chrome Extension"
          description="Use QuickVoice alongside web calls, documents, and browser workflows."
          action="Manage Extension"
        />
      </section>
    </div>
  );
}

function Panel({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</div>
        <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">
          <BadgeCheck className="h-3.5 w-3.5" />
          Ready
        </div>
      </div>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <Button className="mt-5" variant="outline">
        {action}
      </Button>
    </div>
  );
}
