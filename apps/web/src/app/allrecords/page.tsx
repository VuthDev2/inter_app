"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Search, Clock, ArrowLeftRight, Square, CheckSquare, Pencil, Trash2, X, Mic } from "lucide-react";
import Link from "next/link";

const MOCK_RECORDS = [1, 2, 3];

export default function AllRecordsPage() {
    const [records, setRecords] = useState(MOCK_RECORDS);
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    
    // Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null); // null means bulk delete

    const toggleSelection = (index: number) => {
        setSelectedItems(prev => 
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    const toggleSelectAll = () => {
        if (selectedItems.length === records.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(records.map((_, i) => i));
        }
    };

    const handleDeleteClick = (index: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setItemToDelete(index);
        setIsDeleteModalOpen(true);
    };

    const handleBulkDeleteClick = () => {
        setItemToDelete(null);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (itemToDelete !== null) {
            setRecords(prev => prev.filter((_, i) => i !== itemToDelete));
            setSelectedItems(prev => prev.filter(id => id !== itemToDelete).map(id => id > itemToDelete ? id - 1 : id));
        } else {
            setRecords(prev => prev.filter((_, i) => !selectedItems.includes(i)));
            setSelectedItems([]);
        }
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
    };

    return (
        <div className="min-h-screen bg-[#0a0e1a] text-white flex flex-col font-sans relative">
            <Navbar />
            
            <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8 flex flex-col relative">
                <Link href="/history" className="absolute left-6 top-8 text-white/60 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <Link href="/interpreter" className="absolute right-6 top-6 flex items-center gap-2 bg-blue-500 hover:bg-blue-600 px-4 py-2.5 rounded-xl text-[14px] font-semibold transition-colors shadow-lg shadow-blue-500/20 text-white">
                    <Mic size={16} /> New Session
                </Link>

                <h1 className="text-xl font-semibold text-center tracking-wide mb-8 text-white/90">
                    Recordings
                </h1>

                <div className="w-full max-w-3xl mx-auto relative mb-6">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search size={18} className="text-white/40" />
                    </div>
                    <input 
                        type="text" 
                        placeholder=""
                        className="w-full bg-[#141b2e] border-none rounded-full py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/10"
                    />
                </div>

                {/* Selection Action Bar */}
                {selectedItems.length > 0 && (
                    <div className="w-full max-w-3xl mx-auto mb-6 bg-[#141b2e] flex items-center px-6 py-4 rounded-2xl border border-white/10 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-6">
                            <button onClick={() => setSelectedItems([])} className="text-white/40 hover:text-white transition-colors">
                                <X size={18} />
                            </button>
                            <span className="text-[14px] font-medium text-white/60">{selectedItems.length} selected</span>
                            <button onClick={toggleSelectAll} className="text-[14px] font-semibold text-white/90 hover:text-white transition-colors">
                                Select all
                            </button>
                            <button onClick={handleBulkDeleteClick} className="text-[14px] font-semibold text-red-400 hover:text-red-500 transition-colors ml-2">
                                Delete
                            </button>
                        </div>
                    </div>
                )}

                <div className="w-full max-w-3xl mx-auto flex flex-col gap-4">
                    {records.map((item, i) => {
                        const isSelected = selectedItems.includes(i);
                        return (
                            <Link 
                                href="/insiderecord"
                                key={item} 
                                className={`group relative rounded-full px-8 py-5 flex items-center justify-between border transition-all duration-300 cursor-pointer overflow-hidden block w-full ${
                                    isSelected 
                                        ? 'bg-[#1a233a] border-[#3b82f6]' 
                                        : 'bg-[#141b2e] border-transparent hover:border-[#3b82f6] hover:bg-[#1a233a]'
                                }`}
                            >
                                {/* Left Side */}
                                <div className="flex items-center">
                                    <div 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            toggleSelection(i);
                                        }}
                                        className={`overflow-hidden flex items-center shrink-0 transition-all duration-200 ${
                                        isSelected ? 'w-5 opacity-100 mr-4' : 'w-0 opacity-0 group-hover:w-5 group-hover:opacity-100 group-hover:mr-4'
                                    }`}>
                                        {isSelected ? (
                                            <CheckSquare size={18} className="text-[#3b82f6] fill-[#3b82f6]/20" />
                                        ) : (
                                            <Square size={18} className="text-white/40 hover:text-white transition-colors" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <span className="text-[14px] font-semibold text-white/90 whitespace-nowrap">July 8, 2026</span>
                                        <div className="w-px h-4 bg-white/10"></div>
                                        <span className="text-[14px] font-semibold text-white/70 whitespace-nowrap">03:42 pm</span>
                                    </div>
                                </div>
                                
                                {/* Center (Flags) */}
                                <div className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-4 transition-opacity duration-200 pointer-events-none ${
                                    isSelected ? 'opacity-0' : 'opacity-100 group-hover:opacity-0'
                                }`}>
                                    <span className="text-2xl leading-none">🇯🇵</span>
                                    <ArrowLeftRight size={16} className="text-white/40" />
                                    <span className="text-2xl leading-none">🇺🇸</span>
                                </div>

                                {/* Right Side */}
                                <div className="flex items-center gap-8 z-10">
                                    {/* Actions (visible on hover or when selected) */}
                                    <div className={`flex items-center gap-5 text-white/40 transition-all duration-300 ${
                                        isSelected 
                                            ? 'opacity-100 translate-x-0 pointer-events-auto' 
                                            : 'opacity-0 -translate-x-4 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-x-0'
                                    }`}>
                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="hover:text-white transition-colors">
                                            <Pencil size={18} />
                                        </button>
                                        <button onClick={(e) => { e.preventDefault(); handleDeleteClick(i, e); }} className="text-red-500/80 hover:text-red-500 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2 text-white/50 shrink-0">
                                        <Clock size={16} />
                                        <span className="text-[13px] font-medium">12:03</span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </main>

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
                    <div 
                        className="absolute inset-0 bg-[#000000]/40 backdrop-blur-sm"
                        onClick={() => setIsDeleteModalOpen(false)}
                    ></div>
                    <div className="relative bg-[#0b0e14] border border-white/10 rounded-3xl w-[500px] p-8 shadow-2xl flex flex-col scale-100 animate-in zoom-in-95 duration-200">
                        
                        <button 
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-[18px] font-bold text-white mb-2 pr-8">
                            Delete this Recording?
                        </h2>
                        
                        <p className="text-[13px] text-white/70 mb-10 font-medium">
                            This action cannot be undone. The recording will be permanently deleted.
                        </p>

                        <div className="flex items-center justify-end gap-5 text-[14px] font-semibold">
                            <button 
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="text-white/90 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <div className="w-px h-4 bg-white/20"></div>
                            <button 
                                onClick={confirmDelete}
                                className="text-white hover:text-red-400 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
