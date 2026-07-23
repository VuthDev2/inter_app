"use client";

import Navbar from "@/components/Navbar";
import { Folder, Plus, Mic, ChevronRight } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";

function PreRecordContent() {
    return (
        <div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--text))] flex flex-col font-sans">
            <Navbar />
            
            <div className="flex-1 flex flex-col items-center px-6 pt-16 pb-24">
                <div className="w-full max-w-[800px] flex items-center justify-between mb-12">
                    <h1 className="text-3xl font-semibold tracking-wide text-[rgba(var(--text),0.9)]">
                        Pre-Record
                    </h1>
                    <button className="flex items-center gap-2 bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-pressed))] px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-colors shadow-lg shadow-[rgba(var(--primary),0.2)] text-[rgb(var(--text))]">
                        <Mic size={16} /> Record
                    </button>
                </div>

                <div className="w-full max-w-[800px] flex flex-col gap-10">
                    
                    {/* Categories Section */}
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3">
                            <h2 className="text-lg font-semibold text-[rgba(var(--text),0.9)] tracking-wide">
                                Categories
                            </h2>
                            <div className="flex items-center gap-3">
                                <button className="w-9 h-9 flex items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] hover:bg-[rgba(var(--text),0.1)] transition-colors text-[rgba(var(--text),0.8)]">
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Folders List */}
                        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl flex flex-col mt-2 overflow-hidden">
                            <FolderItem name="School" count={0} />
                            <FolderItem name="Work" count={0} />
                            <FolderItem name="Personal" count={0} isLast />
                        </div>
                    </div>

                    {/* Recently Section */}
                    <div className="flex flex-col gap-4">
                        <h2 className="text-lg font-semibold text-[rgba(var(--text),0.9)] tracking-wide">
                            Recently
                        </h2>
                        
                        {/* Empty state for recently */}
                        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl flex flex-col items-center justify-center py-12">
                            <span className="text-[14px] font-medium text-[rgba(var(--muted),1)]">No recent recordings.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FolderItem({ name, count, isLast = false }: { name: string; count: number; isLast?: boolean }) {
    return (
        <Link 
            href="#" 
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
