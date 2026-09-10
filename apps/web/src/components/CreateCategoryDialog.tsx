"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Briefcase,
  Dumbbell,
  Folder,
  GraduationCap,
  Lightbulb,
  Music,
  User,
  X,
  type LucideIcon,
} from "lucide-react";

/**
 * Creating a category, the way the mobile app does it.
 *
 * Mobile opens a small dialog with a symbol picker beside the name field and
 * Cancel / Add underneath. The web had two different flows instead -- an inline
 * input on Pre-Record and a plain name-only modal on History -- so the same
 * action looked like two unrelated features. This is the one flow, used by both.
 */

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  folder: Folder,
  school: GraduationCap,
  work: Briefcase,
  personal: User,
  study: BookOpen,
  ideas: Lightbulb,
  health: Dumbbell,
  music: Music,
};

const ICON_ORDER: Array<{ key: string; label: string }> = [
  { key: "folder", label: "Folder" },
  { key: "school", label: "School" },
  { key: "work", label: "Work" },
  { key: "personal", label: "Personal" },
  { key: "study", label: "Study" },
  { key: "ideas", label: "Ideas" },
  { key: "health", label: "Health" },
  { key: "music", label: "Music" },
];

/** The symbol a folder was saved with, or the plain folder for older ones. */
export function CategoryIcon({ icon, size = 18, className }: { icon?: string; size?: number; className?: string }) {
  const Icon = (icon && CATEGORY_ICONS[icon]) || Folder;
  return <Icon size={size} className={className} />;
}

export default function CreateCategoryDialog({
  open,
  title = "New Category",
  onClose,
  onCreate,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  onCreate: (name: string, icon: string) => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("folder");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setIcon("folder");
    const focus = window.setTimeout(() => inputRef.current?.focus(), 0);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focus);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const submit = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), icon);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5">
      <button className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-8 shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 text-[rgba(var(--muted),1)] transition-colors hover:text-[rgb(var(--text))]"
        >
          <X size={20} />
        </button>

        <h2 className="mb-6 text-xl font-semibold">{title}</h2>

        <input
          ref={inputRef}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && submit()}
          maxLength={30}
          placeholder="Category name"
          className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-4 py-3 outline-none focus:border-[rgb(var(--primary))]/60"
        />

        <p className="mt-6 mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[rgba(var(--muted),1)]">
          Symbol
        </p>
        <div className="grid grid-cols-4 gap-2">
          {ICON_ORDER.map(({ key, label }) => {
            const Icon = CATEGORY_ICONS[key];
            const selected = icon === key;
            return (
              <button
                key={key}
                onClick={() => setIcon(key)}
                aria-label={label}
                aria-pressed={selected}
                title={label}
                className={`flex h-12 items-center justify-center rounded-xl border transition-colors ${
                  selected
                    ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]"
                    : "border-[rgb(var(--border))] text-[rgba(var(--text-secondary),1)] hover:bg-[rgba(var(--text),0.05)]"
                }`}
              >
                <Icon size={20} />
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-[rgba(var(--text-secondary),1)] transition-colors hover:bg-[rgba(var(--text),0.05)]"
          >
            Cancel
          </button>
          <button
            disabled={!name.trim()}
            onClick={submit}
            className="rounded-xl bg-[rgb(var(--primary))] px-5 py-2.5 text-sm font-semibold text-[rgb(var(--text))] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
