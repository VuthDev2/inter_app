"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Download, Play } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getSession, type WebSession } from "@/lib/session-store";
import { speakWithQuickVoice } from "@/lib/quickvoice-api";

export default function SessionDetail() {
  const id = useSearchParams().get("id");
  const [session, setSession] = useState<WebSession | null>(null);
  useEffect(() => setSession(getSession(id)), [id]);
  const download = () => {
    if (!session) return;
    const text = session.utterances.map((item) => `${item.original}\n${item.translation}`).join("\n\n");
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    anchor.download = `${session.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };
  return <div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--text))]"><Navbar/><main className="mx-auto max-w-4xl px-6 py-10"><Link href="/allrecords" className="inline-block mb-8"><ArrowLeft/></Link>
    {!session ? <div className="rounded-2xl border border-[rgb(var(--border))] p-12 text-center text-[rgba(var(--muted),1)]">Recording not found.</div> : <><div className="mb-8 flex items-start justify-between"><div><h1 className="text-2xl font-semibold">{session.title}</h1><p className="mt-2 text-sm text-[rgba(var(--muted),1)]">{new Date(session.createdAt).toLocaleString()} · {session.utterances.length} segments</p></div><button onClick={download} className="flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] px-4 py-2"><Download size={16}/>Export text</button></div>
    <div className="mb-5 flex items-center gap-3 text-sm"><span>{session.sourceLang === "ja" ? "🇯🇵 Japanese" : "🇺🇸 English"}</span><span>→</span><span>{session.targetLang === "ja" ? "🇯🇵 Japanese" : "🇺🇸 English"}</span></div>
    <div className="space-y-4">{session.utterances.length === 0 ? <div className="rounded-2xl border border-[rgb(var(--border))] p-10 text-center text-[rgba(var(--muted),1)]">This session was saved without a transcript.</div> : session.utterances.map((item, index) => <article key={item.id} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5"><div className="mb-3 text-xs font-semibold text-[rgb(var(--primary))]">SEGMENT {index + 1}</div><div className="flex items-start justify-between gap-4"><p className="leading-relaxed">{item.original}</p><button onClick={() => navigator.clipboard.writeText(item.original)} aria-label="Copy original"><Copy size={17}/></button></div><div className="my-4 h-px bg-[rgb(var(--border))]"/><div className="flex items-start justify-between gap-4"><p className="leading-relaxed text-[rgb(var(--primary))]">{item.translation}</p><button onClick={() => void speakWithQuickVoice(item.translation, item.targetLang)} aria-label="Play translation" className="rounded-full bg-[rgb(var(--primary))] p-2 text-white"><Play size={14} className="fill-current"/></button></div></article>)}</div></>}
  </main></div>;
}
