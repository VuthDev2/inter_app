"use client";

export type WebUtterance = {
  id: string;
  original: string;
  translation: string;
  sourceLang: "en" | "ja";
  targetLang: "en" | "ja";
  createdAt: string;
  nuances?: { text: string; color: string }[];
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

export type WebFolder = { id: string; name: string; createdAt: string; icon?: string };

// Storage is per signed-in account.
//
// These keys used to be global, so everything below was shared by whoever
// happened to use the browser: one person signed out, the next signed in, and
// the new account opened History to find someone else's conversations. The keys
// now carry the account id, which keeps each person's data separate without
// deleting anything -- sign back in and your own history is still there.
let currentUserScope = "anon";

/** Point storage at one account. Call on sign-in, sign-out and session restore. */
export function setStorageUser(userId: string | null | undefined) {
  const next = userId ? `u:${userId}` : "anon";
  if (next === currentUserScope) return;
  currentUserScope = next;
  if (typeof window !== "undefined") {
    // Anything showing storage has to re-read now that the account changed.
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

const scoped = (base: string) => `${base}::${currentUserScope}`;

const SESSION_KEY_BASE = "quickvoice.web.sessions.v1";
const FOLDER_KEY_BASE = "quickvoice.web.folders.v1";
// A recording can run for half an hour before anyone presses Save. Until it is
// saved, the whole session lives only in React state, so a reload, a crash or a
// closed tab loses all of it. The live screen writes a draft here as it goes.
const DRAFT_KEY_BASE = "quickvoice.web.draft.v1";
// One-way or two-way, remembered per account: leaving the screen and coming
// back used to drop you into one-way no matter what you had chosen.
const MODE_KEY_BASE = "quickvoice.web.twoway.v1";
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
  return read<WebSession[]>(scoped(SESSION_KEY_BASE), []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveSession(session: WebSession) {
  const sessions = loadSessions();
  const index = sessions.findIndex((item) => item.id === session.id);
  if (index >= 0) sessions[index] = session;
  else sessions.unshift(session);
  write(scoped(SESSION_KEY_BASE), sessions.slice(0, 100));
}

export function getSession(id: string | null): WebSession | null {
  return id ? loadSessions().find((session) => session.id === id) ?? null : null;
}

export function softDeleteSessions(ids: string[]) {
  const selected = new Set(ids);
  write(scoped(SESSION_KEY_BASE), loadSessions().map((session) => selected.has(session.id)
    ? { ...session, deletedAt: new Date().toISOString() }
    : session));
}

export function restoreSession(id: string) {
  write(scoped(SESSION_KEY_BASE), loadSessions().map((session) => session.id === id ? { ...session, deletedAt: null } : session));
}

export function permanentlyDeleteSessions(ids: string[]) {
  const selected = new Set(ids);
  write(scoped(SESSION_KEY_BASE), loadSessions().filter((session) => !selected.has(session.id)));
}

/**
 * Is this a dictation from the Record screen, rather than a conversation?
 *
 * History keeps the two apart, the way the phone does: a conversation belongs
 * in a dated list you can reopen and carry on, a recording belongs in a folder.
 *
 * The title check is for sessions saved before `mode: "recording"` was written
 * at all -- every session, recorded or interpreted, went in as one-way or
 * two-way, so the name it was filed under is the only evidence left.
 */
export function isRecordingSession(session: WebSession): boolean {
  return session.mode === "recording" || / Recording$/.test(session.title);
}

export type DateGroupLabel = "Today" | "Yesterday" | "Last Week" | "Older";

/** Bucket sessions the way the phone's History does: newest day first, and no
 *  empty headings. */
export function groupByDate(sessions: WebSession[]): { label: DateGroupLabel; items: WebSession[] }[] {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const buckets: Record<DateGroupLabel, WebSession[]> = { Today: [], Yesterday: [], "Last Week": [], Older: [] };

  sessions.forEach((session) => {
    const day = new Date(session.createdAt);
    day.setHours(0, 0, 0, 0);
    const days = Math.floor((midnight.getTime() - day.getTime()) / 86_400_000);
    buckets[days <= 0 ? "Today" : days === 1 ? "Yesterday" : days <= 7 ? "Last Week" : "Older"].push(session);
  });

  return (["Today", "Yesterday", "Last Week", "Older"] as const)
    .map((label) => ({ label, items: buckets[label] }))
    .filter((group) => group.items.length > 0);
}

export function loadFolders(): WebFolder[] {
  const defaults: WebFolder[] = [
    { id: "school", name: "School", icon: "school" },
    { id: "work", name: "Work", icon: "work" },
    { id: "personal", name: "Personal", icon: "personal" },
  ].map((folder) => ({ ...folder, createdAt: new Date(0).toISOString() }));
  return read<WebFolder[]>(scoped(FOLDER_KEY_BASE), defaults);
}

export function addFolder(name: string, icon = "folder") {
  const clean = name.trim();
  if (!clean) return;
  const folders = loadFolders();
  if (folders.some((folder) => folder.name.toLowerCase() === clean.toLowerCase())) return;
  write(scoped(FOLDER_KEY_BASE), [...folders, { id: crypto.randomUUID(), name: clean, icon, createdAt: new Date().toISOString() }]);
}

export function deleteFolder(id: string) {
  const folder = loadFolders().find((item) => item.id === id);
  write(scoped(FOLDER_KEY_BASE), loadFolders().filter((item) => item.id !== id));
  if (folder) write(scoped(SESSION_KEY_BASE), loadSessions().map((session) => session.folder === folder.name ? { ...session, folder: null } : session));
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
  utterances: Array<{
    id: string;
    original: string;
    translation: string;
    // Two-way files each turn under the language it was spoken in. Dropping
    // these on the way to storage meant a recovered draft lost that, and every
    // recovered turn fell back to "originals left, translations right" -- so a
    // Japanese turn reappeared in the English column.
    sourceLang?: string;
    targetLang?: string;
  }>;
};

/** Persist the in-progress session so a crash or reload cannot erase it. */
/** Which screen a draft belongs to. Recording and interpreting are separate
 *  activities, and they shared one key: a conversation left unsaved on the Live
 *  Interpreter was offered back on the Record screen as if you had recorded it,
 *  and either screen's Discard threw away the other's work. */
export type DraftScope = "live" | "record";

const draftKey = (scope: DraftScope) =>
  scoped(scope === "record" ? `${DRAFT_KEY_BASE}.record` : DRAFT_KEY_BASE);

export function saveDraft(draft: WebDraft, scope: DraftScope = "live") {
  write(draftKey(scope), draft);
}

/** The unsaved session from a previous visit, if one was interrupted. */
export function loadDraft(scope: DraftScope = "live"): WebDraft | null {
  const draft = read<WebDraft | null>(draftKey(scope), null);
  return draft && draft.utterances?.length ? draft : null;
}

export function clearDraft(scope: DraftScope = "live") {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(draftKey(scope));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Whether the interpreter was last used as a two-way conversation. */
export function loadTwoWayMode(fallback = true): boolean {
  const stored = read<boolean | null>(scoped(MODE_KEY_BASE), null);
  return typeof stored === "boolean" ? stored : fallback;
}

export function saveTwoWayMode(isTwoWay: boolean) {
  if (typeof window === "undefined") return;
  write(scoped(MODE_KEY_BASE), isTwoWay);
}
