"use client";

import Link from "next/link";
import { ListeningMic, PhraseSwap, VoiceBars, WaveToWord } from "@/components/nav-marks/NavMarks";

/**
 * A scratch page for choosing the navigation mark. Not linked from anywhere —
 * delete it, and components/nav-marks, once one is picked.
 */

const CANDIDATES = [
  {
    n: "1",
    name: "Voice bars",
    mark: <VoiceBars />,
    says: "Someone is talking. The plainest possible statement of what this product is about, and the only one that reads instantly at a glance.",
    against: "Common — every audio app has some version of it.",
  },
  {
    n: "2",
    name: "Listening mic",
    mark: <ListeningMic />,
    says: "It is listening, right now. The rings give it a heartbeat without being loud about it.",
    against: "A microphone alone says recording, not interpreting.",
  },
  {
    n: "3",
    name: "Phrase swap",
    mark: <PhraseSwap />,
    says: "The whole product in one gesture: a phrase, then the same phrase in Japanese. Nothing else here shows the translation actually happening.",
    against: "Widest, and it carries text — it has to stay short.",
  },
  {
    n: "4",
    name: "Wave to word",
    mark: <WaveToWord />,
    says: "Sound resolving into language — the moment the app exists for. Compact, and unlike anything a generic audio app would use.",
    against: "The 語 needs a Japanese font present; it is a single character, so it is safe on the platforms you target.",
  },
];

export default function NavAnimationLab() {
  return (
    <div className="min-h-screen bg-[#04070d] px-6 py-16 text-white">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="text-3xl font-bold tracking-tight">Navigation mark — four candidates</h1>
        <p className="mt-3 text-[14px] text-gray-400">
          All four are markup, not assets: nothing to license, nothing to download, and they take
          the brand blue from CSS. Pick one and I will wire it into the bar and delete the rest.
        </p>

        <div className="mt-12 space-y-4">
          {CANDIDATES.map(({ n, name, mark, says, against }) => (
            <div key={n} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
              <div className="flex flex-wrap items-center gap-6">
                <span className="font-mono text-[12px] text-gray-600">{n}</span>
                {/* shown against the real bar background, at the real size */}
                <span className="flex h-16 min-w-[220px] items-center justify-center rounded-xl border border-white/[0.06] bg-[#0a0d14] px-5">
                  {mark}
                </span>
                <div className="min-w-[220px] flex-1">
                  <h2 className="text-[16px] font-semibold">{name}</h2>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-gray-400">{says}</p>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-gray-600">Against: {against}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* each one in a real bar, so the choice is made in context */}
        <h2 className="mt-16 text-[15px] font-semibold text-gray-300">In the actual bar</h2>
        <div className="mt-5 space-y-3">
          {CANDIDATES.map(({ n, mark }) => (
            <div
              key={n}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-[#04070d] px-5 py-3.5"
            >
              <span className="flex items-center gap-2.5">
                <img src="/logo-d.png" alt="" className="h-7 w-auto" />
                <span className="text-[15px] font-bold italic tracking-tight">
                  Quick<span className="text-blue-500">Voice</span>
                </span>
              </span>
              <span className="hidden items-center gap-6 text-[13px] text-gray-400 sm:flex">
                <span>How it works</span>
                <span>Why QuickVoice</span>
                <span className="text-white">Extension</span>
              </span>
              <span className="flex items-center gap-4">
                {mark}
                <span className="rounded-full bg-blue-600 px-5 py-2 text-[13px] font-semibold">Login</span>
              </span>
            </div>
          ))}
        </div>

        <Link href="/landing" className="mt-12 inline-block text-[13px] text-gray-500 hover:text-white">
          Back to QuickVoice
        </Link>
      </div>
    </div>
  );
}
