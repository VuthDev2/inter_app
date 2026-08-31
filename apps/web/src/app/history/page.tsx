"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AudioLines, ChevronRight, Folder, FolderPlus, Mic, Trash2, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import AuthGuard from "@/components/AuthGuard";
import { addFolder, deleteFolder, loadFolders, loadSessions, subscribeStorage, type WebFolder, type WebSession } from "@/lib/session-store";

function HistoryContent() {
  const [sessions, setSessions] = useState<WebSession[]>([]);
  const [folders, setFolders] = useState<WebFolder[]>([]);
  const [newFolder, setNewFolder] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  useEffect(() => { const refresh = () => { setSessions(loadSessions()); setFolders(loadFolders()); }; refresh(); return subscribeStorage(refresh); }, []);
  const active = sessions.filter((session) => !session.deletedAt);
  const deleted = sessions.filter((session) => session.deletedAt);
  const createFolder = () => { addFolder(newFolder); setNewFolder(""); setShowNewFolder(false); };

  return <div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--text))] flex flex-col"><Navbar />
    <main className="flex-1 w-full max-w-[800px] mx-auto px-6 py-16">
      <div className="flex items-center justify-between mb-12"><div><h1 className="text-3xl font-semibold">History</h1><p className="text-sm text-[rgba(var(--muted),1)] mt-2">Your saved QuickVoice sessions</p></div><Link href="/interpreter" className="flex items-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-5 py-2.5 text-sm font-semibold"><Mic size={16}/>New Session</Link></div>
      <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] overflow-hidden mb-10">
        <Link href="/allrecords" className="flex items-center justify-between p-5 border-b border-[rgb(var(--border))] hover:bg-[rgba(var(--text),.05)]"><span className="flex items-center gap-3"><AudioLines size={18} className="text-[rgb(var(--primary))]"/>All Recordings</span><span className="flex items-center gap-3 text-[rgba(var(--muted),1)]">{active.length}<ChevronRight size={16}/></span></Link>
        <Link href="/allrecords?filter=deleted" className="flex items-center justify-between p-5 hover:bg-[rgba(var(--text),.05)]"><span className="flex items-center gap-3"><Trash2 size={18} className="text-red-500"/>Recently Deleted</span><span className="flex items-center gap-3 text-[rgba(var(--muted),1)]">{deleted.length}<ChevronRight size={16}/></span></Link>
      </section>
      <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Folders</h2><button onClick={() => setShowNewFolder(true)} className="rounded-full p-2 text-[rgb(var(--primary))] hover:bg-[rgba(var(--text),.06)]" aria-label="New folder"><FolderPlus size={20}/></button></div>
      <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] overflow-hidden">
        {folders.map((folder, index) => <div key={folder.id} className={`flex items-center ${index < folders.length - 1 ? "border-b border-[rgb(var(--border))]" : ""}`}><Link href={`/folder?name=${encodeURIComponent(folder.name)}`} className="flex flex-1 items-center justify-between p-5 hover:bg-[rgba(var(--text),.05)]"><span className="flex items-center gap-3"><Folder size={18} className="text-[rgb(var(--primary))]"/>{folder.name}</span><span className="flex items-center gap-3 text-[rgba(var(--muted),1)]">{active.filter((session) => session.folder === folder.name).length}<ChevronRight size={16}/></span></Link><button onClick={() => deleteFolder(folder.id)} aria-label={`Delete ${folder.name}`} className="mr-4 p-2 text-red-400 hover:text-red-500"><Trash2 size={16}/></button></div>)}
      </section>
    </main>
    {showNewFolder && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5"><div className="relative w-full max-w-md rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-8"><button onClick={() => setShowNewFolder(false)} className="absolute right-5 top-5"><X size={20}/></button><h2 className="text-xl font-semibold mb-5">New Folder</h2><input autoFocus value={newFolder} onChange={(event) => setNewFolder(event.target.value)} onKeyDown={(event) => event.key === "Enter" && newFolder.trim() && createFolder()} placeholder="Folder name" className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-4 py-3 outline-none"/><button disabled={!newFolder.trim()} onClick={createFolder} className="mt-5 w-full rounded-xl bg-[rgb(var(--primary))] py-3 font-semibold disabled:opacity-40">Save</button></div></div>}
  </div>;
}
export default function HistoryPage() { return <AuthGuard><HistoryContent /></AuthGuard>; }
