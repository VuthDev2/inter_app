import type { ReactNode } from "react";
import {
  BookOpen,
  BriefcaseBusiness,
  FileText,
  Podcast,
  Presentation,
  UserRoundCheck,
  Users,
} from "lucide-react";

export type RecordingTemplateId =
  "presentation" | "meeting" | "conference" | "lecture" | "interview" | "podcast" | "voice-note";

export type RecordingTemplate = {
  id: RecordingTemplateId;
  title: string;
  description: string;
  icon: ReactNode;
  starterPrompt: string;
  settings: {
    sourceAudio: boolean;
    speakerLabels: boolean;
  };
};

export type SavedRecordingSession = {
  id: string;
  recordingType: RecordingTemplateId;
  title: string;
  description: string;
  transcript: string;
  sourceAudio: boolean;
  status: "saved";
  createdAt: string;
};

const STORAGE_KEY = "quickvoice.recordingSessions";

export const recordingTemplates = [
  {
    id: "presentation",
    title: "Presentation",
    description: "Speeches and presentations",
    icon: <Presentation className="h-5 w-5" />,
    starterPrompt: "Capture a polished transcript for a talk, demo, or keynote.",
    settings: { sourceAudio: true, speakerLabels: false },
  },
  {
    id: "meeting",
    title: "Meeting",
    description: "Team and business meetings",
    icon: <BriefcaseBusiness className="h-5 w-5" />,
    starterPrompt: "Track decisions, action items, and business discussion.",
    settings: { sourceAudio: true, speakerLabels: true },
  },
  {
    id: "conference",
    title: "Conference",
    description: "Multi-speaker events",
    icon: <Users className="h-5 w-5" />,
    starterPrompt: "Record a long-form event with multiple speakers.",
    settings: { sourceAudio: true, speakerLabels: true },
  },
  {
    id: "lecture",
    title: "Lecture",
    description: "Classes and seminars",
    icon: <BookOpen className="h-5 w-5" />,
    starterPrompt: "Capture course material, examples, and study notes.",
    settings: { sourceAudio: true, speakerLabels: false },
  },
  {
    id: "interview",
    title: "Interview",
    description: "One-on-one conversations",
    icon: <UserRoundCheck className="h-5 w-5" />,
    starterPrompt: "Separate questions, answers, and follow-up points.",
    settings: { sourceAudio: true, speakerLabels: true },
  },
  {
    id: "podcast",
    title: "Podcast",
    description: "Long-form recordings",
    icon: <Podcast className="h-5 w-5" />,
    starterPrompt: "Prepare a clean transcript for show notes and editing.",
    settings: { sourceAudio: true, speakerLabels: true },
  },
  {
    id: "voice-note",
    title: "Voice Note",
    description: "Quick personal notes",
    icon: <FileText className="h-5 w-5" />,
    starterPrompt: "Save a quick idea, reminder, or personal note.",
    settings: { sourceAudio: false, speakerLabels: false },
  },
] satisfies RecordingTemplate[];

export function isRecordingTemplateId(value: string): value is RecordingTemplateId {
  return recordingTemplates.some((template) => template.id === value);
}

export function getRecordingTemplate(type: string) {
  return recordingTemplates.find((template) => template.id === type) ?? null;
}

export function loadSavedRecordingSessions(): SavedRecordingSession[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedRecordingSession);
  } catch {
    return [];
  }
}

export function saveRecordingSession(session: SavedRecordingSession) {
  if (typeof window === "undefined") return;

  const sessions = loadSavedRecordingSessions();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([session, ...sessions]));
  window.dispatchEvent(new Event("quickvoice:recording-sessions-changed"));
}

function isSavedRecordingSession(value: unknown): value is SavedRecordingSession {
  if (!value || typeof value !== "object") return false;

  const session = value as Partial<SavedRecordingSession>;
  return (
    typeof session.id === "string" &&
    typeof session.recordingType === "string" &&
    isRecordingTemplateId(session.recordingType) &&
    typeof session.title === "string" &&
    typeof session.createdAt === "string"
  );
}
