"use client";

import { useEffect, useState } from "react";

/**
 * Candidate marks for the navigation bar.
 *
 * All four are markup — no image, no Lottie, no third-party asset — so they
 * weigh nothing, take the brand blue from CSS rather than from a baked-in
 * palette, and can be adjusted in seconds. Each is built to survive next to a
 * wordmark at about 40px tall.
 */

/** 1. Voice bars — the sound of someone talking, and nothing else. */
export function VoiceBars() {
  return (
    <span className="flex h-9 items-end gap-[3px]" aria-hidden>
      <style>{`
        @keyframes qv-bar { 0%,100% { transform: scaleY(.28) } 50% { transform: scaleY(1) } }
        .qv-bar { transform-origin: bottom; animation: qv-bar 1.05s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .qv-bar { animation: none; transform: scaleY(.6) } }
      `}</style>
      {[0, 0.18, 0.36, 0.12, 0.28].map((delay, i) => (
        <span
          key={i}
          className="qv-bar w-[3px] rounded-full bg-blue-500"
          style={{ height: [14, 24, 30, 20, 12][i], animationDelay: `${delay}s` }}
        />
      ))}
    </span>
  );
}

/** 2. A microphone that is listening — rings leaving it, on a slow pulse. */
export function ListeningMic() {
  return (
    <span className="relative flex h-9 w-9 items-center justify-center" aria-hidden>
      <style>{`
        @keyframes qv-ring { 0% { transform: scale(.55); opacity: .55 } 100% { transform: scale(1.5); opacity: 0 } }
        .qv-ring { animation: qv-ring 2.1s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) { .qv-ring { animation: none; opacity: .18 } }
      `}</style>
      <span className="qv-ring absolute h-8 w-8 rounded-full border border-blue-500" />
      <span className="qv-ring absolute h-8 w-8 rounded-full border border-blue-500" style={{ animationDelay: "1.05s" }} />
      <svg viewBox="0 0 24 24" className="relative h-[18px] w-[18px] text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="9" y="2.5" width="6" height="11" rx="3" fill="currentColor" stroke="none" />
        <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
        <path d="M12 17.5V21" />
      </svg>
    </span>
  );
}

/** 3. The product in one gesture: a phrase, then the same phrase in Japanese. */
const PHRASES = [
  ["Hello", "こんにちは"],
  ["Thank you", "ありがとう"],
  ["Where is the station?", "駅はどこですか"],
] as const;

export function PhraseSwap() {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFlipped((was) => {
        if (was) setIndex((i) => (i + 1) % PHRASES.length);
        return !was;
      });
    }, 1900);
    return () => window.clearInterval(timer);
  }, []);

  const [english, japanese] = PHRASES[index];

  return (
    <span className="flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3" aria-hidden>
      <span className="text-[10px] font-bold tracking-wider text-blue-400">{flipped ? "JA" : "EN"}</span>
      <span
        key={`${index}-${flipped}`}
        className="whitespace-nowrap text-[12px] text-gray-300"
        style={{ animation: "qv-fade .45s ease both" }}
      >
        {flipped ? japanese : english}
      </span>
      <style>{`
        @keyframes qv-fade { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) { [style*="qv-fade"] { animation: none !important } }
      `}</style>
    </span>
  );
}

/** 4. Sound becoming language: bars on the left resolve into a character. */
export function WaveToWord() {
  return (
    <span className="flex h-9 items-center gap-2" aria-hidden>
      <style>{`
        @keyframes qv-w { 0%,100% { transform: scaleY(.3); opacity: .5 } 45% { transform: scaleY(1); opacity: 1 } }
        @keyframes qv-word { 0%,35% { opacity: 0; transform: translateX(-4px) } 60%,100% { opacity: 1; transform: none } }
        .qv-w { transform-origin: center; animation: qv-w 1.6s ease-in-out infinite; }
        .qv-word { animation: qv-word 1.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .qv-w, .qv-word { animation: none; opacity: 1 } }
      `}</style>
      <span className="flex items-center gap-[3px]">
        {[16, 26, 20].map((h, i) => (
          <span
            key={i}
            className="qv-w w-[3px] rounded-full bg-blue-500"
            style={{ height: h, animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </span>
      <span className="qv-word text-[15px] font-semibold text-gray-200">語</span>
    </span>
  );
}
