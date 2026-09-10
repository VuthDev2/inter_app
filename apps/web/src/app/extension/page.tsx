"use client";

import { PageShell, PageHeader } from "@/components/PageShell";
import { Download, Globe, Mic, Volume2 } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";

function ExtensionContent() {
    return (
        <div className="flex-1 bg-[rgb(var(--bg))] text-[rgb(var(--text))] flex flex-col font-sans">
                        
            <PageShell>
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-3xl bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]">
                    <Globe size={32} />
                </div>

                <PageHeader
                    title="Browser Extension"
                    subtitle="Real-time translation everywhere you go on the web, without leaving the page you are on."
                />

                <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2">
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
            </PageShell>
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
