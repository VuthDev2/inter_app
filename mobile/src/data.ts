import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

export type LanguageCode = "en" | "ja" | "es" | "fr" | "de" | "zh" | "ko" | "kh";

export const languages: Array<{ code: LanguageCode; label: string }> = [
  { code: "kh", label: "Khmer" },
  { code: "en", label: "English" },
  { code: "ja", label: "Japanese" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "zh", label: "Chinese" },
  { code: "ko", label: "Korean" },
];

export type RecordingTemplateId =
  | "presentation"
  | "meeting"
  | "conference"
  | "lecture"
  | "interview"
  | "podcast"
  | "voice-note";

export type RecordingTemplate = {
  id: RecordingTemplateId;
  title: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  starterPrompt: string;
  sourceAudio: boolean;
  speakerLabels: boolean;
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

export const recordingTemplates: RecordingTemplate[] = [
  {
    id: "presentation",
    title: "Presentation",
    description: "Speeches and presentations",
    icon: "easel-outline",
    starterPrompt: "Capture a polished transcript for a talk, demo, or keynote.",
    sourceAudio: true,
    speakerLabels: false,
  },
  {
    id: "meeting",
    title: "Meeting",
    description: "Team and business meetings",
    icon: "briefcase-outline",
    starterPrompt: "Track decisions, action items, and business discussion.",
    sourceAudio: true,
    speakerLabels: true,
  },
  {
    id: "conference",
    title: "Conference",
    description: "Multi-speaker events",
    icon: "people-outline",
    starterPrompt: "Record a long-form event with multiple speakers.",
    sourceAudio: true,
    speakerLabels: true,
  },
  {
    id: "lecture",
    title: "Lecture",
    description: "Classes and seminars",
    icon: "book-outline",
    starterPrompt: "Capture course material, examples, and study notes.",
    sourceAudio: true,
    speakerLabels: false,
  },
  {
    id: "interview",
    title: "Interview",
    description: "One-on-one conversations",
    icon: "person-add-outline",
    starterPrompt: "Separate questions, answers, and follow-up points.",
    sourceAudio: true,
    speakerLabels: true,
  },
  {
    id: "podcast",
    title: "Podcast",
    description: "Long-form recordings",
    icon: "mic-circle-outline",
    starterPrompt: "Prepare a clean transcript for show notes and editing.",
    sourceAudio: true,
    speakerLabels: true,
  },
  {
    id: "voice-note",
    title: "Voice Note",
    description: "Quick personal notes",
    icon: "document-text-outline",
    starterPrompt: "Save a quick idea, reminder, or personal note.",
    sourceAudio: false,
    speakerLabels: false,
  },
];

export const recentSessions = [
  { title: "English to Japanese standup", type: "Live", time: "Today, 09:40", minutes: 8 },
  { title: "Lecture interpretation draft", type: "Speech", time: "Yesterday", minutes: 42 },
  { title: "Conference Q&A", type: "Speech", time: "Monday", minutes: 26 },
];
