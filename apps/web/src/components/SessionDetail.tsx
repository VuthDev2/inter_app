"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Download, Play, ChevronDown, FileText, FileSpreadsheet, Printer, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getSession, type WebSession } from "@/lib/session-store";
import { speakWithQuickVoice } from "@/lib/quickvoice-api";

export default function SessionDetail() {
  const id = useSearchParams().get("id");
  const [session, setSession] = useState<WebSession | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => setSession(getSession(id)), [id]);

  const downloadTxt = () => {
    if (!session) return;
    const text = session.utterances.map((item) => `${item.original}\n${item.translation}`).join("\n\n");
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    anchor.download = `${session.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    setShowExportMenu(false);
  };

  const downloadCsv = () => {
    if (!session) return;
    const csvContent = "Segment,Original,Translation\n" + session.utterances.map((item, i) => {
      const escape = (str: string) => `"${str.replace(/"/g, '""')}"`;
      return `${i + 1},${escape(item.original)},${escape(item.translation)}`;
    }).join("\n");
    
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" }));
    anchor.download = `${session.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    setShowExportMenu(false);
  };

  const copyFullTranscript = async () => {
    if (!session) return;
    const text = session.utterances.map((item) => `${item.original}\n${item.translation}`).join("\n\n");
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => { setCopiedAll(false); setShowExportMenu(false); }, 2000);
  };

  const exportPdf = () => {
    setShowExportMenu(false);
    setTimeout(() => window.print(), 100);
  };
  return <div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--text))]"><div className="print:hidden"><Navbar/></div><main className="mx-auto max-w-4xl px-6 py-10 print:py-0 print:px-0"><Link href="/allrecords" className="inline-block mb-8 print:hidden"><ArrowLeft/></Link>
    {!session ? <div className="rounded-2xl border border-[rgb(var(--border))] p-12 text-center text-[rgba(var(--muted),1)]">Recording not found.</div> : <><div className="mb-8 flex items-start justify-between"><div><h1 className="text-2xl font-semibold">{session.title}</h1><p className="mt-2 text-sm text-[rgba(var(--muted),1)]">{new Date(session.createdAt).toLocaleString()} · {session.utterances.length} segments</p></div>
    
    <div className="relative print:hidden">
      <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] px-4 py-2 hover:bg-[rgba(var(--text),.05)] transition-colors">
        <Download size={16}/>Export <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
      </button>
      
      {showExportMenu && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-1.5 shadow-xl z-50">
          <button onClick={downloadTxt} className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-[rgba(var(--text),.05)] text-left"><FileText size={16} className="text-blue-500"/> Download TXT</button>
          <button onClick={downloadCsv} className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-[rgba(var(--text),.05)] text-left"><FileSpreadsheet size={16} className="text-emerald-500"/> Download CSV</button>
          <button onClick={exportPdf} className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-[rgba(var(--text),.05)] text-left"><Printer size={16} className="text-purple-500"/> Print / PDF</button>
          <div className="my-1 h-px bg-[rgb(var(--border))]"></div>
          <button onClick={copyFullTranscript} className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-[rgba(var(--text),.05)] text-left">{copiedAll ? <Check size={16} className="text-green-500"/> : <Copy size={16} className="text-slate-400"/>} {copiedAll ? 'Copied!' : 'Copy Full Text'}</button>
        </div>
      )}
    </div>
    
    </div>
    <div className="mb-5 flex items-center gap-3 text-sm"><span>{session.sourceLang === "ja" ? "🇯🇵 Japanese" : "🇺🇸 English"}</span><span>→</span><span>{session.targetLang === "ja" ? "🇯🇵 Japanese" : "🇺🇸 English"}</span></div>
    <div className="space-y-4 print:space-y-6">{session.utterances.length === 0 ? <div className="rounded-2xl border border-[rgb(var(--border))] p-10 text-center text-[rgba(var(--muted),1)]">This session was saved without a transcript.</div> : session.utterances.map((item, index) => <article key={item.id} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 print:border-b print:rounded-none print:shadow-none print:p-0 print:border-gray-300"><div className="mb-3 text-xs font-semibold text-[rgb(var(--primary))]">SEGMENT {index + 1}</div><div className="flex items-start justify-between gap-4"><p className="leading-relaxed">{item.original}</p><button onClick={() => navigator.clipboard.writeText(item.original)} aria-label="Copy original" className="print:hidden"><Copy size={17}/></button></div><div className="my-4 h-px bg-[rgb(var(--border))] print:my-2 print:bg-gray-200"/><div className="flex flex-col gap-2"><div className="flex items-start justify-between gap-4"><p className="leading-relaxed text-[rgb(var(--primary))] print:text-gray-800">{item.translation}</p><button onClick={() => void speakWithQuickVoice(item.translation, item.targetLang)} aria-label="Play translation" className="rounded-full bg-[rgb(var(--primary))] p-2 text-white print:hidden"><Play size={14} className="fill-current"/></button></div>{item.nuances && item.nuances.length > 0 && (<div className="flex flex-wrap gap-2 mt-1 print:hidden">{item.nuances.map((nuance, i) => (<span key={i} className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${nuance.color}`}>{nuance.text}</span>))}</div>)}</div></article>)}</div></>}
  </main></div>;
}
