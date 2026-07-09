import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { recordingTemplates } from "@/lib/recording-templates";
import { ArrowRight, Mic } from "lucide-react";

export const Route = createFileRoute("/Record")({
  head: () => ({
    meta: [
      { title: "Record - QuickVoice" },
      {
        name: "description",
        content: "Choose a recording template for presentations, meetings, lectures, and more.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <RecordTemplatePicker />
    </AppShell>
  ),
});

export function RecordTemplatePicker() {
  const router = useRouter();

  const startTemplate = (type: string) => {
    router.navigate({ to: "/record/$type", params: { type } });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Recording templates</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Record</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Start with a template so each session can keep the right title, metadata, transcript
            behavior, and future recording settings.
          </p>
        </div>
        <Button onClick={() => startTemplate(recordingTemplates[0].id)}>
          <Mic className="mr-2 h-4 w-4" />
          Start Recording
        </Button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recordingTemplates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => startTemplate(template.id)}
            className="group flex min-h-40 flex-col justify-between rounded-lg border bg-card p-5 text-left transition-all hover:border-primary/50 hover:bg-accent"
          >
            <span>
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                {template.icon}
              </span>
              <span className="mt-4 block font-display text-xl font-semibold">
                {template.title}
              </span>
              <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
                {template.description}
              </span>
            </span>
            <span className="mt-5 flex items-center text-sm font-medium text-primary">
              Use template
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </button>
        ))}
      </section>
    </div>
  );
}
