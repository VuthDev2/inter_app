"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { AudioLines, Trash2, FolderPlus, Folder, ChevronRight, Pencil, X, Mic } from "lucide-react";
import Link from "next/link";

export default function HistoryPage() {
    const [isEditing, setIsEditing] = useState(false);
    
    // Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
    const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");

    const handleDeleteClick = (name: string, e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        setFolderToDelete(name);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        // Placeholder logic
        setIsDeleteModalOpen(false);
        setFolderToDelete(null);
    };

    return (
        <div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--text))] flex flex-col font-sans">
            <Navbar />
            
            <div className="flex-1 flex flex-col items-center px-6 pt-16 pb-24">
                <div className="w-full max-w-[800px] flex items-center justify-between mb-12">
                    <h1 className="text-3xl font-semibold tracking-wide text-[rgba(var(--text),0.9)]">
                        Live Interpreter
                    </h1>
                    <Link href="/interpreter" className="flex items-center gap-2 bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-pressed))] px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-colors shadow-lg shadow-[rgba(var(--primary),0.2)] text-[rgb(var(--text))]">
                        <Mic size={16} /> New Session
                    </Link>
                </div>

                <div className="w-full max-w-[800px] flex flex-col gap-10">
                    {/* Top Stats Box */}
                    <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl flex flex-col">
                        <Link href="/allrecords" className="flex items-center justify-between p-5 border-b border-[rgb(var(--border))] hover:bg-[rgba(var(--text),0.05)] transition-colors group rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <AudioLines size={18} className="text-[rgb(var(--primary))]" />
                                <span className="text-[14px] font-medium text-[rgba(var(--text),0.9)]">All Recordings</span>
                            </div>
                            <div className="flex items-center gap-3 text-[rgba(var(--muted),1)] group-hover:text-[rgba(var(--text-secondary),1)] transition-colors">
                                <span className="text-[14px] font-medium">3</span>
                                <ChevronRight size={16} />
                            </div>
                        </Link>
                        
                        <Link href="#" className="flex items-center justify-between p-5 hover:bg-[rgba(var(--text),0.05)] transition-colors group rounded-b-2xl">
                            <div className="flex items-center gap-3">
                                <Trash2 size={18} className="text-red-500" />
                                <span className="text-[14px] font-medium text-[rgba(var(--text),0.9)]">Recently Deleted</span>
                            </div>
                            <div className="flex items-center gap-3 text-[rgba(var(--muted),1)] group-hover:text-[rgba(var(--text-secondary),1)] transition-colors">
                                <span className="text-[14px] font-medium">0</span>
                                <ChevronRight size={16} />
                            </div>
                        </Link>
                    </div>

                    {/* My Folders Section */}
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3">
                            <h2 className="text-lg font-semibold text-[rgba(var(--text),0.9)] tracking-wide">
                                My Folders
                            </h2>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setIsNewFolderModalOpen(true)}
                                    className="w-9 h-9 flex items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] hover:bg-[rgba(var(--text),0.1)] transition-colors text-[rgba(var(--text),0.8)]"
                                >
                                    <FolderPlus size={16} />
                                </button>
                                {isEditing ? (
                                    <button 
                                        onClick={() => setIsEditing(false)}
                                        className="px-5 py-1.5 rounded-full bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-pressed))] transition-colors text-[13px] font-bold text-[rgb(var(--text))] shadow-lg shadow-[rgba(var(--primary),0.2)]"
                                    >
                                        Save
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => setIsEditing(true)}
                                        className="px-4 py-1.5 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] hover:bg-[rgba(var(--text),0.1)] transition-colors text-[13px] font-medium text-[rgba(var(--text),0.8)]"
                                    >
                                        Edit
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Folders List */}
                        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl flex flex-col mt-2 overflow-hidden">
                            <FolderItem name="ok" count={3} isEditing={isEditing} onDelete={(e) => handleDeleteClick("ok", e)} />
                            <FolderItem name="ik" count={0} isEditing={isEditing} onDelete={(e) => handleDeleteClick("ik", e)} />
                            <FolderItem name="iL" count={0} isEditing={isEditing} onDelete={(e) => handleDeleteClick("iL", e)} />
                            <FolderItem name="Po" count={0} isEditing={isEditing} onDelete={(e) => handleDeleteClick("Po", e)} isLast />
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
                    <div 
                        className="absolute inset-0 bg-[#000000]/40 backdrop-blur-sm"
                        onClick={() => setIsDeleteModalOpen(false)}
                    ></div>
                    <div className="relative bg-[rgb(var(--bg))] border border-[rgb(var(--border))] rounded-3xl w-[500px] p-8 shadow-2xl flex flex-col scale-100 animate-in zoom-in-95 duration-200">
                        
                        <button 
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="absolute top-6 right-6 text-[rgba(var(--muted),1)] hover:text-[rgb(var(--text))] transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-[18px] font-bold text-[rgb(var(--text))] mb-2 pr-8">
                            Delete this Folder?
                        </h2>
                        
                        <p className="text-[13px] text-[rgba(var(--text-secondary),1)] mb-10 font-medium">
                            This action cannot be undone. The folder will be permanently deleted.
                        </p>

                        <div className="flex items-center justify-end gap-5 text-[14px] font-semibold">
                            <button 
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="text-[rgba(var(--text),0.9)] hover:text-[rgb(var(--text))] transition-colors"
                            >
                                Cancel
                            </button>
                            <div className="w-px h-4 bg-[rgba(var(--text),0.2)]"></div>
                            <button 
                                onClick={confirmDelete}
                                className="text-[rgb(var(--text))] hover:text-red-400 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* New Folder Modal */}
            {isNewFolderModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
                    <div 
                        className="absolute inset-0 bg-[#000000]/60 backdrop-blur-sm"
                        onClick={() => {
                            setIsNewFolderModalOpen(false);
                            setNewFolderName("");
                        }}
                    ></div>
                    <div className="relative bg-[rgb(var(--bg))] border border-[rgb(var(--border))] rounded-[32px] w-[550px] p-10 shadow-2xl flex flex-col scale-100 animate-in zoom-in-95 duration-200">
                        
                        <h2 className="text-[28px] font-bold text-[rgb(var(--text))] mb-2">
                            New Folder
                        </h2>
                        
                        <p className="text-[16px] text-[rgba(var(--text-secondary),1)] mb-8 font-medium">
                            Enter a name for this folder.
                        </p>

                        <div className="w-full bg-[rgb(var(--surface))] rounded-[18px] px-5 py-4 mb-10 border border-[rgb(var(--border))] focus-within:border-[rgba(var(--border),0.5)] transition-colors">
                            <input
                                type="text"
                                placeholder="Name"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                autoFocus
                                className="w-full bg-transparent border-none outline-none text-[rgb(var(--text))] text-[16px] placeholder:text-[rgba(var(--muted),0.8)]"
                            />
                        </div>

                        <div className="flex items-center justify-between gap-5 w-full">
                            <button 
                                onClick={() => {
                                    setIsNewFolderModalOpen(false);
                                    setNewFolderName("");
                                }}
                                className="flex-1 py-4 rounded-[16px] bg-[rgb(var(--surface-muted))] hover:bg-[rgb(var(--surface-muted))] transition-colors text-[rgb(var(--text))] text-[17px] font-bold"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => {
                                    if (newFolderName.trim().length > 0) {
                                        setIsNewFolderModalOpen(false);
                                        setNewFolderName("");
                                    }
                                }}
                                disabled={newFolderName.trim().length === 0}
                                className={`flex-1 py-4 rounded-[16px] text-[17px] font-bold transition-colors ${
                                    newFolderName.trim().length > 0 
                                        ? 'bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-pressed))] text-[rgb(var(--text))]' 
                                        : 'bg-[rgb(var(--surface-muted))] text-[rgba(var(--muted),0.5)] cursor-not-allowed'
                                }`}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function FolderItem({ name, count, isEditing, onDelete, isLast = false }: { name: string; count: number; isEditing: boolean; onDelete: (e: React.MouseEvent) => void; isLast?: boolean }) {
    return (
        <Link 
            href="/folder" 
            className={`flex items-center justify-between p-5 hover:bg-[rgba(var(--text),0.05)] transition-colors group ${
                !isLast ? 'border-b border-[rgb(var(--border))]' : ''
            }`}
        >
            <div className="flex items-center gap-4">
                {isEditing && (
                    <button onClick={onDelete} className="text-red-500 hover:text-red-400 transition-colors mr-2">
                        <Trash2 size={16} />
                    </button>
                )}
                <Folder size={18} className="text-[rgb(var(--primary))]" />
                <span className="text-[14px] font-medium text-[rgba(var(--text),0.9)]">{name}</span>
            </div>
            
            {isEditing ? (
                <div className="flex items-center text-[rgba(var(--muted),1)] hover:text-[rgb(var(--text))] transition-colors">
                    <Pencil size={16} />
                </div>
            ) : (
                <div className="flex items-center gap-3 text-[rgba(var(--muted),1)] group-hover:text-[rgba(var(--text-secondary),1)] transition-colors">
                    <span className="text-[14px] font-medium">{count}</span>
                    <ChevronRight size={16} />
                </div>
            )}
        </Link>
    );
}
