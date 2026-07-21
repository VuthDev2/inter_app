"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { ArrowLeft, ChevronDown, ChevronUp, Play, SkipBack, SkipForward, Volume2, ArrowRight, FileText, FileAudio } from "lucide-react";
import Link from "next/link";

const SEGMENTS = [
  {
    id: 1,
    time: "0:01",
    source: "こんにちは、今後の打ち合わせのプロジェクト のタイムラインについて話し合いたいと思います。",
    translation: "\"Hello, I'd like to discuss the project timeline for the upcoming launch.\""
  },
  {
    id: 2,
    time: "0:05",
    source: "お互いにそう言わざるを得ないと思います。",
    translation: "\"Although I must say we are one another.\"" 
  },
  {
    id: 3,
    time: "0:12",
    source: "完全に終わるまで仕事のプロジェクトを続けますが、仕事に行きたいと思う人は、人を裏切る傾向があります。",
    translation: "\"I will continue to do our work project till we are completely finish but the one who wants to go to work tends to be the one who betrays the one.\""
  },
  {
    id: 4,
    time: "0:25",
    source: "私たちは互いにそうであると言わなければなりません。",
    translation: "\"Although I must say we are one another.\""
  },
  {
    id: 5,
    time: "0:34",
    source: "お互いにそう言わざるを得ませんが、もしあなたがそうならどうしますか。",
    translation: "\"Although I must say we are one another but what if you are.\""
  }
];

export default function InsideRecordPage() {
    const [expandedSegments, setExpandedSegments] = useState<number[]>([1]);
    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

    const toggleSegment = (id: number) => {
        setExpandedSegments(prev => 
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    return (
        <div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--text))] flex flex-col font-sans relative">
            <Navbar />
            
            <div className="flex-1 flex flex-col px-6 pt-10 pb-40 relative z-10 w-full max-w-[1200px] mx-auto">
                <Link href="/folder" className="inline-flex items-center text-[rgba(var(--muted),1)] hover:text-[rgb(var(--text))] transition-colors mb-10 w-max">
                    <ArrowLeft size={20} />
                </Link>

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-4">
                    <div className="flex items-center flex-wrap gap-5 text-[14px] font-medium text-[rgba(var(--text),0.9)]">
                        <span className="text-[rgb(var(--text))] font-semibold">July 8, 2026</span>
                        <span className="text-[rgb(var(--text))] font-semibold">03:42 pm</span>
                        <div className="w-px h-5 bg-[rgba(var(--text),0.2)]"></div>
                        <span className="flex items-center gap-2 text-[rgba(var(--text-secondary),1)]">
                            <span className="w-5 h-5 rounded-full border border-[rgba(var(--border),0.3)] flex items-center justify-center text-[10px]">L</span>
                            00:50s
                        </span>
                        <div className="w-px h-5 bg-[rgba(var(--text),0.2)]"></div>
                        <span className="text-[rgba(var(--text),0.9)]">4 segments</span>
                    </div>
                    
                    <div className="flex items-center gap-4 relative">
                        <button 
                            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                            className="flex items-center justify-between gap-4 bg-[rgb(var(--surface-muted))] hover:bg-[rgb(var(--surface-muted))] border border-[rgb(var(--border))] px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-colors min-w-[120px]"
                        >
                            Export
                            <ChevronDown size={16} className={`text-[rgba(var(--muted),1)] transition-transform ${isExportDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isExportDropdownOpen && (
                            <div className="absolute top-full right-0 mt-2 bg-[rgb(var(--surface-muted))] border border-[rgb(var(--border))] rounded-xl overflow-hidden z-20 shadow-xl w-full animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex flex-col">
                                    <button 
                                        onClick={() => setIsExportDropdownOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(var(--text),0.05)] transition-colors border-b border-[rgb(var(--border))] text-left text-[rgba(var(--text),0.9)]"
                                    >
                                        <FileText size={16} className="text-[rgba(var(--muted),1)]" />
                                        <span className="text-[13px] font-medium">PDF</span>
                                    </button>
                                    <button 
                                        onClick={() => setIsExportDropdownOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(var(--text),0.05)] transition-colors text-left text-[rgba(var(--text),0.9)]"
                                    >
                                        <FileAudio size={16} className="text-[rgba(var(--muted),1)]" />
                                        <span className="text-[13px] font-medium">Audio</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="text-[13px] text-[rgb(var(--primary))] font-medium mb-8">
                    1 way conversations
                </div>

                {/* Content Card */}
                <div className="w-full bg-[rgb(var(--surface-muted))] rounded-2xl border border-[rgb(var(--border))] overflow-hidden flex flex-col shadow-xl">
                    
                    {/* Language Header */}
                    <div className="px-8 py-5 border-b border-[rgb(var(--border))] flex items-center gap-3">
                        <img src="/jp.png" alt="Japanese Flag" className="h-5 object-contain" />
                        <span className="text-[14px] font-semibold text-[rgba(var(--text),0.9)]">Japanese</span>
                        <ArrowRight size={14} className="text-[rgba(var(--muted),1)] mx-2" />
                        <img src="/us.png" alt="US Flag" className="h-5 object-contain scale-[1.6]" />
                        <span className="text-[14px] font-semibold text-[rgba(var(--text),0.9)]">English(US)</span>
                    </div>

                    {/* Segments List */}
                    <div className="flex flex-col">
                        {SEGMENTS.map((segment, index) => {
                            const isExpanded = expandedSegments.includes(segment.id);
                            
                            return (
                                <div key={segment.id} className={`flex flex-col px-8 py-6 ${index !== SEGMENTS.length - 1 ? 'border-b border-[rgb(var(--border))]' : ''}`}>
                                    <div 
                                        className="flex items-center gap-2 text-[rgb(var(--primary))] mb-4 cursor-pointer w-max hover:text-[rgb(var(--primary))] transition-colors"
                                        onClick={() => toggleSegment(segment.id)}
                                    >
                                        <span className="text-[13px] font-semibold">{segment.time}</span>
                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                    
                                    <div className="flex flex-col gap-5 pl-1 relative">
                                        <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-[rgba(var(--text),0.1)] rounded-full"></div>
                                        
                                        {isExpanded && (
                                            <div className="relative">
                                                <div className="absolute -left-1 top-0 bottom-0 w-[2px] bg-white rounded-full z-10"></div>
                                                <p className="text-[15px] leading-relaxed text-[rgba(var(--text),0.9)] pl-5">{segment.source}</p>
                                            </div>
                                        )}
                                        
                                        <div className="relative">
                                            <div className={`absolute -left-1 top-0 bottom-0 w-[2px] rounded-full z-10 ${isExpanded ? 'bg-[rgb(var(--primary))]/40' : 'bg-[rgb(var(--primary))]'}`}></div>
                                            <p className={`text-[15px] leading-relaxed pl-5 ${isExpanded ? 'text-[rgba(var(--text-secondary),1)]' : 'text-[rgba(var(--text),0.9)]'}`}>
                                                {segment.translation}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom Audio Player Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-[rgb(var(--bg))] z-50">
                {/* Progress bar */}
                <div className="w-full h-1 bg-[rgba(var(--text),0.1)] relative">
                    <div className="absolute left-0 top-0 bottom-0 bg-[rgb(var(--primary))] w-[74%]"></div>
                </div>
                
                <div className="px-6 py-6 max-w-[1200px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-[150px]">
                    </div>
                    
                    <div className="flex items-center justify-center gap-8 flex-1">
                        <span className="text-[12px] font-medium text-[rgba(var(--muted),1)] w-20 text-right">0:37 / 0:50</span>
                        
                        <div className="flex items-center gap-6">
                            <button className="text-[rgba(var(--text-secondary),1)] hover:text-[rgb(var(--text))] transition-colors">
                                <SkipBack size={20} className="fill-current" />
                            </button>
                            <button className="w-12 h-12 bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary))] rounded-full flex items-center justify-center text-[rgb(var(--text))] transition-colors shadow-lg shadow-[rgba(var(--primary),0.2)]">
                                <Play size={24} className="fill-current ml-1" />
                            </button>
                            <button className="text-[rgba(var(--text-secondary),1)] hover:text-[rgb(var(--text))] transition-colors">
                                <SkipForward size={20} className="fill-current" />
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-4 w-20">
                            <span className="text-[12px] font-semibold text-[rgba(var(--text-secondary),1)]">1x</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 min-w-[150px] justify-end">
                        <Volume2 size={20} className="text-[rgba(var(--muted),1)]" />
                        <div className="w-24 h-[3px] bg-[rgba(var(--text),0.1)] rounded-full overflow-hidden flex items-center">
                            <div className="h-full bg-[rgb(var(--primary))] w-[70%] rounded-full relative flex items-center">
                                <div className="absolute right-0 w-2 h-2 bg-white rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
