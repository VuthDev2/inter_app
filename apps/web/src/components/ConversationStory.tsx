"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform, type MotionStyle } from "framer-motion";
import { ArrowDown, MessageCircle, Play, Volume2 } from "lucide-react";
import { FeatureStepDemo } from "./FeatureStepDemo";

/**
 * Speak the Japanese line on the last step.
 *
 * The step is called "Speaking Japanese" and until now nothing spoke, which
 * made the one claim on this page you could actually check the one thing it
 * did not do.
 *
 * The clip is a file, not a live call. It was generated once by the real
 * QuickVoice voice and committed, so this is genuinely what the app sounds
 * like -- and it plays for anyone reading the page, whether or not a model
 * server happens to be running. Calling /tts live meant the button worked on
 * the machine hosting QuickVoice and nowhere else, which is exactly backwards
 * for a page whose job is to show visitors what it does.
 *
 * Regenerate with the text below if the line or the voice ever changes.
 */
const JAPANESE_LINE = "駅はどこですか？";
const JAPANESE_CLIP = "/audio/station-ja.mp3";

function SpeakTranslation() {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function play() {
    const audio = audioRef.current ?? new Audio(JAPANESE_CLIP);
    audioRef.current = audio;
    if (playing) {
      audio.pause();
      audio.currentTime = 0;
      setPlaying(false);
      return;
    }
    audio.currentTime = 0;
    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
    void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }

  return (
    <button
      type="button"
      onClick={play}
      aria-label={`Play the Japanese translation: ${JAPANESE_LINE}`}
      className="mt-4 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/15 px-4 py-2 text-[13px] font-semibold text-blue-200 transition-colors hover:bg-blue-500/25"
    >
      {playing ? <Volume2 size={15} className="animate-pulse" /> : <Play size={15} />}
      {playing ? "Speaking…" : "Hear it in Japanese"}
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
  // A spring between the wheel and the slide. Driving the transform straight
  // off scroll made every notch of a trackpad a separate little movement, so
  // the panel twitched its way between steps instead of travelling. The spring
  // keeps the scroll in charge of where it ends up and takes the jitter out of
  // how it gets there.
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.35, restDelta: 0.0005 });
  // Three short transitions separated by long reading holds. Native scrolling
  // owns the timeline, so reversing or leaving never requires a trapped gesture.
  const panelY = useTransform(smoothProgress, [0, .18, .26, .44, .52, .70, .78, 1], ["0%", "0%", "-100%", "-100%", "-200%", "-200%", "-300%", "-300%"]);
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
      .story-stage { padding: 64px 24px; --story-height: 520px; }
      .story-window { height: var(--story-height); overflow: hidden; }
      .story-panel { height: var(--story-height); }
      .story-track { transform: translateY(calc(var(--step) * -100%)) !important; height: var(--story-height); }
      @media (min-width: 1024px) and (min-height: 740px) and (prefers-reduced-motion: no-preference) {
        .conversation-story { height: 380svh; }
        /* The stage is exactly one screen and hides its overflow, so the panel
           has to leave room for the heading and the progress bar above and
           below it -- about 200px of them. Sizing it off svh alone meant that
           at 740-800px tall the content needed more room than the stage had,
           and centring pushed "Real-time voice translation" off the top where
           overflow:hidden cut it away. */
        .story-stage { position: sticky; top: 0; height: 100svh; padding: 24px 32px; --story-height: clamp(400px, calc(100svh - 216px), 680px); display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
        .story-track { transform: none; }
        #conversation-preview { height: var(--story-height); }
        .story-track[style] { transform: var(--scroll-transform) !important; }
      }
      @media (min-width: 1024px) {
        .story-demo > div { height: clamp(240px, 32svh, 340px); }
      }
      @media (max-width: 480px) {
        .story-stage { padding: 40px 16px; }
        .story-window, .story-panel, .story-track { height: 490px; }
      }
    `}</style>
    <div className="story-stage">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-5xl">
            <p className="text-xs font-semibold uppercase tracking-[.24em] text-blue-400">Real-time voice translation</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl xl:text-[44px]">Four steps. One natural conversation.</h2>
          </div>
          <p className="flex items-center gap-2 text-xs text-gray-400"><ArrowDown size={14}/>Scroll to follow the conversation</p>
        </div>
        <div className="grid overflow-hidden rounded-[28px] border border-white/10 bg-[#0b101a] lg:grid-cols-2">
          <div className="story-window relative border-b border-white/10 lg:border-b-0 lg:border-r">
            <motion.div className="story-track" style={{ "--step": active, "--scroll-transform": scrollTransform } as MotionStyle}>
              {steps.map((step, index) => <article key={step.visual} className="story-panel flex flex-col justify-between gap-6 p-6 sm:p-8 xl:p-10" aria-hidden={index !== active}>
                <div><p className="text-xs font-semibold tracking-[.2em] text-blue-400">0{index + 1} / 04</p><h3 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{step.title}</h3><p className="mt-3 max-w-xl text-base leading-7 text-gray-300 xl:text-lg">{step.description}</p></div>
                <div className="story-demo"><FeatureStepDemo feature={step.visual} active={index === active && !reducedMotion}/></div>
              </article>)}
            </motion.div>
          </div>
          <div id="conversation-preview" className="relative flex min-h-[500px] flex-col justify-between overflow-hidden bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,.16),transparent_70%)] p-6 sm:p-8 xl:p-10">
            <div><p className="text-xs uppercase tracking-[.2em] text-blue-300">See it in conversation</p><h3 className="mt-3 max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">Your conversation, translated live.</h3></div>
            <div className="my-4 space-y-3" aria-live="polite">
              <div className="flex items-center gap-2 text-xs text-blue-300"><MessageCircle size={15}/>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={steps[active].status} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}>{steps[active].status}</motion.span>
                </AnimatePresence>
              </div>
              <div className="w-[94%] rounded-2xl rounded-bl-sm border border-blue-400/20 bg-[#142035] p-4"><p className="mb-3 text-xs uppercase tracking-widest text-blue-300">{"English · Speaker"}</p><p className="text-xl leading-8 xl:text-2xl">{steps[active].original}</p></div>
              {/* The reply is the line that actually changes between steps, so it
                  is the one that gets the transition -- a hard swap read as a
                  glitch rather than as an answer arriving. */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: .26, ease: [.22, .61, .36, 1] }}
                  className="ml-auto w-[94%] rounded-2xl rounded-br-sm border border-white/10 bg-white/[.04] p-4"
                >
                  <p className="mb-3 text-xs uppercase tracking-widest text-gray-400">{active < 2 ? "QuickVoice" : "Japanese · Translation"}</p>
                  <p className={active < 2 ? "min-h-8 text-base leading-8 text-gray-300" : "min-h-8 text-xl leading-8 text-white xl:text-2xl"}>{steps[active].translation}</p>
                  {/* Reserve playback space in every step so the container never grows. */}
                  <div className="h-14">{active === 3 && <SpeakTranslation/>}</div>
                </motion.div>
              </AnimatePresence>
            </div>
            <p className="text-sm text-gray-400">English ↔ Japanese</p>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3" aria-label="Conversation steps">
          {steps.map((step, index) => <button key={step.visual} onClick={() => goToStep(index)} aria-label={`Step ${index + 1}: ${step.title}`} aria-pressed={active === index} className="group flex h-10 flex-1 items-center gap-2 rounded-lg px-1 focus-visible:outline-2 focus-visible:outline-blue-400"><span className={`text-xs ${active === index ? "text-blue-300" : "text-gray-500"}`}>0{index + 1}</span><span className={`h-1 flex-1 rounded-full transition-colors ${active === index ? "bg-blue-400" : "bg-white/10 group-hover:bg-white/25"}`}/></button>)}
        </div>
      </div>
    </div>
  </section>;
}
