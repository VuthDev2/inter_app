"use client";

import CreateCategoryDialog, { CategoryIcon } from "@/components/CreateCategoryDialog";
import { PageShell, PageHeader, PrimaryAction, SectionHeading } from "@/components/PageShell";
import { Plus, Mic, ChevronRight } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";
import { useState } from "react";
import { useEffect } from "react";
import { addFolder, isRecordingSession, loadFolders, loadSessions, subscribeStorage, type WebFolder, type WebSession } from "@/lib/session-store";

function PreRecordContent() {
    const [categories, setCategories] = useState<WebFolder[]>([]);
    const [recent, setRecent] = useState<WebSession[]>([]);
    const [adding, setAdding] = useState(false);
    useEffect(() => {
        const refresh = () => {
            setCategories(loadFolders());
            setRecent(loadSessions().filter((item) => !item.deletedAt && isRecordingSession(item)).slice(0, 3));
        };
        refresh();
        return subscribeStorage(refresh);
    }, []);
    const createCategory = (name: string, icon: string) => addFolder(name, icon);

    return (
        <div className="flex-1 bg-[rgb(var(--bg))] text-[rgb(var(--text))] flex flex-col font-sans">
                        
            <PageShell>
                <PageHeader
                    title="Pre-Record"
                    subtitle="Your recordings, grouped by category"
                    action={<PrimaryAction href="/record"><Mic size={16} />Record</PrimaryAction>}
                />

                <div className="flex flex-col gap-10">
                    
                    {/* Categories Section */}
                    <div className="flex flex-col gap-4">
                        <SectionHeading
                            action={
                                <button
                                    onClick={() => setAdding(true)}
                                    aria-label="New category"
                                    className="rounded-full p-2 text-[rgb(var(--primary))] transition-colors hover:bg-[rgba(var(--text),0.06)]"
                                >
                                    <Plus size={20} />
                                </button>
                            }
                        >
                            Categories
                        </SectionHeading>

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
                                        icon={cat.icon}
                                        count={loadSessions().filter((item) => !item.deletedAt && isRecordingSession(item) && item.folder === cat.name).length}
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
            </PageShell>

            <CreateCategoryDialog
                open={adding}
                onClose={() => setAdding(false)}
                onCreate={createCategory}
            />
        </div>
    );
}

function FolderItem({ name, count, href = "#", isLast = false, icon }: { name: string; count: number; href?: string; isLast?: boolean; icon?: string }) {
    return (
        <Link 
            href={href} 
            className={`flex items-center justify-between p-5 hover:bg-[rgba(var(--text),0.05)] transition-colors group ${
                !isLast ? 'border-b border-[rgb(var(--border))]' : ''
            }`}
        >
            <div className="flex items-center gap-4">
                <CategoryIcon icon={icon} size={18} className="text-[rgb(var(--primary))]" />
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
