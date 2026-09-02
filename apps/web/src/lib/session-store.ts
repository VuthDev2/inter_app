"use client";

export type WebUtterance = {
  id: string;
  original: string;
  translation: string;
  sourceLang: "en" | "ja";
  targetLang: "en" | "ja";
  createdAt: string;
};

export type WebSession = {
  id: string;
  title: string;
  mode: "one-way" | "two-way" | "recording";
  sourceLang: "en" | "ja";
  targetLang: "en" | "ja";
  folder: string | null;
  utterances: WebUtterance[];
  createdAt: string;
  endedAt: string;
  durationSeconds: number;
  deletedAt: string | null;
};

export type WebFolder = { id: string; name: string; createdAt: string };

const SESSION_KEY = "quickvoice.web.sessions.v1";
const FOLDER_KEY = "quickvoice.web.folders.v1";
// A recording can run for half an hour before anyone presses Save. Until it is
// saved, the whole session lives only in React state, so a reload, a crash or a
// closed tab loses all of it. The live screen writes a draft here as it goes.
const DRAFT_KEY = "quickvoice.web.draft.v1";
const CHANGE_EVENT = "quickvoice-storage-change";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function loadSessions(): WebSession[] {
  return read<WebSession[]>(SESSION_KEY, []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveSession(session: WebSession) {
  const sessions = loadSessions();
  const index = sessions.findIndex((item) => item.id === session.id);
  if (index >= 0) sessions[index] = session;
  else sessions.unshift(session);
  write(SESSION_KEY, sessions.slice(0, 100));
}

export function getSession(id: string | null): WebSession | null {
  return id ? loadSessions().find((session) => session.id === id) ?? null : null;
}

export function softDeleteSessions(ids: string[]) {
  const selected = new Set(ids);
  write(SESSION_KEY, loadSessions().map((session) => selected.has(session.id)
    ? { ...session, deletedAt: new Date().toISOString() }
    : session));
}

export function restoreSession(id: string) {
  write(SESSION_KEY, loadSessions().map((session) => session.id === id ? { ...session, deletedAt: null } : session));
}

export function permanentlyDeleteSessions(ids: string[]) {
  const selected = new Set(ids);
  write(SESSION_KEY, loadSessions().filter((session) => !selected.has(session.id)));
}

export function loadFolders(): WebFolder[] {
  const defaults: WebFolder[] = ["School", "Work", "Personal"].map((name) => ({
    id: name.toLowerCase(), name, createdAt: new Date(0).toISOString(),
  }));
  return read<WebFolder[]>(FOLDER_KEY, defaults);
}

export function addFolder(name: string) {
  const clean = name.trim();
  if (!clean) return;
  const folders = loadFolders();
  if (folders.some((folder) => folder.name.toLowerCase() === clean.toLowerCase())) return;
  write(FOLDER_KEY, [...folders, { id: crypto.randomUUID(), name: clean, createdAt: new Date().toISOString() }]);
}

export function deleteFolder(id: string) {
  const folder = loadFolders().find((item) => item.id === id);
  write(FOLDER_KEY, loadFolders().filter((item) => item.id !== id));
  if (folder) write(SESSION_KEY, loadSessions().map((session) => session.folder === folder.name ? { ...session, folder: null } : session));
}

export function subscribeStorage(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

export type WebDraft = {
  startedAt: number;
  savedAt: string;
  utterances: Array<{ id: string; original: string; translation: string }>;
};

/** Persist the in-progress session so a crash or reload cannot erase it. */
export function saveDraft(draft: WebDraft) {
  write(DRAFT_KEY, draft);
}

/** The unsaved session from a previous visit, if one was interrupted. */
export function loadDraft(): WebDraft | null {
  const draft = read<WebDraft | null>(DRAFT_KEY, null);
  return draft && draft.utterances?.length ? draft : null;
}

export function clearDraft() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(DRAFT_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
