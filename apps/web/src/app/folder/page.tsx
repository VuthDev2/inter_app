"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowLeftRight, Mic, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import AuthGuard from "@/components/AuthGuard";
import { loadSessions, softDeleteSessions, subscribeStorage, type WebSession } from "@/lib/session-store";

function FolderContent() {
  const folder = useSearchParams().get("name") || "Unfiled";
  const [sessions, setSessions] = useState<WebSession[]>([]);
  useEffect(() => { const refresh = () => setSessions(loadSessions().filter((item) => !item.deletedAt && (folder === "Unfiled" ? !item.folder : item.folder === folder))); refresh(); return subscribeStorage(refresh); }, [folder]);
  return <div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--text))]"><Navbar/><main className="mx-auto max-w-4xl px-6 py-10"><Link href="/history"><ArrowLeft/></Link><div className="my-10 flex items-center justify-between"><h1 className="text-3xl font-semibold">{folder}</h1><Link href={`/interpreter?folder=${encodeURIComponent(folder)}`} className="flex items-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-5 py-2.5 text-sm font-semibold"><Mic size={16}/>New Session</Link></div><div className="space-y-4">{sessions.length === 0 ? <div className="rounded-2xl border border-[rgb(var(--border))] p-12 text-center text-[rgba(var(--muted),1)]">No recordings in this folder.</div> : sessions.map((session) => <div key={session.id} className="flex items-center rounded-2xl bg-[rgb(var(--surface-muted))]"><Link href={`/insiderecord${session.mode === "two-way" ? "-twoway" : ""}?id=${session.id}`} className="flex flex-1 items-center justify-between p-5"><div><div className="font-semibold">{session.title}</div><div className="mt-1 text-xs text-[rgba(var(--muted),1)]">{new Date(session.createdAt).toLocaleString()}</div></div><span className="flex items-center gap-3">{session.sourceLang === "ja" ? "🇯🇵" : "🇺🇸"}<ArrowLeftRight size={15}/>{session.targetLang === "ja" ? "🇯🇵" : "🇺🇸"}</span></Link><button onClick={() => softDeleteSessions([session.id])} className="mr-4 p-3 text-red-500" aria-label="Delete"><Trash2 size={18}/></button></div>)}</div></main></div>;
}
export default function FolderPage() { return <AuthGuard><Suspense fallback={null}><FolderContent/></Suspense></AuthGuard>; }
