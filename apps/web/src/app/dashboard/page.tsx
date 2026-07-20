import Navbar from "@/components/Navbar";
import { Mic, MessageSquare, Play, ExternalLink, Globe, Download, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
    return (
        <div className="min-h-screen bg-[#0a0e1a] text-white flex flex-col font-sans">
            <Navbar />
            
            <div className="flex-1 flex flex-col items-center px-6 pt-16 pb-24">
                <h1 className="text-3xl font-semibold tracking-wide mb-2 text-white/90">
                    Welcome Back, Roth
                </h1>
                <p className="text-white/50 text-[14px] mb-12 text-center max-w-md">
                    Choose a session type to begin real-time interpretation.
                </p>

                <div className="w-full max-w-[800px] flex flex-col gap-10">
                    {/* Session Type Section */}
                    <div className="flex flex-col gap-3">
                        <h2 className="text-lg font-semibold text-white/90 tracking-wide">
                            Start Session
                        </h2>
                        
                        <div className="bg-[#101625] border border-white/5 rounded-2xl flex flex-col">
                            {/* One-Way */}
                            <Link href="/interpreter?mode=oneway" className="flex items-center justify-between p-5 border-b border-white/5 hover:bg-white/5 transition-colors group rounded-t-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                                        <Mic size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-medium text-white/90">One-Way</span>
                                        <span className="text-[13px] text-white/40">Speeches and uninterrupted listening</span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-white/40 group-hover:text-white/70 transition-colors" />
                            </Link>
                            
                            {/* Two-Way */}
                            <Link href="/interpreter?mode=twoway" className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors group rounded-b-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                                        <MessageSquare size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-medium text-white/90">Two-Way</span>
                                        <span className="text-[13px] text-white/40">Real-time bilingual conversation</span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-white/40 group-hover:text-white/70 transition-colors" />
                            </Link>
                        </div>
                    </div>

                    {/* Browser Extension Banner */}
                    <div className="bg-[#101625] border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative overflow-hidden">
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                                <Globe size={18} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[15px] font-medium text-white/90">Take QuickVoice Anywhere</span>
                                <span className="text-[13px] text-white/40">Interpret audio directly from your browser tabs.</span>
                            </div>
                        </div>
                        <button className="shrink-0 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-[13px] font-medium text-white/90 flex items-center gap-2 border border-white/5 transition-colors relative z-10 w-full sm:w-auto justify-center">
                            <Download size={14} />
                            Get Extension
                        </button>
                    </div>

                    {/* Recent Sessions */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white/90 tracking-wide">
                                Recent Sessions
                            </h2>
                            <Link href="/history" className="flex items-center gap-1.5 text-[13px] text-blue-400 hover:text-blue-300 transition-colors font-medium">
                                View all <ExternalLink size={14} />
                            </Link>
                        </div>

                        <div className="bg-[#101625] border border-white/5 rounded-2xl flex flex-col">
                            {/* Session Item 1 */}
                            <Link href="#" className="flex items-center justify-between p-5 border-b border-white/5 hover:bg-white/5 transition-colors group rounded-t-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-[#141b2e] flex items-center justify-center text-white/60">
                                        <MessageSquare size={16} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-medium text-white/90">US → JP Business Meeting</span>
                                        <span className="text-[13px] text-white/40">Yesterday • 1h 15m duration</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-white/40 group-hover:text-white/70 transition-colors">
                                    <span className="text-[13px] font-medium flex items-center gap-1.5"><Play size={12} className="fill-current" /> Play</span>
                                </div>
                            </Link>

                            {/* Session Item 2 */}
                            <Link href="#" className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors group rounded-b-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-[#141b2e] flex items-center justify-center text-white/60">
                                        <MessageSquare size={16} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-medium text-white/90">JP → US Restaurant</span>
                                        <span className="text-[13px] text-white/40">Today • 45m duration</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-white/40 group-hover:text-white/70 transition-colors">
                                    <span className="text-[13px] font-medium flex items-center gap-1.5"><Play size={12} className="fill-current" /> Play</span>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
