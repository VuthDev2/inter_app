"use client";
import CreateCategoryDialog, { CategoryIcon } from "@/components/CreateCategoryDialog";
import { PageShell, PageHeader, PrimaryAction, ScrollArea, SectionHeading, Panel } from "@/components/PageShell";
import SegmentedTabs from "@/components/SegmentedTabs";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { AudioLines, ChevronRight, Clock, FolderPlus, MessageSquare, Mic, Puzzle, Trash2 } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import {
  addFolder,
  deleteFolder,
  groupByDate,
  isRecordingSession,
  loadFolders,
  loadSessions,
  subscribeStorage,
  type WebFolder,
  type WebSession,
} from "@/lib/session-store";

type HistoryKind = "conversations" | "recordings" | "extension";

const LANGUAGE_NAME = { en: "English", ja: "Japanese" } as const;

/**
 * History, laid out the way the phone lays it out.
 *
 * It used to open on folders and two counters, which put the thing people
 * actually come here for -- the conversations they just had -- two clicks away
 * behind "All Recordings". The phone gets this right: conversations are the
 * front page, dated and readable at a glance, and the filing cabinet lives
 * under Voice Records where a recording belongs.
 */
function HistoryContent() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get("tab");
  const kind: HistoryKind = tab === "recordings" || tab === "extension" ? tab : "conversations";
  const setKind = (value: HistoryKind) => router.replace(`/history?tab=${value}`, { scroll: false });
  const [sessions, setSessions] = useState<WebSession[]>([]);
  const [folders, setFolders] = useState<WebFolder[]>([]);
  const [showNewFolder, setShowNewFolder] = useState(false);

  useEffect(() => {
    const refresh = () => { setSessions(loadSessions()); setFolders(loadFolders()); };
    refresh();
    return subscribeStorage(refresh);
  }, []);

  const active = useMemo(() => sessions.filter((session) => !session.deletedAt), [sessions]);
  const deleted = useMemo(() => sessions.filter((session) => session.deletedAt), [sessions]);
  const conversations = useMemo(() => active.filter((session) => !isRecordingSession(session)), [active]);
  const recordings = useMemo(() => active.filter(isRecordingSession), [active]);
  const groups = useMemo(() => groupByDate(conversations), [conversations]);

  // h-full/min-h-0 rather than flex-1 alone: this page is a fixed frame with a
  // list scrolling inside it, so it has to take exactly the height left over
  // and no more. Without min-h-0 a flex child refuses to shrink below its
  // content, which is precisely how the card ended up growing forever.
  return <div className="flex h-full min-h-0 flex-1 flex-col bg-[rgb(var(--bg))] text-[rgb(var(--text))]">
    <PageShell fill>
      <PageHeader
        title="History"
        subtitle="Your saved QuickVoice sessions"
        action={<span className="hidden sm:block"><PrimaryAction href={kind === "recordings" ? "/record" : kind === "extension" ? "/extension" : "/interpreter"}><Mic size={16}/>{kind === "recordings" ? "New Recording" : kind === "extension" ? "Open Extension" : "New Conversation"}</PrimaryAction></span>}
      />

      <SegmentedTabs
        value={kind}
        onChange={setKind}
        tabs={[
          { value: "conversations", label: "Conversations" },
          { value: "recordings", label: "Voice Records" },
          { value: "extension", label: "Extension" },
        ]}
      />

      <ScrollArea>
      {kind === "conversations" && (groups.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={26}/>}
          title="No conversations yet"
          copy="Conversations you save from the Live Interpreter show up here, newest first."
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.label} className="space-y-3">
              <h2 className="ml-1 text-[17px] font-semibold tracking-tight">{group.label}</h2>
              <Panel>
                {group.items.map((session, index) => (
                  <ConversationRow key={session.id} session={session} divider={index < group.items.length - 1}/>
                ))}
              </Panel>
            </section>
          ))}
        </div>
      ))}

      {kind === "recordings" && <>
        <div className="mb-10"><Panel>
          <Link href="/allrecords" className="flex items-center justify-between gap-3 p-5 border-b border-[rgb(var(--border))] hover:bg-[rgba(var(--text),.05)]"><span className="flex min-w-0 items-center gap-3"><AudioLines size={18} className="shrink-0 text-[rgb(var(--primary))]"/>All Recordings</span><span className="flex shrink-0 items-center gap-3 text-[rgba(var(--muted),1)]">{recordings.length}<ChevronRight size={16}/></span></Link>
          <Link href="/allrecords?filter=deleted" className="flex items-center justify-between gap-3 p-5 hover:bg-[rgba(var(--text),.05)]"><span className="flex min-w-0 items-center gap-3"><Trash2 size={18} className="shrink-0 text-red-500"/>Recently Deleted</span><span className="flex shrink-0 items-center gap-3 text-[rgba(var(--muted),1)]">{deleted.length}<ChevronRight size={16}/></span></Link>
        </Panel></div>
        <SectionHeading action={<button onClick={() => setShowNewFolder(true)} className="rounded-full p-2 text-[rgb(var(--primary))] hover:bg-[rgba(var(--text),.06)]" aria-label="New folder"><FolderPlus size={20}/></button>}>Folders</SectionHeading>
        <Panel>
          {folders.map((folder, index) => <div key={folder.id} className={`flex items-center ${index < folders.length - 1 ? "border-b border-[rgb(var(--border))]" : ""}`}><Link href={`/folder?name=${encodeURIComponent(folder.name)}`} className="flex min-w-0 flex-1 items-center justify-between gap-3 p-5 hover:bg-[rgba(var(--text),.05)]"><span className="flex min-w-0 items-center gap-3"><CategoryIcon icon={folder.icon} size={18} className="shrink-0 text-[rgb(var(--primary))]"/><span className="truncate">{folder.name}</span></span><span className="flex shrink-0 items-center gap-3 text-[rgba(var(--muted),1)]">{recordings.filter((session) => session.folder === folder.name).length}<ChevronRight size={16}/></span></Link><button onClick={() => deleteFolder(folder.id)} aria-label={`Delete ${folder.name}`} className="mr-4 shrink-0 p-2 text-red-400 hover:text-red-500"><Trash2 size={16}/></button></div>)}
        </Panel>
      </>}

      {kind === "extension" && (
        <EmptyState
          icon={<Puzzle size={26}/>}
          title="Nothing from the extension yet"
          copy="Extension history is not synced to this website yet. Open the extension to view its saved sessions."
        />
      )}
      </ScrollArea>
    </PageShell>
    <CreateCategoryDialog
      open={showNewFolder}
      title="New Folder"
      onClose={() => setShowNewFolder(false)}
      onCreate={(name, icon) => addFolder(name, icon)}
    />
  </div>;
}

/** One conversation: what was said, what it became, and when. The phone puts
 *  the time top-right and the language pair between the two lines; reading the
 *  same shape on both makes them feel like one product. */
function ConversationRow({ session, divider }: { session: WebSession; divider: boolean }) {
  const latest = session.utterances[session.utterances.length - 1];
  const title = latest?.original.trim() || session.title;
  const preview = latest?.translation.trim() || "Transcript unavailable";
  const href = `/insiderecord${session.mode === "two-way" ? "-twoway" : ""}?id=${session.id}`;

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-4 transition-colors hover:bg-[rgba(var(--text),.05)] sm:gap-4 sm:px-5 ${divider ? "border-b border-[rgb(var(--border))]" : ""}`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--primary))]/15 ring-1 ring-[rgb(var(--primary))]/25 text-[rgb(var(--primary))] sm:size-11">
        <MessageSquare size={18}/>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate text-sm font-semibold sm:text-base">{title}</span>
          <span className="shrink-0 text-[11px] text-[rgba(var(--muted),1)]">
            {new Date(session.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </span>
        </span>
        <span className="mt-1 block text-[11px] font-semibold text-[rgb(var(--primary))]">
          {LANGUAGE_NAME[session.sourceLang]} ↔ {LANGUAGE_NAME[session.targetLang]}
        </span>
        <span className="mt-1 block truncate text-sm text-[rgba(var(--muted),1)]">{preview}</span>
      </span>
      <ChevronRight size={16} className="hidden shrink-0 text-[rgba(var(--muted),1)] sm:block"/>
    </Link>
  );
}

function EmptyState({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-6 py-12 text-center">
      <span className="text-[rgba(var(--muted),1)]">{icon}</span>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="max-w-xs text-sm text-[rgba(var(--muted),1)]">{copy}</p>
      <span className="mt-3 flex items-center gap-2 text-xs text-[rgba(var(--muted),1)]"><Clock size={13}/>Saved sessions are kept on this device</span>
    </div>
  );
}

export default function HistoryPage() { return <AuthGuard><Suspense fallback={null}><HistoryContent /></Suspense></AuthGuard>; }
