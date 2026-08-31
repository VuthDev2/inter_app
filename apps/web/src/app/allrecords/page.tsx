"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowLeftRight, Clock, Mic, RotateCcw, Search, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import AuthGuard from "@/components/AuthGuard";
import { formatDuration, loadSessions, permanentlyDeleteSessions, restoreSession, softDeleteSessions, subscribeStorage, type WebSession } from "@/lib/session-store";

function RecordsContent() {
  const params = useSearchParams();
  const deletedView = params.get("filter") === "deleted";
  const [sessions, setSessions] = useState<WebSession[]>([]);
  const [query, setQuery] = useState("");
  useEffect(() => { const refresh = () => setSessions(loadSessions()); refresh(); return subscribeStorage(refresh); }, []);
  const visible = useMemo(() => sessions.filter((session) => Boolean(session.deletedAt) === deletedView && session.title.toLowerCase().includes(query.toLowerCase())), [sessions, deletedView, query]);
  return <div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--text))]"><Navbar/><main className="mx-auto max-w-4xl px-6 py-10">
    <div className="flex items-center justify-between mb-8"><Link href="/history" aria-label="Back"><ArrowLeft/></Link><h1 className="text-xl font-semibold">{deletedView ? "Recently Deleted" : "Recordings"}</h1><Link href="/interpreter" className="flex items-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-4 py-2.5 text-sm font-semibold"><Mic size={16}/>New Session</Link></div>
    <label className="mb-7 flex items-center gap-3 rounded-full bg-[rgb(var(--surface-muted))] px-5 py-3"><Search size={18} className="text-[rgba(var(--muted),1)]"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search recordings" className="w-full bg-transparent outline-none"/></label>
    <div className="space-y-4">{visible.length === 0 ? <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-12 text-center text-[rgba(var(--muted),1)]">{deletedView ? "Nothing in recently deleted." : "No saved sessions yet."}</div> : visible.map((session) => <div key={session.id} className="flex items-center rounded-2xl border border-transparent bg-[rgb(var(--surface-muted))] hover:border-[rgb(var(--primary))]"><Link href={`/insiderecord${session.mode === "two-way" ? "-twoway" : ""}?id=${session.id}`} className="flex flex-1 items-center justify-between px-6 py-5"><div><div className="font-semibold">{session.title}</div><div className="mt-1 text-xs text-[rgba(var(--muted),1)]">{new Date(session.createdAt).toLocaleString()}{session.folder ? ` · ${session.folder}` : ""}</div></div><div className="flex items-center gap-4"><span>{session.sourceLang === "ja" ? "🇯🇵" : "🇺🇸"}</span><ArrowLeftRight size={15}/><span>{session.targetLang === "ja" ? "🇯🇵" : "🇺🇸"}</span><span className="flex items-center gap-2 text-xs text-[rgba(var(--muted),1)]"><Clock size={15}/>{formatDuration(session.durationSeconds)}</span></div></Link>{deletedView ? <><button onClick={() => restoreSession(session.id)} className="p-3 text-[rgb(var(--primary))]" aria-label="Restore"><RotateCcw size={18}/></button><button onClick={() => permanentlyDeleteSessions([session.id])} className="mr-3 p-3 text-red-500" aria-label="Delete permanently"><Trash2 size={18}/></button></> : <button onClick={() => softDeleteSessions([session.id])} className="mr-4 p-3 text-red-500" aria-label="Move to recently deleted"><Trash2 size={18}/></button>}</div>)}</div>
  </main></div>;
}
export default function AllRecordsPage() { return <AuthGuard><Suspense fallback={null}><RecordsContent/></Suspense></AuthGuard>; }
