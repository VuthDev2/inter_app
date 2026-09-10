"use client";
import { PageShell, PageHeader, PrimaryAction, ScrollArea, SectionHeading, Panel } from "@/components/PageShell";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowLeftRight, Mic, Trash2 } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import { isRecordingSession, loadSessions, softDeleteSessions, subscribeStorage, type WebSession } from "@/lib/session-store";

function FolderContent() {
  const folder = useSearchParams().get("name") || "Unfiled";
  const [sessions, setSessions] = useState<WebSession[]>([]);
  useEffect(() => { const refresh = () => setSessions(loadSessions().filter((item) => !item.deletedAt && isRecordingSession(item) && (folder === "Unfiled" ? !item.folder : item.folder === folder))); refresh(); return subscribeStorage(refresh); }, [folder]);
  return <div className="flex h-full min-h-0 flex-1 flex-col bg-[rgb(var(--bg))] text-[rgb(var(--text))]"><PageShell fill><PageHeader
    backHref="/history?tab=recordings"
    title={folder}
    action={<PrimaryAction href={`/record?folder=${encodeURIComponent(folder)}`}><Mic size={16}/>New Recording</PrimaryAction>}
  /><ScrollArea><div className="space-y-4">{sessions.length === 0 ? <div className="rounded-2xl border border-[rgb(var(--border))] p-12 text-center text-[rgba(var(--muted),1)]">No recordings in this folder.</div> : sessions.map((session) => <div key={session.id} className="flex items-center rounded-2xl bg-[rgb(var(--surface-muted))]"><Link href={`/insiderecord${session.mode === "two-way" ? "-twoway" : ""}?id=${session.id}`} className="flex min-w-0 flex-1 flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="min-w-0 max-w-full"><div className="truncate font-semibold">{session.title}</div><div className="mt-1 text-xs text-[rgba(var(--muted),1)]">{new Date(session.createdAt).toLocaleString()}</div></div><span className="flex items-center gap-3">{session.sourceLang === "ja" ? "🇯🇵" : "🇺🇸"}<ArrowLeftRight size={15}/>{session.targetLang === "ja" ? "🇯🇵" : "🇺🇸"}</span></Link><button onClick={() => softDeleteSessions([session.id])} className="mr-4 p-3 text-red-500" aria-label="Delete"><Trash2 size={18}/></button></div>)}</div></ScrollArea></PageShell></div>;
}
export default function FolderPage() { return <AuthGuard><Suspense fallback={null}><FolderContent/></Suspense></AuthGuard>; }
