"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Shield, Sparkles, Zap, Copyright, Globe, Hexagon, Fingerprint, Command, Speaker, Mic, Play, Volume2, Folder, Layers } from "lucide-react";

const featuresData = [
  {
    id: 1,
    icon: Volume2,
    iconColor: "text-teal-400",
    iconBg: "bg-teal-900/40 border-teal-500/20",
    shadow: "shadow-[0_0_15px_rgba(20,184,166,0.15)]",
    dotColor: "bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]",
    title1: "One-Way",
    title2: "Interpretation",
    description: "Perfect for speeches, lectures, and broadcasts. Our AI captures nuances in the speaker's tone and delivers crisp, translated audio to thousands of listeners simultaneously.",
    buttonColor: "border-pink-400/40 text-pink-100 hover:bg-pink-500/10 shadow-[0_0_20px_rgba(244,114,182,0.05)]",
    image: "/feature1.png"
  },
  {
    id: 2,
    icon: Layers,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-900/40 border-purple-500/20",
    shadow: "shadow-[0_0_15px_rgba(168,85,247,0.15)]",
    dotColor: "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]",
    title1: "Multiple",
    title2: "Translation Modes",
    description: "Switch seamlessly between one-way broadcasts, two-way live conversations, or upload pre-recorded audio for instant, accurate translations tailored to any scenario.",
    buttonColor: "border-cyan-400/40 text-cyan-100 hover:bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.05)]",
    image: "/feature2.png"
  },
  {
    id: 3,
    icon: Folder,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-900/40 border-blue-500/20",
    shadow: "shadow-[0_0_15px_rgba(59,130,246,0.15)]",
    dotColor: "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]",
    title1: "Smart",
    title2: "Organization",
    description: "Keep your workspace clutter-free. Easily organize your translated audio, transcripts, and projects into custom folders for quick access and seamless team collaboration.",
    buttonColor: "border-purple-400/40 text-purple-100 hover:bg-purple-500/10 shadow-[0_0_20px_rgba(192,132,252,0.05)]",
    image: "/feature3.png"
  }
];

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const wheelTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % featuresData.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const minSwipeDistance = 50;

  const handleSwipe = (start: number, end: number) => {
    const distance = start - end;
    if (distance > minSwipeDistance) {
      setActiveFeature((prev) => (prev + 1) % featuresData.length);
    } else if (distance < -minSwipeDistance) {
      setActiveFeature((prev) => (prev - 1 + featuresData.length) % featuresData.length);
    }
  };

  // Touch Events
  const onTouchStartEvent = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMoveEvent = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEndEvent = () => {
    if (!touchStart || !touchEnd) return;
    handleSwipe(touchStart, touchEnd);
  };

  // Mouse Events
  const onMouseDownEvent = (e: React.MouseEvent) => {
    setIsDragging(true);
    setTouchEnd(null);
    setTouchStart(e.clientX);
  };
  const onMouseMoveEvent = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTouchEnd(e.clientX);
  };
  const onMouseUpEvent = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (touchStart && touchEnd) handleSwipe(touchStart, touchEnd);
  };
  const onMouseLeaveEvent = () => {
    if (isDragging) {
      setIsDragging(false);
      if (touchStart && touchEnd) handleSwipe(touchStart, touchEnd);
    }
  };

  // Scroll/Wheel Events
  const onWheelEvent = (e: React.WheelEvent) => {
    if (wheelTimeout.current) return;
    if (Math.abs(e.deltaX) > 20) {
      if (e.deltaX > 0) {
        setActiveFeature((prev) => (prev + 1) % featuresData.length);
      } else {
        setActiveFeature((prev) => (prev - 1 + featuresData.length) % featuresData.length);
      }
      wheelTimeout.current = setTimeout(() => {
        wheelTimeout.current = null;
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-[#05050A] text-white font-sans overflow-x-hidden selection:bg-blue-500/30">
      
      {/* Custom Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes wave {
          0% { transform: translateX(0) translateZ(0) scaleY(1); }
          50% { transform: translateX(-25%) translateZ(0) scaleY(0.85); }
          100% { transform: translateX(-50%) translateZ(0) scaleY(1); }
        }
        .animate-wave {
          animation: wave 15s linear infinite;
        }
        .animate-wave-slow {
          animation: wave 25s linear infinite;
        }
        @keyframes float-pop {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-float-pop {
          animation: float-pop 6s ease-in-out infinite;
        }
        @keyframes soundwave {
          0%, 100% { height: 4px; }
          50% { height: 24px; }
        }
        .bar-1 { animation: soundwave 1s ease-in-out infinite 0.1s; }
        .bar-2 { animation: soundwave 1.2s ease-in-out infinite 0.3s; }
        .bar-3 { animation: soundwave 0.8s ease-in-out infinite 0.2s; }
        .bar-4 { animation: soundwave 1.1s ease-in-out infinite 0.4s; }
        .bar-5 { animation: soundwave 0.9s ease-in-out infinite 0.1s; }
      `}} />

      {/* --- HERO SECTION --- */}
      <div className="relative w-full min-h-screen flex flex-col items-center">
        
        {/* Animated Wave Background SVG & Ambient Light */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[10%] right-[10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px]"></div>
          <div className="absolute top-[40%] left-[5%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px]"></div>
          
          <div className="absolute top-[20%] left-0 right-0 h-[800px] w-[200%] opacity-50">
            {/* Wave Layer 1 */}
            <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="absolute w-full h-full animate-wave-slow stroke-blue-800 fill-none opacity-40" strokeWidth="1">
              <path d="M0,160 C320,300 420,0 720,160 C1020,320 1120,0 1440,160 C1760,320 1860,0 2160,160 C2460,320 2560,0 2880,160" />
              <path d="M0,180 C300,10 400,310 720,180 C1040,50 1140,350 1440,180 C1740,10 1840,310 2160,180 C2460,50 2560,350 2880,180" />
            </svg>
            {/* Wave Layer 2 */}
            <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="absolute w-full h-full animate-wave-slow stroke-blue-700 fill-none opacity-60" strokeWidth="1.5" style={{marginTop: '20px'}}>
              <path d="M0,150 C280,250 380,50 720,150 C1060,250 1160,50 1440,150 C1760,250 1860,50 2160,150 C2460,250 2560,50 2880,150" />
              <path d="M0,170 C310,20 410,320 720,170 C1030,20 1130,320 1440,170 C1750,20 1850,320 2160,170 C2460,20 2560,320 2880,170" />
            </svg>
            {/* Wave Layer 3 */}
            <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="absolute w-full h-full animate-wave stroke-blue-500 fill-none opacity-80" strokeWidth="2.5" style={{marginTop: '40px'}}>
              <path d="M0,160 C280,0 380,320 720,160 C1060,0 1160,320 1440,160 C1720,0 1820,320 2160,160 C2440,0 2540,320 2880,160" />
              <path d="M0,190 C320,30 420,350 720,190 C1020,30 1120,350 1440,190 C1740,30 1840,350 2160,190 C2440,30 2540,350 2880,190" />
            </svg>
            {/* Wave Layer 4 */}
            <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="absolute w-full h-full animate-wave stroke-blue-400 fill-none opacity-90" strokeWidth="3" style={{marginTop: '60px'}}>
              <path d="M0,140 C250,50 350,280 720,140 C1090,50 1190,280 1440,140 C1790,50 1890,280 2160,140 C2510,50 2610,280 2880,140" />
            </svg>
          </div>
        </div>

        {/* Top Floating Navbar */}
        <div className="w-full flex justify-center pt-8 relative z-20 px-6">
          <nav className="w-full max-w-[1000px] px-6 py-4 flex items-center justify-between bg-black/50 rounded-full border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-3 pl-3 pr-4">
              <img src="/logo-d.png" alt="QuickVoice Logo" className="h-7 w-auto" />
              <span className="text-lg font-bold italic tracking-tight text-white">
                Quick<span className="text-blue-500">Voice</span>
              </span>
            </div>

            <div className="hidden md:flex items-center gap-10 text-[13px] font-medium text-gray-300">
              <Link href="#features" className="hover:text-white transition-colors">Live Interpreter</Link>
              <Link href="#featuring" className="hover:text-white transition-colors">Features</Link>
              <Link href="#" className="hover:text-white transition-colors">more</Link>
            </div>

            <div className="flex items-center gap-3 text-[14px] font-semibold pr-1">
              <Link href="/signup" className="px-5 py-2 rounded-full text-gray-400 hover:text-white transition-all">
                Sign Up
              </Link>
              <Link href="/login" className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-[0_0_20px_rgba(0,195,255,0.4)]">
                Login
              </Link>
            </div>
          </nav>
        </div>

        {/* Hero Content */}
        <div className="w-full max-w-7xl px-6 flex-1 flex flex-col lg:flex-row items-center justify-between mt-12 lg:mt-0 relative z-10 gap-12">
          
          {/* Left Side */}
          <div className="w-full lg:w-[45%] flex flex-col items-start gap-6">
            <h1 className="text-[52px] leading-[1.05] font-bold tracking-tight text-white">
              Break The Language<br/>Barrier Instantly
            </h1>
            
            <p className="text-[17px] text-blue-500 font-medium max-w-md leading-relaxed">
              Experience real-time AI voice interpretation between English and Japanese conversations.
            </p>
            
            <div className="flex items-center gap-5 mt-4">
              <Link href="/signup" className="px-8 py-3.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-[0_0_30px_rgba(37,99,235,0.4)]">
                Get started
              </Link>
            </div>
          </div>

          {/* Right Side: Image Stack */}
          <div className="w-full lg:w-[55%] flex justify-end relative items-center z-10 mt-16 lg:mt-0 pr-4" style={{ perspective: '1200px' }}>
            <div 
              className="relative w-full max-w-[650px] flex items-center justify-center animate-float-pop"
              style={{ transformStyle: 'preserve-3d', transform: 'rotateY(25deg) rotateX(8deg) rotateZ(-3deg)' }}
            >
                {/* Back Screen (Scaled up, slightly blurred, pushed back in 3D) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0" style={{ transform: 'translateZ(-80px)' }}>
                    <img src="/screen.png" alt="" className="w-full h-auto object-cover opacity-90 rounded-2xl" style={{ transform: 'scale(1.25)', filter: 'blur(4px)' }} />
                </div>

                {/* Front Screen (Clear, pushed forward in 3D) */}
                <div className="w-[85%] rounded-2xl border border-blue-900/40 shadow-[0_30px_60px_rgba(0,0,0,0.7)] overflow-hidden relative z-10 bg-[#0b0f19]" style={{ transform: 'translateZ(40px)' }}>
                    <img src="/screen.png" alt="Dashboard interface" className="w-full h-auto object-cover relative z-10" />
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- FEATURES SECTION --- */}
      <div id="featuring" className="w-full py-32 px-6 flex flex-col items-center relative z-10 overflow-hidden">
        <div 
          className="w-full max-w-6xl flex flex-col gap-12"
          onTouchStart={onTouchStartEvent}
          onTouchMove={onTouchMoveEvent}
          onTouchEnd={onTouchEndEvent}
          onMouseDown={onMouseDownEvent}
          onMouseMove={onMouseMoveEvent}
          onMouseUp={onMouseUpEvent}
          onMouseLeave={onMouseLeaveEvent}
          onWheel={onWheelEvent}
        >
            
            {/* Carousel Container */}
            <div className="w-full overflow-hidden relative rounded-[2.5rem]">
                <div 
                    className="flex transition-transform duration-700 ease-in-out items-stretch"
                    style={{ transform: `translateX(-${activeFeature * 100}%)` }}
                >
                    {featuresData.map((feature) => {
                        const Icon = feature.icon;
                        return (
                            <div key={feature.id} className="w-full shrink-0 flex">
                                {/* Feature Card */}
                                <div className="w-full h-full bg-[#18181b]/80 border border-white/5 rounded-[2.5rem] p-12 lg:p-16 flex flex-col lg:flex-row items-center justify-between gap-12">
                                    {/* Left Content */}
                                    <div className="w-full lg:w-1/2 flex flex-col items-start justify-center">
                                        <h3 className="text-4xl lg:text-5xl font-bold text-white leading-[1.15] mb-6 tracking-tight">
                                            {feature.title1}<br/>{feature.title2}
                                        </h3>
                                        
                                        <p className="text-[#a1a1aa] text-[17px] leading-relaxed max-w-md font-medium">
                                            {feature.description}
                                        </p>
                                    </div>
                                    
                                    {/* Right Image */}
                                    <div className="w-full lg:w-[45%] flex justify-end">
                                        <div className="w-full rounded-[2rem] overflow-hidden shadow-2xl border border-white/5">
                                            <img src={feature.image} alt={feature.title1} className="w-full h-auto object-cover" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Carousel Dots */}
            <div className="flex justify-center gap-3 mt-6">
                {featuresData.map((feature, idx) => (
                    <div 
                        key={feature.id}
                        onClick={() => setActiveFeature(idx)}
                        className={`h-2.5 rounded-full cursor-pointer transition-all duration-300 ${activeFeature === idx ? feature.dotColor + ' w-6' : 'bg-gray-700 hover:bg-gray-500 w-2.5'}`}
                    ></div>
                ))}
            </div>

        </div>
      </div>

      {/* --- THE EDGE SECTION --- */}
      <div id="features" className="w-full py-24 flex flex-col items-center bg-[#070b14] relative z-10">
        <h2 className="text-3xl font-bold mb-4 tracking-wide">The Edge</h2>
        <p className="text-[14px] text-gray-400 mb-20 font-medium">The next generation of human connection.</p>
        
        <div className="w-full max-w-7xl px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-[#0b1221]/80 backdrop-blur-sm border border-gray-800/80 rounded-[2rem] p-8 hover:border-gray-700 transition-colors">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mb-6">
                    <Shield size={18} className="text-purple-400" />
                </div>
                <h3 className="text-[16px] font-semibold mb-4">Privacy-First</h3>
                <p className="text-[14px] text-gray-400 leading-relaxed">
                    Secure on-device processing ensures your conversations never leave your hardware. Enterprise grade encryption for total peace of mind.
                </p>
            </div>

            {/* Card 2 */}
            <div className="bg-[#0b1221]/80 backdrop-blur-sm border border-gray-800/80 rounded-[2rem] p-8 hover:border-gray-700 transition-colors">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center mb-6">
                    <Sparkles size={18} className="text-cyan-400" />
                </div>
                <h3 className="text-[16px] font-semibold mb-4">Neural Clarity</h3>
                <p className="text-[14px] text-gray-400 leading-relaxed">
                    HD audio reconstruction technology restores vocal nuances and removes background noise for crystal-clear communication.
                </p>
            </div>

            {/* Card 3 */}
            <div className="bg-[#0b1221]/80 backdrop-blur-sm border border-gray-800/80 rounded-[2rem] p-8 hover:border-gray-700 transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
                    <Zap size={18} className="text-blue-400" />
                </div>
                <h3 className="text-[16px] font-semibold mb-4">Zero Latency</h3>
                <p className="text-[14px] text-gray-400 leading-relaxed">
                    Real-time streaming architecture delivers translations in under 50ms, making digital barriers feel completely invisible.
                </p>
            </div>
        </div>
      </div>

      {/* --- FOOTER --- */}
      <footer className="w-full border-t border-gray-800/50 pt-20 pb-10 flex flex-col items-center bg-[#05080f] relative z-10">
        <p className="text-[11px] text-gray-500 uppercase tracking-[0.2em] font-semibold mb-12">Empowering Global Communication</p>
        
        {/* Partner Logos Placeholder */}
        <div className="flex flex-wrap items-center justify-center gap-12 md:gap-24 mb-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <span className="text-[13px] font-bold tracking-widest text-gray-400 flex items-center gap-2"><Globe size={16}/> GLOBALHUB</span>
            <span className="text-[13px] font-bold tracking-widest text-gray-400 flex items-center gap-2"><Fingerprint size={16}/> LEXICON</span>
            <span className="text-[13px] font-bold tracking-widest text-gray-400 flex items-center gap-2"><Hexagon size={16}/> UNIFY AI</span>
            <span className="text-[13px] font-bold tracking-widest text-gray-400 flex items-center gap-2"><Speaker size={16}/> NEUROVOICE</span>
            <span className="text-[13px] font-bold tracking-widest text-gray-400 flex items-center gap-2"><Command size={16}/> STRATO</span>
        </div>

        {/* Footer Bottom Bar */}
        <div className="w-full max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-gray-800/50">
            <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                <Copyright size={14} /> 2026 QuickVoice AI. All rights reserved.
            </div>
            
            <div className="flex items-center gap-6 text-[12px] text-gray-400">
                <Link href="#" className="hover:text-white transition-colors">Legal</Link>
                <Link href="#" className="hover:text-white transition-colors">Privacy Center</Link>
                <Link href="#" className="hover:text-white transition-colors">Cookie Policy</Link>
                <Link href="#" className="hover:text-white transition-colors">About Ads</Link>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full border border-gray-700 flex items-center justify-center hover:bg-gray-800 cursor-pointer transition-colors text-gray-400 hover:text-white">
                    <Globe size={14} />
                </div>
                <div className="w-8 h-8 rounded-full border border-gray-700 flex items-center justify-center hover:bg-gray-800 cursor-pointer transition-colors text-gray-400 hover:text-white">
                    <Speaker size={14} />
                </div>
            </div>
        </div>
      </footer>

    </div>
  );
}
