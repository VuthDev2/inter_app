"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Mic, Sparkles, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

const SPOKEN_TEXT = "Where is the train station?";
const TRANSLATED_TEXT = "駅はどこですか？";

type LiveInterpreterDemoProps = {
  className?: string;
  compact?: boolean;
};

export function LiveInterpreterDemo({ className = "", compact = false }: LiveInterpreterDemoProps) {
  const [cycle, setCycle] = useState(0);
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [translation, setTranslation] = useState("");

  useEffect(() => {
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    timers.push(setTimeout(() => {
      setListening(false);
      setProcessing(false);
      setSpeaking(false);
      setTranscript("");
      setTranslation("");
    }, 0));

    timers.push(setTimeout(() => setListening(true), 2550));

    SPOKEN_TEXT.split("").forEach((_, index) => {
      timers.push(setTimeout(() => {
        setTranscript(SPOKEN_TEXT.slice(0, index + 1));
      }, 3250 + index * 58));
    });

    timers.push(setTimeout(() => {
      setListening(false);
      setProcessing(true);
    }, 5400));
    timers.push(setTimeout(() => {
      setProcessing(false);
      setTranslation(TRANSLATED_TEXT);
    }, 6900));
    timers.push(setTimeout(() => setSpeaking(true), 7900));
    timers.push(setTimeout(() => setSpeaking(false), 10100));
    timers.push(setTimeout(() => setCycle((current) => current + 1), 11600));

    return () => timers.forEach(clearTimeout);
  }, [cycle]);

  return (
    <div className={`relative w-full overflow-hidden border border-white/[0.09] bg-[#080c15] shadow-[0_30px_90px_rgba(0,0,0,0.48)] ${compact ? "rounded-[1.5rem]" : "rounded-[2rem]"} ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_75%,rgba(37,99,235,0.12),transparent_42%)]" />

      <div className={`relative flex items-center justify-between border-b border-white/[0.07] ${compact ? "px-4 py-2.5" : "px-5 py-4 md:px-7"}`}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400">Live Interpreter</p>
          <p className={`${compact ? "mt-0.5 text-[10px]" : "mt-1 text-xs"} text-gray-500`}>English to Japanese</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Ready
        </div>
      </div>

      <div className={`relative flex flex-col ${compact ? "min-h-[238px] px-3 py-3" : "min-h-[390px] px-5 py-6 md:min-h-[430px] md:px-8 md:py-8"}`}>
        <div className={`grid flex-1 grid-cols-2 ${compact ? "gap-2" : "gap-4"}`}>
          <div className={`border border-white/[0.07] bg-white/[0.025] ${compact ? "rounded-xl p-3" : "rounded-2xl p-5 md:p-6"}`}>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-gray-600">English</p>
            <div className={`${compact ? "mt-3 min-h-12 text-sm leading-5" : "mt-5 min-h-16 text-lg leading-7 md:text-xl"} text-white`}>
              {transcript || <span className="text-gray-700">Your speech appears here</span>}
              {listening && transcript && (
                <motion.span
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="ml-1 inline-block h-5 w-px translate-y-1 bg-blue-400"
                />
              )}
            </div>

            <div className={`${compact ? "mt-3 h-7 gap-0.5" : "mt-7 h-10 gap-1"} flex items-center`}>
              {Array.from({ length: 14 }).map((_, index) => (
                <motion.span
                  key={index}
                  animate={{ height: listening ? [4, 10 + ((index * 7) % 24), 4] : 4 }}
                  transition={{
                    duration: 0.75 + (index % 4) * 0.08,
                    repeat: listening ? Infinity : 0,
                    delay: index * 0.035,
                    ease: "easeInOut",
                  }}
                  className={`${compact ? "w-0.5" : "w-1"} rounded-full bg-blue-400/75`}
                />
              ))}
            </div>
          </div>

          <div className={`border border-white/[0.07] bg-white/[0.025] ${compact ? "rounded-xl p-3" : "rounded-2xl p-5 md:p-6"}`}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-gray-600">Japanese</p>
              <div className="relative">
                <AnimatePresence>
                  {speaking && (
                    <>
                      <motion.span
                        initial={{ opacity: 0.6, scale: 0.7 }}
                        animate={{ opacity: 0, scale: 1.65 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.1, repeat: Infinity }}
                        className="absolute inset-0 rounded-full border border-blue-400/50"
                      />
                      <motion.span
                        initial={{ opacity: 0.45, scale: 0.7 }}
                        animate={{ opacity: 0, scale: 2 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.1, delay: 0.25, repeat: Infinity }}
                        className="absolute inset-0 rounded-full border border-blue-400/30"
                      />
                    </>
                  )}
                </AnimatePresence>
                <motion.div
                  animate={{
                    color: speaking ? "#60A5FA" : "#4B5563",
                    scale: speaking ? [1, 1.08, 1] : 1,
                  }}
                  transition={{ duration: 0.7, repeat: speaking ? Infinity : 0 }}
                  className="relative rounded-full bg-white/[0.04] p-2"
                >
                  <Volume2 size={16} />
                </motion.div>
              </div>
            </div>

            <div className={`${compact ? "mt-3 min-h-12 text-base leading-6" : "mt-5 min-h-16 text-xl leading-8 md:text-2xl"} text-white`}>
              <AnimatePresence mode="wait">
                {translation ? (
                  <motion.span
                    key="translation"
                    initial={{ opacity: 0, y: 10, filter: "blur(5px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  >
                    {translation}
                  </motion.span>
                ) : (
                  <motion.span key="placeholder" className="text-base text-gray-700">
                    Translation appears here
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className={`relative flex items-center justify-center ${compact ? "mt-2 h-12" : "mt-5 h-20"}`}>
          <AnimatePresence>
            {processing && (
              <motion.div
                initial={{ opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className={`absolute flex items-center gap-2 text-blue-300 ${compact ? "left-1 text-[10px]" : "left-5 text-xs md:left-8"}`}
              >
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles size={14} />
                </motion.span>
                Understanding your words
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            aria-label={listening ? "Listening" : "Start interpretation"}
            animate={{
              backgroundColor: listening ? "#2563EB" : "#151A24",
              borderColor: listening ? "rgba(96,165,250,0.75)" : "rgba(255,255,255,0.10)",
              boxShadow: listening ? "0 0 0 8px rgba(37,99,235,0.12), 0 0 34px rgba(37,99,235,0.48)" : "0 8px 24px rgba(0,0,0,0.25)",
              scale: listening ? [1, 1.04, 1] : 1,
            }}
            transition={{ duration: 1.1, repeat: listening ? Infinity : 0 }}
            className={`flex items-center justify-center rounded-full border text-white ${compact ? "h-11 w-11" : "h-16 w-16"}`}
          >
            <Mic size={compact ? 18 : 24} strokeWidth={1.7} />
          </motion.button>
        </div>
      </div>

      <motion.div
        key={cycle}
        initial={{ left: "91%", top: "8%", opacity: 0 }}
        animate={{
          left: ["91%", "82%", "51%", "50%", "50%"],
          top: compact ? ["8%", "22%", "84%", "84%", "84%"] : ["8%", "24%", "79%", "79%", "79%"],
          opacity: [0, 1, 1, 1, 0],
          scale: [1, 1, 1, 0.82, 1],
        }}
        transition={{
          duration: 3.15,
          times: [0, 0.18, 0.72, 0.82, 1],
          ease: [0.22, 1, 0.36, 1],
        }}
        className="pointer-events-none absolute z-30 -translate-x-1 -translate-y-1 drop-shadow-[0_4px_5px_rgba(0,0,0,0.65)]"
      >
        <svg width="26" height="32" viewBox="0 0 26 32" fill="none" aria-hidden="true">
          <path d="M2 1.5V25.2L8.7 19.1L13.2 29.5L17.4 27.7L13 17.7H23.5L2 1.5Z" fill="white" stroke="#05070B" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </motion.div>
    </div>
  );
}
