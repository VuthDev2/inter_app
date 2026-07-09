import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";
import {
  getRecordingTemplate,
  loadSavedRecordingSessions,
  recordingTemplates,
} from "@/lib/recording-templates";
import type { RecordingTemplateId, SavedRecordingSession } from "@/lib/recording-templates";
import { Download, FileText, Headphones, MessageSquare, Radio } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  type: z.string().optional(),
});

export const Route = createFileRoute("/history")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Library - QuickVoice" },
      {
        name: "description",
        content: "Central storage for live sessions, speech sessions, audio, and transcripts.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <LibraryPage />
    </AppShell>
  ),
});

type SessionWithCount = {
  id: string;
  code: string;
  name: string | null;
  source_lang: string;
  target_lang: string;
  status: string;
  created_at: string;
};

type RecordingSessionRow = Tables<"recording_sessions">;

function LibraryPage() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const [sessions, setSessions] = useState<SessionWithCount[]>([]);
  const [recordings, setRecordings] = useState<SavedRecordingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedType = recordingTemplates.some((template) => template.id === search.type)
    ? (search.type as RecordingTemplateId)
    : "all";
  const visibleRecordings =
    selectedType === "all"
      ? recordings
      : recordings.filter((recording) => recording.recordingType === selectedType);

  useEffect(() => {
    const syncRecordings = () => setRecordings(loadSavedRecordingSessions());

    syncRecordings();
    window.addEventListener("quickvoice:recording-sessions-changed", syncRecordings);
    window.addEventListener("storage", syncRecordings);

    return () => {
      window.removeEventListener("quickvoice:recording-sessions-changed", syncRecordings);
      window.removeEventListener("storage", syncRecordings);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setRecordings(loadSavedRecordingSessions());
      setLoading(false);
      return;
    }

    setLoading(true);
    const load = async () => {
      const hosted = await supabase.from("sessions").select("*").eq("host_id", user.id);
      const joined = await supabase
        .from("session_participants")
        .select("session_id, sessions(*)")
        .eq("user_id", user.id);
      const savedRecordings = await supabase
        .from("recording_sessions")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      const map = new Map<string, SessionWithCount>();
      (hosted.data ?? []).forEach((session) => map.set(session.id, session));
      (joined.data ?? []).forEach((row) => {
        const session = row.sessions as SessionWithCount | null;
        if (session) map.set(session.id, session);
      });
      setSessions(
        Array.from(map.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      );
      setRecordings((savedRecordings.data ?? []).map(mapRecordingSession));
      setLoading(false);
    };

    load();
  }, [user]);

  const exportSession = async (session: SessionWithCount) => {
    const { data } = await supabase
      .from("transcripts")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });
    const lines = [
      `# ${session.name ?? `Session ${session.code}`}`,
      `Date: ${new Date(session.created_at).toLocaleString()}`,
      `Languages: ${session.source_lang} -> ${session.target_lang}`,
      "",
      ...(data ?? []).map(
        (transcript) =>
          `[${new Date(transcript.created_at).toLocaleTimeString()}] (${transcript.source_lang}->${transcript.target_lang})\n  ${transcript.original_text}\n  -> ${transcript.translated_text ?? ""}\n`,
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `quickvoice-${session.code}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium text-primary">Central storage</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Library</h1>
        <p className="mt-2 text-muted-foreground">
          Live sessions, speech sessions, audio recordings, and transcripts in one place.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        <LibraryBucket
          icon={<Radio className="h-4 w-4" />}
          label="Live Sessions"
          value={String(sessions.length)}
        />
        <LibraryBucket
          icon={<MessageSquare className="h-4 w-4" />}
          label="Speech Sessions"
          value={String(recordings.length)}
        />
        <LibraryBucket
          icon={<Headphones className="h-4 w-4" />}
          label="Audio Recordings"
          value={String(recordings.filter((recording) => recording.sourceAudio).length)}
        />
        <LibraryBucket
          icon={<FileText className="h-4 w-4" />}
          label="Transcripts"
          value={String(sessions.length + recordings.length)}
        />
      </section>

      <section className="rounded-lg border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Recording Sessions</h2>
            <p className="text-sm text-muted-foreground">
              Saved template recordings can be filtered by recording type.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterLink label="All" value="all" selected={selectedType === "all"} />
            {recordingTemplates.map((template) => (
              <FilterLink
                key={template.id}
                label={template.title}
                value={template.id}
                selected={selectedType === template.id}
              />
            ))}
          </div>
        </div>

        {visibleRecordings.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
            No recording sessions yet.
          </div>
        ) : (
          <div className="mt-4 divide-y">
            {visibleRecordings.map((recording) => {
              const template = getRecordingTemplate(recording.recordingType);

              return (
                <div
                  key={recording.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary">
                      {template?.icon ?? <FileText className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium">{recording.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {template?.title ?? recording.recordingType} ·{" "}
                        {new Date(recording.createdAt).toLocaleString()} · {recording.status}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="font-display text-xl font-semibold">Saved Sessions</h2>
        <p className="text-sm text-muted-foreground">
          Open a live session or export its transcript.
        </p>

        {loading ? (
          <div className="py-8 text-muted-foreground">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
            No saved sessions yet.
          </div>
        ) : (
          <div className="mt-4 divide-y">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <Link to="/session/$id" params={{ id: session.id }} className="min-w-0 flex-1">
                  <div className="font-medium">{session.name ?? `Session ${session.code}`}</div>
                  <div className="text-sm text-muted-foreground">
                    {session.source_lang.toUpperCase()} {"->"} {session.target_lang.toUpperCase()} ·{" "}
                    {new Date(session.created_at).toLocaleString()} · {session.status}
                  </div>
                </Link>
                <Button variant="outline" size="sm" onClick={() => exportSession(session)}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function mapRecordingSession(session: RecordingSessionRow): SavedRecordingSession {
  return {
    id: session.id,
    recordingType: session.recording_type as RecordingTemplateId,
    title: session.title,
    description: session.description ?? "",
    transcript: session.transcript ?? "",
    sourceAudio: session.source_audio,
    status: "saved",
    createdAt: session.created_at,
  };
}

function LibraryBucket({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-secondary">
        {icon}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function FilterLink({
  label,
  value,
  selected,
}: {
  label: string;
  value: RecordingTemplateId | "all";
  selected: boolean;
}) {
  return (
    <Link
      to="/history"
      search={value === "all" ? {} : { type: value }}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background hover:bg-accent"
      }`}
    >
      {label}
    </Link>
  );
}
