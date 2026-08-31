"use client";

import Navbar from "@/components/Navbar";
import { Folder, Plus, Mic, ChevronRight } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";
import { useState } from "react";
import { useEffect } from "react";
import { addFolder, loadFolders, loadSessions, subscribeStorage, type WebFolder, type WebSession } from "@/lib/session-store";

function PreRecordContent() {
    const [categories, setCategories] = useState<WebFolder[]>([]);
    const [recent, setRecent] = useState<WebSession[]>([]);
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState("");
    useEffect(() => {
        const refresh = () => {
            setCategories(loadFolders());
            setRecent(loadSessions().filter((item) => !item.deletedAt).slice(0, 3));
        };
        refresh();
        return subscribeStorage(refresh);
    }, []);
    const createCategory = () => {
        addFolder(newName);
        setNewName("");
        setAdding(false);
    };

    return (
        <div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--text))] flex flex-col font-sans">
            <Navbar />
            
            <div className="flex-1 flex flex-col items-center px-6 pt-16 pb-24">
                <div className="w-full max-w-[800px] flex items-center justify-between mb-12">
                    <h1 className="text-3xl font-semibold tracking-wide text-[rgba(var(--text),0.9)]">
                        Pre-Record
                    </h1>
                    <Link href="/interpreter" className="flex items-center gap-2 bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-pressed))] px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-colors shadow-lg shadow-[rgba(var(--primary),0.2)] text-[rgb(var(--text))]">
                        <Mic size={16} /> Record
                    </Link>
                </div>

                <div className="w-full max-w-[800px] flex flex-col gap-10">
                    
                    {/* Categories Section */}
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3">
                            <h2 className="text-lg font-semibold text-[rgba(var(--text),0.9)] tracking-wide">
                                Categories
                            </h2>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setAdding((value) => !value)} aria-label="Add category" className="w-9 h-9 flex items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] hover:bg-[rgba(var(--text),0.1)] transition-colors text-[rgba(var(--text),0.8)]">
                                    <Plus size={16} />
                                </button>
                                {adding && <div className="flex gap-2"><input autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && createCategory()} placeholder="Category name" className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm outline-none"/><button disabled={!newName.trim()} onClick={createCategory} className="rounded-xl bg-[rgb(var(--primary))] px-3 text-sm disabled:opacity-40">Add</button></div>}
                            </div>
                        </div>

                        {/* Folders List */}
                        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl flex flex-col mt-2 overflow-hidden">
                            {categories.length === 0 ? (
                                <div className="p-8 text-center text-[rgba(var(--muted),1)] text-[14px]">
                                    No categories yet. Add one above!
                                </div>
                            ) : (
                                categories.map((cat, index) => (
                                    <FolderItem 
                                        key={cat.id} 
                                        name={cat.name} 
                                        count={loadSessions().filter((item) => !item.deletedAt && item.folder === cat.name).length}
                                        href={`/folder?name=${encodeURIComponent(cat.name)}`}
                                        isLast={index === categories.length - 1} 
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Recently Section */}
                    <div className="flex flex-col gap-4">
                        <h2 className="text-lg font-semibold text-[rgba(var(--text),0.9)] tracking-wide">
                            Recently
                        </h2>
                        
                        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl flex flex-col items-center justify-center py-12">
                            {recent.length === 0 ? <span className="text-[14px] font-medium text-[rgba(var(--muted),1)]">No recent recordings.</span> : recent.map((item) => <Link className="w-full px-6 py-3 text-sm hover:bg-[rgba(var(--text),0.05)]" key={item.id} href={`/insiderecord?id=${item.id}`}>{item.title} · {new Date(item.createdAt).toLocaleString()}</Link>)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FolderItem({ name, count, href = "#", isLast = false }: { name: string; count: number; href?: string; isLast?: boolean }) {
    return (
        <Link 
            href={href} 
            className={`flex items-center justify-between p-5 hover:bg-[rgba(var(--text),0.05)] transition-colors group ${
                !isLast ? 'border-b border-[rgb(var(--border))]' : ''
            }`}
        >
            <div className="flex items-center gap-4">
                <Folder size={18} className="text-[rgb(var(--primary))]" />
                <span className="text-[14px] font-medium text-[rgba(var(--text),0.9)]">{name}</span>
            </div>
            
            <div className="flex items-center gap-3 text-[rgba(var(--muted),1)] group-hover:text-[rgba(var(--text-secondary),1)] transition-colors">
                <span className="text-[14px] font-medium">{count}</span>
                <ChevronRight size={16} />
            </div>
        </Link>
    );
}

export default function PreRecordPage() {
    return <AuthGuard><PreRecordContent /></AuthGuard>;
}
