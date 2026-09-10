"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Shield, Sparkles, Zap, Copyright, Globe, Languages, Menu, X } from "lucide-react";
import ConversationStory from "@/components/ConversationStory";

const PRODUCT_FEATURES = [
  {
    id: 1,
    title1: "One-Way Live",
    title2: "Interpretation",
    description: "Perfect for speeches, lectures, and broadcasts. Our AI captures nuances in the speaker's tone and delivers crisp, translated audio to thousands of listeners simultaneously.",
    image: "/feature1.png",
    imageWidth: 2586,
    imageHeight: 1954,
    dotColor: "bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]",
  },
  {
    id: 2,
    title1: "Three Ways",
    title2: "to Translate",
    description: "Switch seamlessly between one-way broadcasts, two-way live conversations, or upload pre-recorded audio for instant, accurate translations tailored to any scenario.",
    image: "/feature2.png",
    imageWidth: 1586,
    imageHeight: 828,
    dotColor: "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]",
  },
  {
    id: 3,
    title1: "Smart Recording",
    title2: "Organization",
    description: "Keep your workspace clutter-free. Easily organize your translated audio, transcripts, and projects into custom folders for quick access and seamless team collaboration.",
    image: "/feature3.png",
    imageWidth: 1190,
    imageHeight: 709,
    dotColor: "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]",
  },
] as const;

/**
 * Two kinds of destination, deliberately separated by a divider in the nav.
 * Section links scroll within this page; product links leave it. Mixing them
 * without a visual break made every item look like it scrolled.
 */
const SECTION_LINKS = [
  { label: "How it works", hash: "#featuring" },
  { label: "Why QuickVoice", hash: "#features" },
] as const;

const MAN_CONVERSATION_FRAMES = [
  "/hero-conversation-people.png",
  "/hero-conversation-frames/man/listening.png",
  "/hero-conversation-frames/man/speaking-start.png",
  "/hero-conversation-frames/man/speaking-emphasis.png",
  "/hero-conversation-frames/man/reacting.png",
] as const;

const WOMAN_CONVERSATION_FRAMES = [
  "/hero-conversation-english.png",
  "/hero-conversation-frames/woman/listening.png",
  "/hero-conversation-frames/woman/speaking-start.png",
  "/hero-conversation-frames/woman/speaking-emphasis.png",
  "/hero-conversation-frames/woman/reacting.png",
] as const;

export default function LandingPage() {
  const [activeProductFeature, setActiveProductFeature] = useState(0);
  const [activeNav, setActiveNav] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const [heroVisible, setHeroVisible] = useState(true);
  const [isScrolling, setIsScrolling] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const scrollingRef = useRef(false);
  const scrollEndTimer = useRef<number | null>(null);
  useEffect(() => {
    [...MAN_CONVERSATION_FRAMES.slice(1), ...WOMAN_CONVERSATION_FRAMES.slice(1)].forEach((src) => {
      const frame = new window.Image();
      frame.decoding = "async";
      frame.src = src;
      void frame.decode().catch(() => undefined);
    });
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveProductFeature((current) => (current + 1) % PRODUCT_FEATURES.length);
    }, 6000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const syncActiveNav = () => {
      const section = window.location.hash.slice(1);
      if (section) setActiveNav(section);
    };

    syncActiveNav();
    window.addEventListener("hashchange", syncActiveNav);
    return () => window.removeEventListener("hashchange", syncActiveNav);
  }, []);

  useEffect(() => {
    let frame = 0;
    const updateNavigation = () => {
      const currentY = Math.max(window.scrollY, 0);
      const difference = currentY - lastScrollY.current;
      setIsAtTop(currentY < 28);

      if (currentY < 96 || menuOpen) {
        setNavVisible(true);
      } else if (difference > 6) {
        setNavVisible(false);
        setMenuOpen(false);
      } else if (difference < -6) {
        setNavVisible(true);
      }

      lastScrollY.current = currentY;
    };
    const onScroll = () => {
      if (!scrollingRef.current) {
        scrollingRef.current = true;
        setIsScrolling(true);
      }
      if (scrollEndTimer.current) window.clearTimeout(scrollEndTimer.current);
      scrollEndTimer.current = window.setTimeout(() => {
        scrollingRef.current = false;
        setIsScrolling(false);
      }, 140);

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateNavigation);
    };

    updateNavigation();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      if (scrollEndTimer.current) window.clearTimeout(scrollEndTimer.current);
      window.removeEventListener("scroll", onScroll);
    };
  }, [menuOpen]);

  useEffect(() => {
    const previousBodyBackground = document.body.style.backgroundColor;
    const previousHtmlBackground = document.documentElement.style.backgroundColor;
    const previousOverscroll = document.body.style.overscrollBehaviorY;

    document.body.style.backgroundColor = "#05050a";
    document.documentElement.style.backgroundColor = "#05050a";
    document.body.style.overscrollBehaviorY = "none";

    return () => {
      document.body.style.backgroundColor = previousBodyBackground;
      document.documentElement.style.backgroundColor = previousHtmlBackground;
      document.body.style.overscrollBehaviorY = previousOverscroll;
    };
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting));
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#05050A] text-white font-sans selection:bg-blue-500/30">
      
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
        @keyframes hero-rise {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes hero-glow {
          0%, 100% { opacity: .55; transform: scale(.94); }
          50% { opacity: .9; transform: scale(1.06); }
        }
        .hero-rise { animation: hero-rise .9s cubic-bezier(.22,1,.36,1) both; }
        .hero-rise-delay-1 { animation-delay: .12s; }
        .hero-rise-delay-2 { animation-delay: .24s; }
        .hero-rise-delay-3 { animation-delay: .36s; }
        .hero-glow { animation: hero-glow 7s ease-in-out infinite; }
        @keyframes how-card-progress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        .how-card-progress {
          animation: how-card-progress 6.5s linear both;
          transform-origin: left;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-wave, .animate-wave-slow, .animate-float-pop, .hero-rise, .hero-glow, .how-card-progress {
            animation: none !important;
          }
        }
      `}} />

      {/* --- HERO SECTION --- */}
      <div ref={heroRef} className="relative order-1 w-full min-h-screen flex flex-col items-center">
        
        {/* Animated Wave Background SVG & Ambient Light */}
        <div className="absolute inset-0 overflow-hidden [contain:paint] pointer-events-none z-0">
          <div className="absolute top-0 right-0 h-[72%] w-[62%] bg-[radial-gradient(circle,rgba(59,130,246,.12),transparent_68%)]"></div>
          <div className="absolute bottom-0 left-0 h-[56%] w-[48%] bg-[radial-gradient(circle,rgba(37,99,235,.10),transparent_70%)]"></div>
          
          <div className="absolute top-[20%] left-0 right-0 h-[800px] w-[200%] opacity-50">
            {/* Low-cost background wave */}
            <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className={`absolute w-full h-full animate-wave-slow stroke-blue-700 fill-none opacity-60 ${heroVisible && !isScrolling ? "" : "[animation-play-state:paused]"}`} strokeWidth="1.5" style={{marginTop: '20px'}}>
              <path d="M0,150 C280,250 380,50 720,150 C1060,250 1160,50 1440,150 C1760,250 1860,50 2160,150 C2460,250 2560,50 2880,150" />
              <path d="M0,170 C310,20 410,320 720,170 C1030,20 1130,320 1440,170 C1750,20 1850,320 2160,170 C2460,20 2560,320 2880,170" />
            </svg>
            {/* Foreground wave */}
            <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className={`absolute w-full h-full animate-wave stroke-blue-400 fill-none opacity-90 ${heroVisible && !isScrolling ? "" : "[animation-play-state:paused]"}`} strokeWidth="3" style={{marginTop: '60px'}}>
              <path d="M0,140 C250,50 350,280 720,140 C1090,50 1190,280 1440,140 C1790,50 1890,280 2160,140 C2510,50 2610,280 2880,140" />
            </svg>
          </div>
        </div>

        {/* Hero-only people. They belong to section one and scroll away with it. */}
        <div className="pointer-events-none absolute inset-0 z-10 hidden overflow-hidden lg:block" aria-hidden="true">
          <Image
            src={MAN_CONVERSATION_FRAMES[0]}
            alt=""
            width={1672}
            height={941}
            priority
            sizes="100vw"
            style={{ clipPath: "inset(0 50% 0 0)", transform: "translateX(-50%) scaleX(1.04)" }}
            className="absolute -bottom-[12%] left-[46.5%] h-auto w-[98%] max-w-none select-none object-contain object-bottom"
          />
          <Image
            src={MAN_CONVERSATION_FRAMES[0]}
            alt=""
            width={1672}
            height={941}
            priority
            sizes="100vw"
            style={{ clipPath: "inset(0 0 0 50%)", transform: "translateX(-50%) scaleX(1.02)" }}
            className="absolute -bottom-[10%] left-[53.5%] h-auto w-[92%] max-w-none select-none object-contain object-bottom"
          />
        </div>

        {/* Top Floating Navbar */}
        <div className={`fixed top-0 left-0 right-0 w-full flex justify-center pt-5 md:pt-6 z-50 px-6 transition-transform duration-500 ease-out transform-gpu [backface-visibility:hidden] ${navVisible ? "translate-y-0" : "-translate-y-[130%]"}`}>
          <nav className={`w-full max-w-[1200px] px-4 md:px-6 py-4 flex items-center justify-between gap-2 rounded-full border transition-all duration-500 ${
            isAtTop
              ? "bg-transparent border-transparent shadow-none"
              : "bg-black/80 backdrop-blur-md border-white/[0.09] shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
          }`}>
            <Link href="/landing" className="flex items-center gap-2 md:gap-3 pl-1 md:pl-3 pr-1 md:pr-4 min-w-0 shrink">
              <Image src="/logo-d.png" alt="QuickVoice Logo" width={122} height={122} priority className="h-7 w-7 shrink-0" />
              <span className="text-base md:text-lg font-bold italic tracking-tight text-white truncate">
                Quick<span className="text-blue-500">Voice</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8 text-[13px] font-medium text-gray-300">
              {SECTION_LINKS.map(({ label, hash }) => (
                <Link
                  key={hash}
                  href={hash}
                  onClick={() => setActiveNav(hash.slice(1))}
                  className={`pb-1 border-b-2 transition-colors ${activeNav === hash.slice(1) ? "border-blue-500 text-white" : "border-transparent hover:text-white"}`}
                >
                  {label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2 md:gap-3 text-[14px] font-semibold pr-0 md:pr-1 shrink-0">
              <button
                type="button"
                aria-expanded={menuOpen}
                aria-controls="landing-mobile-nav"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                onClick={() => setMenuOpen((open) => !open)}
                className="md:hidden p-2 -ml-1 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <Link href="/signup" className="hidden sm:inline-block px-5 py-2 rounded-full text-gray-400 hover:text-white transition-all">
                Sign Up
              </Link>
              <Link href="/login" className="px-4 md:px-6 py-2 md:py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-[0_0_20px_rgba(0,195,255,0.4)]">
                Login
              </Link>
            </div>
          </nav>
        </div>

        {/* Mobile navigation. Without this the links were hidden behind
            `md:` breakpoints and phone visitors saw only the logo. */}
        {menuOpen && (
          <div className={`md:hidden fixed top-[92px] left-0 right-0 w-full flex justify-center px-6 z-50 transition-all duration-300 ${navVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}>
            <div
              id="landing-mobile-nav"
              className="w-full max-w-[1200px] rounded-3xl border border-white/[0.08] bg-black/80 backdrop-blur px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
            >
              {SECTION_LINKS.map(({ label, hash }) => (
                <Link
                  key={hash}
                  href={hash}
                  onClick={() => { setActiveNav(hash.slice(1)); setMenuOpen(false); }}
                  className="block px-3 py-2.5 rounded-xl text-[15px] text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  {label}
                </Link>
              ))}
              <Link
                href="/signup"
                onClick={() => setMenuOpen(false)}
                className="sm:hidden mt-2 block px-3 py-2.5 rounded-xl text-[15px] font-semibold text-white bg-white/[0.08] hover:bg-white/[0.14] text-center transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}

        {/* Hero Content */}
        <div className="relative z-20 flex w-full flex-1 items-center justify-center overflow-hidden px-6 pb-10 pt-36 md:pb-14 md:pt-44">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[min(850px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/[0.13] blur-[110px] hero-glow" />

          <div className="relative z-[2] mx-auto flex max-w-4xl translate-y-3 flex-col items-center text-center md:translate-y-8">
            <div className="hero-rise inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/[0.08] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-300 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-400" />
              </span>
              English ↔ Japanese, naturally
            </div>

            <h1 className="hero-rise hero-rise-delay-1 mt-6 text-balance text-[clamp(2.75rem,5.7vw,5.75rem)] font-semibold leading-[0.96] tracking-[-0.058em] text-white drop-shadow-[0_8px_35px_rgba(0,0,0,.72)]">
              Every conversation,
              <span className="mt-2 block bg-gradient-to-r from-blue-300 via-blue-500 to-cyan-300 bg-clip-text pb-2 text-transparent">
                understood instantly.
              </span>
            </h1>

            <p className="hero-rise hero-rise-delay-2 mt-6 max-w-xl text-balance text-base leading-7 text-gray-300 drop-shadow-[0_3px_15px_rgba(0,0,0,.9)] md:text-lg md:leading-8">
              Speak naturally in English or Japanese. QuickVoice listens, translates, and responds with a clear voice—so the conversation never loses its flow.
            </p>

            <div className="hero-rise hero-rise-delay-3 mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
              <Link href="/signup" className="group flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-8 py-4 text-[15px] font-semibold text-white shadow-[0_12px_45px_rgba(37,99,235,.38)] transition-all duration-300 hover:-translate-y-1 hover:bg-blue-500 hover:shadow-[0_18px_55px_rgba(37,99,235,.52)] sm:w-auto">
                Start translating
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
              <Link href="#featuring" className="flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.045] px-8 py-4 text-[15px] font-semibold text-gray-200 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.09] sm:w-auto">
                See how it works
              </Link>
            </div>

            <div className="hero-rise hero-rise-delay-3 mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-500">
              <span>Private local AI</span><span className="hidden h-1 w-1 rounded-full bg-gray-700 sm:block"/><span>Real-time speech</span><span className="hidden h-1 w-1 rounded-full bg-gray-700 sm:block"/><span>Natural voice playback</span>
            </div>
          </div>
        </div>
      </div>

      <ConversationStory />

      {/* --- ORIGINAL PRODUCT FEATURE SHOWCASE --- */}
      <section id="product-showcase" className="relative z-10 order-4 flex w-full flex-col items-center overflow-hidden px-6 py-28 md:py-32">
        <div className="w-full max-w-6xl">
          <div className="max-w-2xl mx-auto mb-14 md:mb-16 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-400">
              Ways to Use QuickVoice
            </p>
            <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.035em] text-white">
              Talk, listen, or save it for later.
            </h2>
            <p className="mt-5 text-base md:text-lg leading-8 text-gray-400">
              Use QuickVoice for a speech, a real conversation, or a recording you want to translate when you have time.
            </p>
          </div>

          <div className="w-full overflow-hidden relative rounded-[2.5rem]">
            <div
              className="flex transition-transform duration-700 ease-in-out items-stretch"
              style={{ transform: `translateX(-${activeProductFeature * 100}%)` }}
            >
              {PRODUCT_FEATURES.map((feature) => (
                <div key={feature.id} className="w-full shrink-0 flex">
                  <div className="w-full min-h-[420px] bg-[#18181b]/80 border border-white/5 rounded-[2.25rem] p-9 md:p-11 lg:p-12 flex flex-col lg:flex-row items-center justify-between gap-10">
                    <div className="w-full lg:w-1/2 flex flex-col items-start justify-center">
                      <h3 className="text-3xl lg:text-4xl font-bold text-white leading-[1.15] mb-3 tracking-tight">
                        {feature.title1}<br />{feature.title2}
                      </h3>
                      <p className="text-[#a1a1aa] text-[17px] leading-relaxed max-w-md font-medium">
                        {feature.description}
                      </p>
                    </div>

                    <div className="w-full lg:w-[45%] flex justify-end">
                      <div className="w-full rounded-[2rem] overflow-hidden shadow-2xl border border-white/5">
                        <Image
                          src={feature.image}
                          alt={`${feature.title1} ${feature.title2}`}
                          width={feature.imageWidth}
                          height={feature.imageHeight}
                          sizes="(min-width: 1024px) 500px, 90vw"
                          className="w-full h-auto max-h-[280px] object-cover"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-3 mt-8">
            {PRODUCT_FEATURES.map((feature, index) => (
              <button
                key={feature.id}
                type="button"
                aria-label={`Show ${feature.title1} ${feature.title2}`}
                onClick={() => setActiveProductFeature(index)}
                className={`h-2.5 rounded-full cursor-pointer transition-all duration-300 ${
                  activeProductFeature === index
                    ? `${feature.dotColor} w-6`
                    : "bg-gray-700 hover:bg-gray-500 w-2.5"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* --- THE EDGE SECTION --- */}
      <div id="features" className="relative z-10 order-5 flex w-full flex-col items-center bg-[#070b14] py-24">
        <h2 className="text-3xl font-bold mb-4 tracking-wide">The Edge</h2>
        <p className="text-[14px] text-gray-400 mb-20 font-medium">The next generation of human connection.</p>
        
        <div className="w-full max-w-7xl px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-[#0b1221] border border-gray-800/80 rounded-[2rem] p-8 hover:border-gray-700 transition-colors">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mb-6">
                    <Shield size={18} className="text-purple-400" />
                </div>
                <h3 className="text-[16px] font-semibold mb-4">Privacy-First</h3>
                <p className="text-[14px] text-gray-400 leading-relaxed">
                    Secure on-device processing ensures your conversations never leave your hardware. Enterprise grade encryption for total peace of mind.
                </p>
            </div>

            {/* Card 2 */}
            <div className="bg-[#0b1221] border border-gray-800/80 rounded-[2rem] p-8 hover:border-gray-700 transition-colors">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center mb-6">
                    <Sparkles size={18} className="text-cyan-400" />
                </div>
                <h3 className="text-[16px] font-semibold mb-4">Neural Clarity</h3>
                <p className="text-[14px] text-gray-400 leading-relaxed">
                    HD audio reconstruction technology restores vocal nuances and removes background noise for crystal-clear communication.
                </p>
            </div>

            {/* Card 3 */}
            <div className="bg-[#0b1221] border border-gray-800/80 rounded-[2rem] p-8 hover:border-gray-700 transition-colors">
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
      <footer id="more" className="relative z-10 order-6 w-full border-t border-white/[0.08] bg-[#04070d]">
        <div className="w-full max-w-7xl mx-auto px-6 pt-10 pb-6">
          <div className="grid grid-cols-3 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-x-5 sm:gap-x-10 gap-y-8 pb-8">
            <div className="col-span-3 lg:col-span-1 max-w-sm">
              <Link href="/landing" className="inline-flex items-center gap-3">
                <Image src="/logo-d.png" alt="QuickVoice Logo" width={122} height={122} className="h-10 w-10" />
                <span className="text-xl font-bold italic tracking-tight text-white">
                  Quick<span className="text-blue-500">Voice</span>
                </span>
              </Link>
              <p className="mt-5 text-sm leading-6 text-gray-500">
                Real-time English and Japanese voice interpretation for natural conversations without language barriers.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-2" aria-label="QuickVoice mobile app availability">
                {/* Official store artwork must remain unmodified and is served by each platform. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                  alt="Download QuickVoice on the App Store"
                  loading="lazy"
                  decoding="async"
                  className="h-10 w-auto"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                  alt="Get QuickVoice on Google Play"
                  loading="lazy"
                  decoding="async"
                  className="h-[58px] w-auto"
                />
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-gray-300">Product</h3>
              <nav className="flex flex-col items-start gap-3.5 text-sm text-gray-500">
                <Link href="#features" className="hover:text-white transition-colors">Live Interpreter</Link>
                <Link href="#featuring" className="hover:text-white transition-colors">Features</Link>
                <Link href="/prerecord" className="hover:text-white transition-colors">Voice Record</Link>
                <Link href="/history" className="hover:text-white transition-colors">History</Link>
              </nav>
            </div>

            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-gray-300">Account</h3>
              <nav className="flex flex-col items-start gap-3.5 text-sm text-gray-500">
                <Link href="/login" className="hover:text-white transition-colors">Log in</Link>
                <Link href="/signup" className="hover:text-white transition-colors">Sign up</Link>
                <Link href="/forgotpassword" className="hover:text-white transition-colors">Reset password</Link>
                <Link href="/setting" className="hover:text-white transition-colors">Settings</Link>
              </nav>
            </div>

            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-gray-300">Languages</h3>
              <div className="flex flex-col items-start gap-3.5 text-sm text-gray-500">
                <span className="inline-flex items-center gap-2"><Globe size={14} className="text-blue-500" /> English</span>
                <span className="inline-flex items-center gap-2"><Languages size={14} className="text-blue-500" /> 日本語</span>
                <span className="inline-flex items-center gap-2"><Shield size={14} className="text-blue-500" /> Privacy focused</span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.08] pt-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <Copyright size={13} /> 2026 QuickVoice. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <Link href="#" className="hover:text-gray-300 transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-gray-300 transition-colors">Terms</Link>
              <Link href="#" className="hover:text-gray-300 transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
