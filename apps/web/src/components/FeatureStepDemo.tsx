"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Mic, Sparkles, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

type FeatureStepDemoProps = {
  feature: "speak" | "understand" | "translate" | "respond";
  active?: boolean;
};

const SPOKEN_TEXT = "Where is the train station?";
const SPOKEN_WORDS = SPOKEN_TEXT.split(" ");
const JAPANESE_TEXT = "駅はどこですか？";

function Waveform({ active, small = false }: { active: boolean; small?: boolean }) {
  const maximumHeight = small ? 32 : 48;

  return (
    <div className={`flex items-center justify-center ${small ? "h-9 gap-1" : "h-14 gap-1.5"}`}>
      {[8, 18, 30, 44, 26, 38, 20, 34, 46, 28, 40, 22, 32, 16].map((height, index) => (
        <motion.span
          key={index}
          animate={{ scaleY: active ? [0.12, height / maximumHeight, 0.16, height / maximumHeight * 0.55, 0.12] : 0.12 }}
          transition={{
            duration: 0.8 + (index % 4) * 0.08,
            repeat: active ? Infinity : 0,
            delay: index * 0.035,
            ease: "easeInOut",
          }}
          className={`${small ? "w-0.5" : "w-1"} rounded-full bg-blue-400`}
          style={{ height: maximumHeight, transformOrigin: "center" }}
        />
      ))}
    </div>
  );
}

export function FeatureStepDemo({ feature, active = true }: FeatureStepDemoProps) {
  const [cycle, setCycle] = useState(0);
  const [stage, setStage] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [japaneseText, setJapaneseText] = useState("");

  useEffect(() => {
    const timers: Array<ReturnType<typeof setTimeout>> = [];

    timers.push(setTimeout(() => {
      setStage(0);
      setTranscript("");
      setJapaneseText("");
    }, 0));

    if (!active) {
      return () => timers.forEach(clearTimeout);
    }

    timers.push(setTimeout(
      () => setStage(1),
      feature === "understand" ? 50 : feature === "speak" ? 1250 : 1450,
    ));
    timers.push(setTimeout(() => setStage(2), feature === "understand" ? 3500 : 2450));

    if (feature === "speak") {
      SPOKEN_WORDS.forEach((_, index) => {
        timers.push(setTimeout(() => {
          setTranscript(SPOKEN_WORDS.slice(0, index + 1).join(" "));
        }, 2750 + index * 365));
      });
      timers.push(setTimeout(() => setStage(3), 4600));
    } else {
      timers.push(setTimeout(
        () => setStage(3),
        feature === "translate" ? 4250 : feature === "understand" ? 5100 : 3900,
      ));
    }

    if (feature === "translate") {
      JAPANESE_TEXT.split("").forEach((_, index) => {
        timers.push(setTimeout(() => {
          setJapaneseText(JAPANESE_TEXT.slice(0, index + 1));
        }, 4300 + index * 105));
      });
    }

    timers.push(setTimeout(() => setStage(4), feature === "understand" ? 6500 : 5700));
    timers.push(setTimeout(() => setCycle((value) => value + 1), feature === "understand" ? 8000 : 7100));

    return () => timers.forEach(clearTimeout);
  }, [active, cycle, feature]);

  const panelClass = "relative h-[220px] w-full overflow-hidden rounded-[1.75rem] border border-white/[0.07] bg-[#080c14]";

  if (feature === "speak") {
    return (
      <div className={panelClass}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_60%,rgba(37,99,235,0.13),transparent_55%)]" />
        <div className="relative flex h-full items-center justify-between gap-4 px-6 md:px-8">
          <motion.div
            animate={{
              backgroundColor: stage >= 1 && stage < 4 ? "#2563eb" : "#151a24",
              boxShadow: stage >= 1 && stage < 4
                ? "0 0 0 8px rgba(37,99,235,.12), 0 0 32px rgba(37,99,235,.42)"
                : "0 8px 24px rgba(0,0,0,.24)",
              scale: stage === 1 ? [1, 0.92, 1.04, 1] : 1,
            }}
            transition={{ duration: 0.55 }}
            className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/10 text-white"
          >
            <AnimatePresence>
              {stage === 1 && (
                <motion.span
                  initial={{ opacity: 0.75, scale: 0.72 }}
                  animate={{ opacity: 0, scale: 1.65 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full border-2 border-blue-300/70"
                />
              )}
            </AnimatePresence>
            <motion.div
              animate={stage >= 1 && stage < 4 ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={{ duration: 0.9, repeat: stage >= 1 && stage < 4 ? Infinity : 0 }}
            >
              <Mic size={25} strokeWidth={1.7} />
            </motion.div>
          </motion.div>

          <motion.div
            animate={{ opacity: stage >= 1 ? 1 : 0.25 }}
            className="hidden min-w-[105px] sm:block"
          >
            <Waveform active={stage >= 1 && stage < 4} />
          </motion.div>

          <motion.div
            animate={{
              borderColor: stage >= 2 ? "rgba(96,165,250,.25)" : "rgba(255,255,255,.08)",
              backgroundColor: stage >= 2 ? "rgba(37,99,235,.07)" : "rgba(255,255,255,.025)",
            }}
            className="flex min-h-[92px] min-w-0 flex-1 flex-col items-start justify-center rounded-2xl border px-4 py-3"
          >
            <div className="mb-2 flex items-center gap-1.5 text-[8px] font-medium uppercase tracking-[0.14em] text-blue-300/70">
              <motion.span
                animate={stage >= 1 && stage < 4 ? { opacity: [0.35, 1, 0.35], scale: [0.8, 1, 0.8] } : { opacity: 0.25, scale: 0.8 }}
                transition={{ duration: 0.9, repeat: stage >= 1 && stage < 4 ? Infinity : 0 }}
                className="h-1.5 w-1.5 rounded-full bg-blue-400"
              />
              {stage >= 1 && stage < 4 ? "Listening live" : "Live transcript"}
            </div>
            <div className="flex min-h-10 flex-wrap content-center gap-x-1.5 gap-y-0.5 text-sm leading-5 text-white md:text-base">
              <AnimatePresence mode="wait">
                {transcript ? (
                  <motion.div key="recognized-words" className="flex flex-wrap gap-x-1.5 gap-y-0.5">
                    {transcript.split(" ").map((word, index) => (
                      <motion.span
                        key={`${cycle}-${index}-${word}`}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.32, ease: "easeOut" }}
                      >
                        {word}
                      </motion.span>
                    ))}
                  </motion.div>
                ) : stage >= 1 && stage < 4 ? (
                  <motion.div
                    key="listening"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-center gap-2 text-blue-100"
                  >
                    <span>Listening</span>
                    <span className="flex items-center gap-1">
                      {[0, 1, 2].map((dot) => (
                        <motion.span
                          key={dot}
                          animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                          transition={{ duration: 0.8, delay: dot * 0.13, repeat: Infinity }}
                          className="h-1 w-1 rounded-full bg-blue-300"
                        />
                      ))}
                    </span>
                  </motion.div>
                ) : (
                  <motion.span
                    key="ready"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-gray-600"
                  >
                    Tap the microphone to start speaking
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {active && (
          <motion.div
            key={`${cycle}-speech-cursor`}
            initial={{ left: "92%", top: "12%", opacity: 0 }}
            animate={{
              left: ["92%", "70%", "12%", "12%", "12%"],
              top: ["12%", "28%", "59%", "59%", "59%"],
              opacity: [0, 1, 1, 1, 0],
              scale: [1, 1, 1, 0.72, 1],
            }}
            transition={{ duration: 1.55, times: [0, 0.12, 0.62, 0.74, 1], ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute z-20 drop-shadow-[0_4px_5px_rgba(0,0,0,.65)]"
          >
            <svg width="25" height="30" viewBox="0 0 26 32" fill="none" aria-hidden="true">
              <path d="M2 1.5V25.2L8.7 19.1L13.2 29.5L17.4 27.7L13 17.7H23.5L2 1.5Z" fill="white" stroke="#05070B" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </motion.div>
        )}
      </div>
    );
  }

  if (feature === "understand") {
    const fragments = [
      { text: "train", top: 7, left: 4, delay: 0 },
      { text: "where", top: 35, left: 28, delay: 0.12 },
      { text: "station", top: 62, left: 1, delay: 0.24 },
      { text: "is", top: 78, left: 53, delay: 0.34 },
      { text: "the", top: 17, left: 58, delay: 0.44 },
    ];

    return (
      <div className={panelClass}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_50%,rgba(37,99,235,0.17),transparent_48%)]" />
        <div className="relative flex h-full items-center justify-center gap-3 px-4 md:gap-5 md:px-6">
          <div className="relative hidden h-24 w-[120px] shrink-0 overflow-hidden sm:block">
            {fragments.map((fragment, index) => (
              <motion.span
                key={`${cycle}-${fragment.text}`}
                initial={{ opacity: 0, x: -15, rotate: index % 2 ? -7 : 6 }}
                animate={stage >= 1 ? {
                  opacity: [0, 0.9, 0.8, 0],
                  x: [fragment.left - 20, fragment.left, 68, 118],
                  y: [fragment.top, fragment.top + (index % 2 ? 10 : -8), 46, 46],
                  rotate: [index % 2 ? -7 : 6, index % 2 ? 5 : -5, 0, 0],
                  scale: [0.88, 1, 0.82, 0.45],
                } : { opacity: 0 }}
                transition={{
                  duration: 2.8,
                  delay: fragment.delay,
                  times: [0, 0.12, 0.42, 1],
                  ease: "easeInOut",
                }}
                className="absolute whitespace-nowrap text-[10px] font-medium tracking-wide text-gray-400"
              >
                {fragment.text}
              </motion.span>
            ))}
          </div>

          <div className="relative h-9 w-14 shrink-0 overflow-hidden rounded-full border border-blue-400/15 bg-blue-500/[0.05]">
            {[0, 1, 2].map((particle) => (
              <motion.span
                key={`${cycle}-pipe-${particle}`}
                initial={{ x: -8, opacity: 0 }}
                animate={stage >= 1 && stage < 3 ? { x: [-8, 58], opacity: [0, 1, 1, 0] } : { opacity: 0 }}
                transition={{ duration: 1.25, delay: 0.25 + particle * 0.3, repeat: 1, ease: "linear" }}
                className="absolute left-0 top-1/2 h-1 w-3 -translate-y-1/2 rounded-full bg-blue-400"
              />
            ))}
            <motion.div
              animate={{ opacity: stage >= 1 && stage < 3 ? [0.2, 0.65, 0.2] : 0.15 }}
              transition={{ duration: 0.9, repeat: Infinity }}
              className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-blue-300"
            />
          </div>

          <motion.div
            animate={{
              scale: stage >= 2 && stage < 4 ? [1, 1.035, 1] : 1,
            }}
            transition={{ duration: 1.35, repeat: stage >= 2 && stage < 4 ? Infinity : 0, ease: "easeInOut" }}
            className={`relative flex h-[124px] w-[124px] shrink-0 items-center justify-center overflow-hidden rounded-[2rem] border bg-[#0d1422] ${
              stage >= 2 && stage < 4
                ? "border-blue-300/60 shadow-[0_0_30px_rgba(96,165,250,.42),0_0_70px_rgba(37,99,235,.25)]"
                : "border-blue-300/25 shadow-[0_0_24px_rgba(37,99,235,.18)]"
            }`}
          >
            <motion.div
              animate={{ opacity: stage >= 2 && stage < 4 ? [0.45, 1, 0.45] : 0.55, scale: stage >= 2 && stage < 4 ? [0.9, 1.18, 0.9] : 1 }}
              transition={{ duration: 1.35, repeat: stage >= 2 && stage < 4 ? Infinity : 0, ease: "easeInOut" }}
              className="absolute inset-0 bg-[radial-gradient(circle,rgba(96,165,250,.42),rgba(37,99,235,.12)_42%,transparent_70%)]"
            />
            <motion.div
              animate={stage >= 2 && stage < 4 ? {
                rotate: [0, 8, -6, 0],
                scale: [1, 1.08, 1],
                color: ["#93C5FD", "#FFFFFF", "#93C5FD"],
                filter: [
                  "drop-shadow(0 0 7px rgba(147,197,253,.55))",
                  "drop-shadow(0 0 18px rgba(191,219,254,1))",
                  "drop-shadow(0 0 7px rgba(147,197,253,.55))",
                ],
              } : {
                rotate: 0,
                scale: 1,
                color: "#93C5FD",
                filter: "drop-shadow(0 0 8px rgba(96,165,250,.65))",
              }}
              transition={{ duration: 1.4, repeat: stage >= 2 && stage < 4 ? Infinity : 0, ease: "easeInOut" }}
              className="relative"
            >
              <Sparkles size={42} strokeWidth={1.25} aria-label="AI language model" />
            </motion.div>
            <AnimatePresence>
              {stage >= 2 && stage < 4 && (
                <motion.span
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-3 text-[7px] font-medium uppercase tracking-[0.15em] text-blue-200/75"
                >
                  Understand
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    );
  }

  if (feature === "translate") {
    return (
      <div className={panelClass}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_65%,rgba(37,99,235,0.13),transparent_52%)]" />
        <div className="relative flex h-full items-center justify-center gap-4 px-5 md:gap-7">
          <motion.div
            animate={{ opacity: stage >= 1 ? 1 : 0.28, y: stage >= 1 ? 0 : 8 }}
            className="rounded-2xl rounded-bl-md border border-white/[0.09] bg-white/[0.04] px-4 py-3"
          >
            <p className="text-[9px] uppercase tracking-[0.15em] text-gray-500">English</p>
            <p className="mt-1.5 text-xs text-white md:text-sm">Where is the station?</p>
          </motion.div>
          <div className="relative h-px w-9 overflow-hidden bg-white/10 md:w-14">
            <motion.span
              animate={{ x: stage >= 2 ? ["-100%", "130%"] : "-100%" }}
              transition={{ duration: 0.9, repeat: stage === 2 ? Infinity : 0 }}
              className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-blue-400 to-transparent"
            />
          </div>
          <div className="flex min-h-[66px] min-w-[130px] items-center justify-center">
            <AnimatePresence mode="wait">
              {stage < 2 && (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.22 }}
                  exit={{ opacity: 0 }}
                  className="h-[66px] w-full rounded-2xl rounded-br-md border border-white/[0.06] bg-white/[0.02]"
                />
              )}
              {stage === 2 && (
                <motion.div
                  key="translating"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex h-[66px] w-full items-center justify-center gap-1.5 rounded-2xl rounded-br-md border border-blue-400/15 bg-blue-500/[0.05]"
                  aria-label="Translating"
                >
                  {[0, 1, 2].map((dot) => (
                    <motion.span
                      key={dot}
                      animate={{ y: [0, -5, 0], opacity: [0.35, 1, 0.35] }}
                      transition={{ duration: 0.75, delay: dot * 0.14, repeat: Infinity }}
                      className="h-1.5 w-1.5 rounded-full bg-blue-400"
                    />
                  ))}
                </motion.div>
              )}
              {stage >= 3 && (
                <motion.div
                  key="japanese"
                  initial={{ opacity: 0, y: 9 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, ease: "easeOut" }}
                  className="w-full rounded-2xl rounded-br-md border border-blue-400/20 bg-blue-500/[0.08] px-4 py-3"
                >
                  <p className="text-[9px] uppercase tracking-[0.15em] text-blue-400/70">Japanese</p>
                  <p className="mt-1.5 flex min-h-6 items-center whitespace-nowrap text-sm text-white md:text-base">
                    {japaneseText}
                    {japaneseText.length < JAPANESE_TEXT.length && (
                      <motion.span
                        animate={{ opacity: [1, 0.15, 1] }}
                        transition={{ duration: 0.65, repeat: Infinity }}
                        className="ml-0.5 h-4 w-px bg-blue-300"
                      />
                    )}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={panelClass}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_50%,rgba(37,99,235,0.14),transparent_52%)]" />
      <div className="relative flex h-full items-center justify-center gap-4 px-5 md:gap-6">
        <motion.div
          animate={{ opacity: stage >= 1 ? 1 : 0.35, y: stage >= 1 ? 0 : 8 }}
          className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-4"
        >
          <p className="text-[8px] font-medium uppercase tracking-[0.16em] text-gray-500">Translated text</p>
          <p className="mt-1.5 whitespace-nowrap text-sm text-white md:text-base">駅はどこですか？</p>
        </motion.div>

        <motion.div
          animate={{
            borderColor: stage >= 2 && stage < 4 ? "rgba(96,165,250,.28)" : "rgba(255,255,255,.08)",
            backgroundColor: stage >= 2 && stage < 4 ? "rgba(37,99,235,.06)" : "rgba(255,255,255,.025)",
          }}
          className="w-full max-w-[240px] rounded-2xl border px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {stage >= 2 && stage < 4 && (
                <motion.span
                  initial={{ opacity: 0.55, scale: 0.75 }}
                  animate={{ opacity: 0, scale: 1.65 }}
                  transition={{ duration: 1.15, repeat: Infinity }}
                  className="absolute inset-0 rounded-full border border-blue-400/45"
                />
              )}
              <motion.div
                animate={{
                  color: stage >= 2 && stage < 4 ? "#93c5fd" : "#9ca3af",
                  backgroundColor: stage >= 2 && stage < 4 ? "rgba(37,99,235,.28)" : "rgba(255,255,255,.04)",
                  boxShadow: stage >= 2 && stage < 4 ? "0 0 22px rgba(37,99,235,.30)" : "0 0 0 rgba(0,0,0,0)",
                }}
                className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/10"
              >
                <Volume2 size={19} strokeWidth={1.6} />
              </motion.div>
            </div>

            <div className="min-w-0 flex-1">
              <AnimatePresence mode="wait">
                <motion.p
                  key={stage >= 2 && stage < 4 ? "speaking" : "ready"}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-[10px] font-medium text-gray-300"
                >
                  {stage >= 2 && stage < 4 ? "Speaking Japanese" : "Play translated voice"}
                </motion.p>
              </AnimatePresence>
              <div className="mt-1.5 overflow-hidden">
                <Waveform active={stage >= 2 && stage < 4} small />
              </div>
            </div>
          </div>

          <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-white/[0.07]">
            <motion.div
              initial={false}
              animate={{ width: stage >= 2 && stage < 4 ? "100%" : "0%" }}
              transition={{ duration: stage >= 2 && stage < 4 ? 3.1 : 0.25, ease: "linear" }}
              className="h-full rounded-full bg-blue-400"
            />
          </div>
        </motion.div>
      </div>

      {active && <motion.div
        key={`speaker-cursor-${cycle}`}
        initial={{ left: "92%", top: "12%", opacity: 0 }}
        animate={{
          left: ["92%", "80%", "55%", "55%", "55%"],
          top: ["12%", "28%", "45%", "45%", "45%"],
          opacity: [0, 1, 1, 1, 0],
          scale: [1, 1, 1, 0.78, 1],
        }}
        transition={{ duration: 2.25, times: [0, 0.2, 0.68, 0.78, 1], ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute z-20 drop-shadow-[0_4px_5px_rgba(0,0,0,.65)]"
      >
        <svg width="22" height="27" viewBox="0 0 26 32" fill="none" aria-hidden="true">
          <path d="M2 1.5V25.2L8.7 19.1L13.2 29.5L17.4 27.7L13 17.7H23.5L2 1.5Z" fill="white" stroke="#05070B" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </motion.div>}
    </div>
  );
}
