"use client";

import Navbar from "@/components/Navbar";
import { Download, Globe, Mic, Volume2 } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";

function ExtensionContent() {
    return (
        <div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--text))] flex flex-col font-sans">
            <Navbar />
            
            <div className="flex-1 flex flex-col items-center px-6 pt-16 pb-24">
                <div className="w-20 h-20 bg-[rgb(var(--primary))]/10 rounded-3xl flex items-center justify-center text-[rgb(var(--primary))] mb-8">
                    <Globe size={40} />
                </div>
                
                <h1 className="text-3xl font-semibold tracking-wide mb-4 text-[rgba(var(--text),0.9)] text-center">
                    QuickVoice Browser Extension
                </h1>
                
                <p className="text-[rgba(var(--muted),1)] text-[15px] mb-12 text-center max-w-xl leading-relaxed">
                    Take the power of real-time translation everywhere you go on the web. Our browser extension seamlessly integrates into your daily workflow to break down language barriers instantly.
                </p>

                <div className="w-full max-w-[900px] grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    {/* Feature 1 */}
                    <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl p-6 flex flex-col gap-4 hover:border-[rgb(var(--primary))]/50 transition-colors">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                            <Volume2 size={24} />
                        </div>
                        <h3 className="text-lg font-medium text-[rgba(var(--text),0.9)]">Translate Any Video or Audio</h3>
                        <p className="text-[14px] text-[rgba(var(--muted),1)] leading-relaxed">
                            Watch YouTube videos, attend online meetings, or listen to podcasts in any language. The extension automatically captures the audio from your active tab and translates it in real-time.
                        </p>
                    </div>

                    {/* Feature 2 */}
                    <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl p-6 flex flex-col gap-4 hover:border-[rgb(var(--emerald))]/50 transition-colors">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                            <Mic size={24} />
                        </div>
                        <h3 className="text-lg font-medium text-[rgba(var(--text),0.9)]">Speak and Transcribe</h3>
                        <p className="text-[14px] text-[rgba(var(--muted),1)] leading-relaxed">
                            Use your microphone to speak, and the extension will transcribe and translate your voice directly into text fields on websites, emails, or chat applications.
                        </p>
                    </div>
                </div>

                {/* Call to action */}
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-[rgb(var(--border))] rounded-3xl w-full max-w-[900px] p-10 flex flex-col items-center justify-center text-center">
                    <h2 className="text-2xl font-semibold mb-3 text-[rgba(var(--text),0.9)]">Ready to get started?</h2>
                    <p className="text-[rgba(var(--muted),1)] mb-8 max-w-md text-[14px]">
                        Install the QuickVoice extension for Chrome, Edge, or Brave and transform your browsing experience.
                    </p>
                    <button className="px-8 py-3.5 rounded-full bg-[rgb(var(--primary))] text-white text-[15px] font-medium flex items-center gap-2 hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20">
                        <Download size={18} />
                        Download for Chrome
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ExtensionPage() {
    return (
        <AuthGuard>
            <ExtensionContent />
        </AuthGuard>
    );
}
