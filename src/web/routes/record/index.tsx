import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RecordTemplatePicker } from "../Record";

export const Route = createFileRoute("/record/")({
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
