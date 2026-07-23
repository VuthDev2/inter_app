"use client";

import Navbar from "@/components/Navbar";
import { Mic, MessageSquare, Play, ExternalLink, Globe, Download, ChevronRight, Speech } from "lucide-react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";

function DashboardContent() {
    const { user } = useAuth();
    const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";

    return <div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--text))] flex flex-col font-sans">
            <Navbar />
            
            <div className="flex-1 flex flex-col items-center px-6 pt-16 pb-24">
                <h1 className="text-3xl font-semibold tracking-wide mb-2 text-[rgba(var(--text),0.9)]">
                    Welcome Back, {displayName}
                </h1>
                <p className="text-[rgba(var(--muted),1)] text-[14px] mb-12 text-center max-w-md">
                    Choose a session type to begin real-time interpretation.
                </p>

                <div className="w-full max-w-[800px] flex flex-col gap-10">
                    {/* Session Type Section */}
                    <div className="flex flex-col gap-3">
                        <h2 className="text-lg font-semibold text-[rgba(var(--text),0.9)] tracking-wide">
                            Start Session
                        </h2>
                        
                        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl flex flex-col">
                            {/* One-Way */}
                            <Link href="/interpreter?mode=oneway" className="flex items-center justify-between p-5 border-b border-[rgb(var(--border))] hover:bg-[rgba(var(--text),0.05)] transition-colors group rounded-t-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))] flex items-center justify-center">
                                        <Mic size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-medium text-[rgba(var(--text),0.9)]">One-Way</span>
                                        <span className="text-[13px] text-[rgba(var(--muted),1)]">Speeches and uninterrupted listening</span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-[rgba(var(--muted),1)] group-hover:text-[rgba(var(--text-secondary),1)] transition-colors" />
                            </Link>
                            
                            {/* Two-Way */}
                            <Link href="/interpreter?mode=twoway" className="flex items-center justify-between p-5 border-b border-[rgb(var(--border))] hover:bg-[rgba(var(--text),0.05)] transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-[rgb(var(--emerald))]/10 text-[rgb(var(--emerald))] flex items-center justify-center">
                                        <MessageSquare size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-medium text-[rgba(var(--text),0.9)]">Two-Way</span>
                                        <span className="text-[13px] text-[rgba(var(--muted),1)]">Real-time bilingual conversation</span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-[rgba(var(--muted),1)] group-hover:text-[rgba(var(--text-secondary),1)] transition-colors" />
                            </Link>

                            {/* Pre-Record */}
                            <Link href="/prerecord" className="flex items-center justify-between p-5 hover:bg-[rgba(var(--text),0.05)] transition-colors group rounded-b-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-[rgb(var(--purple))]/10 text-[rgb(var(--purple))] flex items-center justify-center">
                                        <Speech size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-medium text-[rgba(var(--text),0.9)]">Pre-Record</span>
                                        <span className="text-[13px] text-[rgba(var(--muted),1)]">Save audio clips for later interpretation</span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-[rgba(var(--muted),1)] group-hover:text-[rgba(var(--text-secondary),1)] transition-colors" />
                            </Link>
                        </div>
                    </div>

                    {/* Browser Extension Banner */}
                    <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative overflow-hidden">
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="h-10 w-10 rounded-full bg-[rgb(var(--purple))]/10 flex items-center justify-center text-[rgb(var(--purple))] shrink-0">
                                <Globe size={18} />
                            </div>
                            <div className="flex flex-col">
<span className="text-[15px] font-medium text-[rgba(var(--text),0.9)]">Take QuickVoice Anywhere</span>
                                        <span className="text-[13px] text-[rgba(var(--muted),1)]">Interpret audio directly from your browser tabs.</span>
                            </div>
                        </div>
                        <button className="shrink-0 px-4 py-2 rounded-full bg-[rgba(var(--text),0.05)] hover:bg-[rgba(var(--text),0.1)] text-[13px] font-medium text-[rgba(var(--text),0.9)] flex items-center gap-2 border border-[rgb(var(--border))] transition-colors relative z-10 w-full sm:w-auto justify-center">
                            <Download size={14} />
                            Get Extension
                        </button>
                    </div>

                    {/* Recent Sessions */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[rgba(var(--text),0.9)] tracking-wide">
                                Recent Sessions
                            </h2>
                            <Link href="/history" className="flex items-center gap-1.5 text-[13px] text-[rgb(var(--primary))] hover:text-blue-300 transition-colors font-medium">
                                View all <ExternalLink size={14} />
                            </Link>
                        </div>

                        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl flex flex-col">
                            {/* Session Item 1 */}
                            <Link href="#" className="flex items-center justify-between p-5 border-b border-[rgb(var(--border))] hover:bg-[rgba(var(--text),0.05)] transition-colors group rounded-t-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-[rgb(var(--surface-muted))] flex items-center justify-center text-[rgba(var(--text-secondary),1)]">
                                        <MessageSquare size={16} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-medium text-[rgba(var(--text),0.9)]">US → JP Business Meeting</span>
                                        <span className="text-[13px] text-[rgba(var(--muted),1)]">Yesterday • 1h 15m duration</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-[rgba(var(--muted),1)] group-hover:text-[rgba(var(--text-secondary),1)] transition-colors">
                                    <span className="text-[13px] font-medium flex items-center gap-1.5"><Play size={12} className="fill-current" /> Play</span>
                                </div>
                            </Link>

                            {/* Session Item 2 */}
                            <Link href="#" className="flex items-center justify-between p-5 hover:bg-[rgba(var(--text),0.05)] transition-colors group rounded-b-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-[rgb(var(--surface-muted))] flex items-center justify-center text-[rgba(var(--text-secondary),1)]">
                                        <MessageSquare size={16} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-medium text-[rgba(var(--text),0.9)]">JP → US Restaurant</span>
                                        <span className="text-[13px] text-[rgba(var(--muted),1)]">Today • 45m duration</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-[rgba(var(--muted),1)] group-hover:text-[rgba(var(--text-secondary),1)] transition-colors">
                                    <span className="text-[13px] font-medium flex items-center gap-1.5"><Play size={12} className="fill-current" /> Play</span>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>;
}

export default function Dashboard() {
    return <AuthGuard><DashboardContent /></AuthGuard>;
}
