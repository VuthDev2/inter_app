"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { ArrowLeft, ChevronDown, ChevronUp, Play, SkipBack, SkipForward, Volume2, ArrowRight, FileText, FileAudio } from "lucide-react";
import Link from "next/link";

const SEGMENTS = [
  {
    id: 1,
    speaker: "A",
    time: "0:01",
    source: "こんにちは、今後の打ち合わせのプロジェクト のタイムラインについて話し合いたいと思います。",
    translation: "\"Hello, I'd like to discuss the project timeline for the upcoming launch.\""
  },
  {
    id: 2,
    speaker: "B",
    time: "0:05",
    source: "お互いにそう言わざるを得ないと思います。",
    translation: "\"Although I must say we are one another.\"" 
  },
  {
    id: 3,
    speaker: "A",
    time: "0:12",
    source: "完全に終わるまで仕事のプロジェクトを続けますが、仕事に行きたいと思う人は、人を裏切る傾向があります。",
    translation: "\"I will continue to do our work project till we are completely finish but the one who wants to go to work tends to be the one who betrays the one.\""
  },
  {
    id: 4,
    speaker: "B",
    time: "0:25",
    source: "私たちは互いにそうであると言わなければなりません。",
    translation: "\"Although I must say we are one another.\""
  },
  {
    id: 5,
    speaker: "A",
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
        <div className="min-h-screen bg-[#0a0e1a] text-white flex flex-col font-sans relative">
            <Navbar />
            
            <div className="flex-1 flex flex-col px-6 pt-10 pb-40 relative z-10 w-full max-w-[1200px] mx-auto">
                <Link href="/folder" className="inline-flex items-center text-white/50 hover:text-white transition-colors mb-10 w-max">
                    <ArrowLeft size={20} />
                </Link>

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-4">
                    <div className="flex items-center flex-wrap gap-5 text-[14px] font-medium text-white/90">
                        <span className="text-white font-semibold">July 8, 2026</span>
                        <span className="text-white font-semibold">03:42 pm</span>
                        <div className="w-px h-5 bg-white/20"></div>
                        <span className="flex items-center gap-2 text-white/70">
                            <span className="w-5 h-5 rounded-full border border-white/30 flex items-center justify-center text-[10px]">L</span>
                            00:50s
                        </span>
                        <div className="w-px h-5 bg-white/20"></div>
                        <span className="text-white/90">4 segments</span>
                    </div>
                    
                    <div className="flex items-center gap-4 relative">
                        <button 
                            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                            className="flex items-center justify-between gap-4 bg-[#141b2e] hover:bg-[#1a233a] border border-white/10 px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-colors min-w-[120px]"
                        >
                            Export
                            <ChevronDown size={16} className={`text-white/50 transition-transform ${isExportDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isExportDropdownOpen && (
                            <div className="absolute top-full right-0 mt-2 bg-[#141b2e] border border-white/10 rounded-xl overflow-hidden z-20 shadow-xl w-full animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex flex-col">
                                    <button 
                                        onClick={() => setIsExportDropdownOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 text-left text-white/90"
                                    >
                                        <FileText size={16} className="text-white/50" />
                                        <span className="text-[13px] font-medium">PDF</span>
                                    </button>
                                    <button 
                                        onClick={() => setIsExportDropdownOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left text-white/90"
                                    >
                                        <FileAudio size={16} className="text-white/50" />
                                        <span className="text-[13px] font-medium">Audio</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="text-[13px] text-[#3b82f6] font-medium mb-8 flex justify-between items-center">
                    <span>2 way conversations</span>
                </div>

                {/* Content Card */}
                <div className="w-full bg-[#141b2e] rounded-2xl border border-white/5 overflow-hidden flex flex-col shadow-xl">
                    
                    {/* Language Header */}
                    <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src="/jp.png" alt="Japanese Flag" className="h-5 object-contain" />
                            <span className="text-[14px] font-semibold text-white/90">Japanese</span>
                            <span className="px-2 py-0.5 ml-2 rounded-md bg-white/5 text-[10px] font-bold tracking-wider uppercase text-white/50 border border-white/10">Speaker A</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 mr-2 rounded-md bg-white/5 text-[10px] font-bold tracking-wider uppercase text-white/50 border border-white/10">Speaker B</span>
                            <img src="/us.png" alt="US Flag" className="h-5 object-contain scale-[1.6]" />
                            <span className="text-[14px] font-semibold text-white/90">English(US)</span>
                        </div>
                    </div>

                    {/* Segments List */}
                    <div className="flex flex-col">
                        {SEGMENTS.map((segment, index) => {
                            const isExpanded = expandedSegments.includes(segment.id);
                            
                            return (
                                <div key={segment.id} className={`flex flex-col px-8 py-6 ${index !== SEGMENTS.length - 1 ? 'border-b border-white/5' : ''}`}>
                                    <div 
                                        className={`flex items-center gap-3 mb-4 cursor-pointer w-full transition-colors ${segment.speaker === 'A' ? 'justify-start' : 'justify-end'}`}
                                        onClick={() => toggleSegment(segment.id)}
                                    >
                                        {segment.speaker === 'A' ? (
                                            <>
                                                <div className="flex items-center gap-2 text-[#3b82f6] hover:text-blue-400">
                                                    <span className="text-[13px] font-semibold">{segment.time}</span>
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </div>
                                                <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-bold tracking-wider uppercase text-white/50 border border-white/10">Speaker A</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-bold tracking-wider uppercase text-white/50 border border-white/10">Speaker B</span>
                                                <div className="flex items-center gap-2 text-[#3b82f6] hover:text-blue-400">
                                                    <span className="text-[13px] font-semibold">{segment.time}</span>
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-col gap-5 pl-1 relative">
                                        <div className={`absolute top-1 bottom-1 w-[2px] bg-white/10 rounded-full ${segment.speaker === 'A' ? 'left-0' : 'right-0'}`}></div>
                                        
                                        {isExpanded && (
                                            <div className="relative">
                                                <div className={`absolute top-0 bottom-0 w-[2px] bg-white rounded-full z-10 ${segment.speaker === 'A' ? '-left-1' : '-right-1'}`}></div>
                                                <p className={`text-[15px] leading-relaxed text-white/90 ${segment.speaker === 'A' ? 'pl-5 text-left pr-12' : 'pr-5 text-right pl-12'}`}>{segment.source}</p>
                                            </div>
                                        )}
                                        
                                        <div className="relative">
                                            <div className={`absolute top-0 bottom-0 w-[2px] rounded-full z-10 ${isExpanded ? 'bg-[#3b82f6]/40' : 'bg-[#3b82f6]'} ${segment.speaker === 'A' ? '-left-1' : '-right-1'}`}></div>
                                            <p className={`text-[15px] leading-relaxed ${isExpanded ? 'text-white/60' : 'text-white/90'} ${segment.speaker === 'A' ? 'pl-5 text-left pr-12' : 'pr-5 text-right pl-12'}`}>
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
            <div className="fixed bottom-0 left-0 right-0 bg-[#0b0e14] z-50">
                {/* Progress bar */}
                <div className="w-full h-1 bg-white/10 relative">
                    <div className="absolute left-0 top-0 bottom-0 bg-[#3b82f6] w-[74%]"></div>
                </div>
                
                <div className="px-6 py-6 max-w-[1200px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-[150px]">
                    </div>
                    
                    <div className="flex items-center justify-center gap-8 flex-1">
                        <span className="text-[12px] font-medium text-white/50 w-20 text-right">0:37 / 0:50</span>
                        
                        <div className="flex items-center gap-6">
                            <button className="text-white/70 hover:text-white transition-colors">
                                <SkipBack size={20} className="fill-current" />
                            </button>
                            <button className="w-12 h-12 bg-[#3b82f6] hover:bg-blue-500 rounded-full flex items-center justify-center text-white transition-colors shadow-lg shadow-blue-500/20">
                                <Play size={24} className="fill-current ml-1" />
                            </button>
                            <button className="text-white/70 hover:text-white transition-colors">
                                <SkipForward size={20} className="fill-current" />
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-4 w-20">
                            <span className="text-[12px] font-semibold text-white/70">1x</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 min-w-[150px] justify-end">
                        <Volume2 size={20} className="text-white/50" />
                        <div className="w-24 h-[3px] bg-white/10 rounded-full overflow-hidden flex items-center">
                            <div className="h-full bg-[#3b82f6] w-[70%] rounded-full relative flex items-center">
                                <div className="absolute right-0 w-2 h-2 bg-white rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
