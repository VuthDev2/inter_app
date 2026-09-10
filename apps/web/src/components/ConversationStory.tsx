"use client";

import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionStyle } from "framer-motion";
import { ArrowDown, Loader2, MessageCircle, Play, Volume2 } from "lucide-react";
import { FeatureStepDemo } from "./FeatureStepDemo";
import { speakWithQuickVoice } from "@/lib/quickvoice-api";

/**
 * Speak the Japanese line on the last step.
 *
 * The step is called "Speaking Japanese" and until now nothing spoke, which
 * made the one claim on this page you could actually check the one thing it
 * did not do.
 *
 * It uses the real thing first -- the same /tts the app uses, through a
 * short-lived token the site mints server-side -- and falls back to the
 * browser's own Japanese voice when that is not reachable. A visitor reading
 * this page usually has no QuickVoice server running, and a dead button would
 * be worse than a plainer voice.
 */
function SpeakTranslation({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");

  async function speakInBrowser() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    const japanese = synth.getVoices().find((voice) => voice.lang.startsWith("ja"));
    if (japanese) utterance.voice = japanese;
    await new Promise<void>((resolve) => {
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      synth.speak(utterance);
    });
  }

  async function play() {
    if (state !== "idle") return;
    setState("loading");
    try {
      await speakWithQuickVoice(text, "ja");
      setState("playing");
      // The helper resolves when playback starts, not when it ends; this is
      // just long enough for the button to read as busy while a short line
      // plays.
      window.setTimeout(() => setState("idle"), 2200);
    } catch {
      setState("playing");
      await speakInBrowser();
      setState("idle");
    }
  }

  return (
    <button
      type="button"
      onClick={() => void play()}
      disabled={state !== "idle"}
      aria-label={`Play the Japanese translation: ${text}`}
      className="mt-4 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/15 px-4 py-2 text-[13px] font-semibold text-blue-200 transition-colors hover:bg-blue-500/25 disabled:opacity-70"
    >
      {state === "loading" ? (
        <Loader2 size={15} className="animate-spin" />
      ) : state === "playing" ? (
        <Volume2 size={15} />
      ) : (
        <Play size={15} />
      )}
      {state === "loading" ? "Preparing…" : state === "playing" ? "Speaking…" : "Hear it in Japanese"}
    </button>
  );
}

const steps = [
  { title: "Speak naturally.", description: "Start with your own words. QuickVoice captures your voice as you speak.", visual: "speak", status: "Listening to English", original: "Where is the train station?", translation: "Your words appear here as you speak." },
  { title: "Keep the meaning.", description: "Pronunciation and context help QuickVoice understand what you mean.", visual: "understand", status: "Understanding the conversation", original: "Where is the train station?", translation: "Understanding your words in context…" },
  { title: "Cross the language barrier.", description: "Your English becomes Japanese, ready for the other person to understand.", visual: "translate", status: "Translated into Japanese", original: "Where is the train station?", translation: "駅はどこですか？" },
  { title: "Let the conversation flow.", description: "Hear the translation spoken aloud, then reply naturally in your own language.", visual: "respond", status: "Speaking Japanese", original: "Where is the train station?", translation: "駅はどこですか？" },
] as const;

export default function ConversationStory() {
  const section = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  // Three short transitions separated by long reading holds. Native scrolling
  // owns the timeline, so reversing or leaving never requires a trapped gesture.
  const panelY = useTransform(scrollYProgress, [0, .18, .26, .44, .52, .70, .78, 1], ["0%", "0%", "-100%", "-100%", "-200%", "-200%", "-300%", "-300%"]);
  const scrollTransform = useTransform(panelY, value => `translateY(${value})`);
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (!window.matchMedia("(min-width: 1024px) and (min-height: 740px)").matches || reducedMotion) return;
    setActive(value < .22 ? 0 : value < .48 ? 1 : value < .74 ? 2 : 3);
  });

  function goToStep(index: number) {
    const el = section.current;
    if (!el) return;
    if (!window.matchMedia("(min-width: 1024px) and (min-height: 740px)").matches || reducedMotion) {
      setActive(index);
      return;
    }
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + (el.offsetHeight - window.innerHeight) * [0, .32, .58, .86][index], behavior: "smooth" });
  }

  return <section id="featuring" ref={section} className="conversation-story relative order-2 w-full bg-[#06080d]" aria-label="How QuickVoice works">
    <style>{`
      .story-stage { padding: 64px 24px; }
      .story-window { height: 470px; overflow: hidden; }
      .story-panel { height: 470px; }
      .story-track { transform: translateY(calc(var(--step) * -100%)) !important; height: 470px; }
      @media (min-width: 1024px) and (min-height: 740px) and (prefers-reduced-motion: no-preference) {
        .conversation-story { height: 380svh; }
        .story-stage { position: sticky; top: 0; height: 100svh; padding: 56px 40px 32px; display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
        .story-track { transform: none; }
        .story-track[style] { transform: var(--scroll-transform) !important; }
      }
      @media (max-width: 480px) {
        .story-stage { padding: 40px 16px; }
        .story-window, .story-panel, .story-track { height: 490px; }
      }
    `}</style>
    <div className="story-stage">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-blue-400">Real-time voice translation</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl xl:text-5xl">Four steps. One natural conversation.</h2>
          </div>
          <p className="flex items-center gap-2 text-xs text-gray-400"><ArrowDown size={14}/>Scroll to follow the conversation</p>
        </div>
        <div className="grid overflow-hidden rounded-[28px] border border-white/10 bg-[#0b101a] lg:grid-cols-2">
          <div className="story-window relative border-b border-white/10 lg:border-b-0 lg:border-r">
            <motion.div className="story-track" style={{ "--step": active, "--scroll-transform": scrollTransform } as MotionStyle}>
              {steps.map((step, index) => <article key={step.visual} className="story-panel flex flex-col justify-between p-6 sm:p-8" aria-hidden={index !== active}>
                <div><p className="text-xs font-semibold tracking-[.2em] text-blue-400">0{index + 1} / 04</p><h3 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{step.title}</h3><p className="mt-3 max-w-md text-sm leading-6 text-gray-400">{step.description}</p></div>
                <FeatureStepDemo feature={step.visual} active={index === active && !reducedMotion}/>
              </article>)}
            </motion.div>
          </div>
          <div id="conversation-preview" className="relative flex min-h-[420px] flex-col justify-between overflow-hidden bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,.16),transparent_70%)] p-6 sm:p-8">
            <div><p className="text-[10px] uppercase tracking-[.2em] text-blue-300">See it in conversation</p><h3 className="mt-3 max-w-sm text-2xl font-semibold tracking-tight sm:text-3xl">You speak naturally. QuickVoice handles the rest.</h3></div>
            <div className="my-6 space-y-4" aria-live="polite">
              <div className="flex items-center gap-2 text-xs text-blue-300"><MessageCircle size={15}/>{steps[active].status}</div>
              <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-blue-400/20 bg-[#142035] p-5"><p className="mb-3 text-[10px] uppercase tracking-widest text-blue-300">{"English · Speaker"}</p><p className="text-lg">{steps[active].original}</p></div>
              <div className="ml-auto max-w-[92%] rounded-2xl rounded-br-sm border border-white/10 bg-white/[.04] p-5"><p className="mb-3 text-[10px] uppercase tracking-widest text-gray-400">{active < 2 ? "QuickVoice" : "Japanese · Translation"}</p><p className={active < 2 ? "text-sm text-gray-400" : "text-lg text-white"}>{steps[active].translation}</p>{active === 3 && <SpeakTranslation text={steps[3].translation}/>}</div>
            </div>
            <p className="text-xs text-gray-500">English ↔ Japanese</p>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3" aria-label="Conversation steps">
          {steps.map((step, index) => <button key={step.visual} onClick={() => goToStep(index)} aria-label={`Step ${index + 1}: ${step.title}`} aria-pressed={active === index} className="group flex h-10 flex-1 items-center gap-2 rounded-lg px-1 focus-visible:outline-2 focus-visible:outline-blue-400"><span className={`text-[10px] ${active === index ? "text-blue-300" : "text-gray-500"}`}>0{index + 1}</span><span className={`h-1 flex-1 rounded-full transition-colors ${active === index ? "bg-blue-400" : "bg-white/10 group-hover:bg-white/25"}`}/></button>)}
        </div>
      </div>
    </div>
  </section>;
}
