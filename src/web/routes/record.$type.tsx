import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  getRecordingTemplate,
  isRecordingTemplateId,
  saveRecordingSession,
} from "@/lib/recording-templates";
import type { RecordingTemplateId } from "@/lib/recording-templates";
import { ArrowLeft, Clock3, FileText, Headphones, Mic, Pause, Save, Square } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/record/$type")({
  head: ({ params }) => {
    const template = getRecordingTemplate(params.type);

    return {
      meta: [
        { title: `${template?.title ?? "Record"} - QuickVoice` },
        {
          name: "description",
          content: template?.description ?? "Template-based recording in QuickVoice.",
        },
      ],
    };
  },
  component: () => (
    <AppShell>
      <RecordingTemplatePage />
    </AppShell>
  ),
});

function RecordingTemplatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { type } = Route.useParams();
  const template = getRecordingTemplate(type);
  const [isRecording, setIsRecording] = useState(false);
  const [sourceAudio, setSourceAudio] = useState(template?.settings.sourceAudio ?? true);
  const [speakerLabels, setSpeakerLabels] = useState(template?.settings.speakerLabels ?? false);

  if (!template || !isRecordingTemplateId(type)) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border bg-card p-6">
        <h1 className="font-display text-2xl font-semibold">Recording template not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose one of the available templates to start a recording session.
        </p>
        <Button className="mt-5" onClick={() => router.navigate({ to: "/Record" })}>
          Back to templates
        </Button>
      </div>
    );
  }

  const saveSession = async () => {
    const now = new Date();
    const transcript = isRecording
      ? "Recording stopped and transcript draft saved."
      : template.starterPrompt;
    const localSession = {
      id: `${template.id}-${now.getTime()}`,
      recordingType: template.id as RecordingTemplateId,
      title: `${template.title} Recording`,
      description: template.description,
      transcript,
      sourceAudio,
      status: "saved",
      createdAt: now.toISOString(),
    } as const;

    if (user) {
      const { error } = await supabase.from("recording_sessions").insert({
        owner_id: user.id,
        recording_type: template.id,
        title: localSession.title,
        description: localSession.description,
        transcript,
        source_audio: sourceAudio,
        template_settings: {
          speakerLabels,
          sourceAudio,
        },
        status: "saved",
      });

      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      saveRecordingSession(localSession);
    }

    setIsRecording(false);
    toast.success(`${template.title} session saved`);
    router.navigate({ to: "/history", search: { type: template.id } });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.navigate({ to: "/Record" })}
            className="mb-4 flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Templates
          </button>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
              {template.icon}
            </span>
            <div>
              <p className="text-sm font-medium text-primary">Recording template</p>
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                {template.title}
              </h1>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{template.starterPrompt}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-2 text-sm">
          <Clock3 className="h-4 w-4 text-primary" />
          <span className="font-medium">{isRecording ? "Recording" : "Ready"}</span>
          <span className="text-muted-foreground">00:00</span>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="overflow-hidden rounded-lg border bg-[#0d1020] text-white shadow-sm">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                {template.title}
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold">Recording Session</h2>
            </div>
            <span className="rounded-full bg-white/8 px-3 py-1.5 text-sm text-white/70">
              {sourceAudio ? "Audio on" : "Audio off"}
            </span>
          </div>

          <div className="min-h-[390px] px-5 py-6">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm font-medium text-white/45">
                {isRecording ? "Listening..." : "Press record when you are ready"}
              </p>
              <p className="mt-5 min-h-[160px] text-2xl leading-relaxed tracking-normal text-white/85">
                {isRecording
                  ? "Your transcript will appear here as the recording is captured."
                  : template.starterPrompt}
              </p>
            </div>

            <div className="mt-8 flex items-center justify-center">
              <Waveform active={isRecording} />
            </div>

            <div className="mt-7 flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={() => setIsRecording((value) => !value)}
                className={`flex h-20 w-20 items-center justify-center rounded-full shadow-2xl transition-all active:scale-95 ${
                  isRecording
                    ? "bg-destructive text-destructive-foreground glow-pulse"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
                aria-label={isRecording ? "Pause recording" : "Start recording"}
              >
                {isRecording ? <Pause className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
              </button>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/10 text-white hover:bg-white/15"
                  onClick={() => setIsRecording(false)}
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white text-[#0d1020]"
                  onClick={saveSession}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border bg-card p-5">
            <h2 className="font-display text-lg font-semibold">Template Settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These settings come from the selected route template.
            </p>
            <div className="mt-5 space-y-4">
              <TemplateSwitch
                icon={<Headphones className="h-5 w-5" />}
                label="Source Audio"
                description="Store audio with the transcript."
                checked={sourceAudio}
                onCheckedChange={setSourceAudio}
              />
              <TemplateSwitch
                icon={<FileText className="h-5 w-5" />}
                label="Speaker Labels"
                description="Prepare transcript sections for multiple speakers."
                checked={speakerLabels}
                onCheckedChange={setSpeakerLabels}
              />
            </div>
          </div>

          <div className="rounded-lg border bg-card p-5">
            <h2 className="font-display text-lg font-semibold">Session Metadata</h2>
            <div className="mt-4 space-y-3 text-sm">
              <MetadataRow label="Route type" value={template.id} />
              <MetadataRow label="Template" value={template.title} />
              <MetadataRow label="Saved with type" value="Yes" />
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function TemplateSwitch({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-background p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
          {icon}
        </div>
        <div>
          <div className="font-medium">{label}</div>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Waveform({ active }: { active: boolean }) {
  const bars = [22, 42, 30, 58, 36, 68, 44, 72, 40, 62, 32, 50, 26, 46, 34, 56, 28, 40];

  return (
    <div className="flex h-20 w-full max-w-xl items-center justify-center gap-1.5 overflow-hidden">
      {bars.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className={`w-1.5 rounded-full bg-white/55 ${active ? "visualizer-bar" : ""}`}
          style={{
            height,
            animationDelay: `${index * 70}ms`,
            opacity: active ? 0.85 : 0.28,
          }}
        />
      ))}
    </div>
  );
}
