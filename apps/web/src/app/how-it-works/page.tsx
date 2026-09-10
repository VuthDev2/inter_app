"use client";

import Link from "next/link";
import { ArrowRight, Ear, Languages, Mic, Volume2 } from "lucide-react";
import MarketingNav from "@/components/MarketingNav";
import ConversationStory from "@/components/ConversationStory";

/**
 * How it works, as its own page.
 *
 * The scroll-driven scene is the whole argument, so it is embedded rather than
 * described: four beats, each one a thing the software actually does. The
 * written steps below it are for anyone who would rather read than scroll.
 */

const STEPS = [
  {
    icon: Mic,
    tint: "text-blue-400",
    ring: "bg-blue-500/10",
    number: "01",
    title: "It hears you",
    body: "Speech goes to Whisper running on your own machine and comes back as text, while you are still talking. Nothing is uploaded to a transcription service.",
  },
  {
    icon: Ear,
    tint: "text-cyan-400",
    ring: "bg-cyan-500/10",
    number: "02",
    title: "It keeps the meaning",
    body: "Names you care about are protected before translation, so Nana stays Nana instead of becoming the Japanese word for grandmother.",
  },
  {
    icon: Languages,
    tint: "text-indigo-400",
    ring: "bg-indigo-500/10",
    number: "03",
    title: "It crosses the language",
    body: "A translation model sized for one job — English and Japanese — turns the sentence around in a fraction of a second, and routes it by the language it actually heard rather than the one you picked.",
  },
  {
    icon: Volume2,
    tint: "text-emerald-400",
    ring: "bg-emerald-500/10",
    number: "04",
    title: "It speaks back",
    body: "The translation is spoken aloud in a natural voice, and the microphone reopens for the reply — so a conversation keeps its rhythm instead of stopping at every turn.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen w-full bg-[#04070d] text-white">
      <MarketingNav />

      <section className="relative overflow-hidden px-6 pt-20 pb-16 md:pt-24">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[380px] w-[760px] -translate-x-1/2 rounded-full bg-blue-600/15 blur-[130px]"
        />
        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <span className="mb-6 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-300">
            How it works
          </span>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight md:text-[52px]">
            Four steps.
            <br />
            One natural conversation.
          </h1>
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-gray-400 md:text-[16px]">
            You speak, QuickVoice listens, translates and answers aloud — and then gets out of the
            way so the other person can reply. Scroll the scene below to follow one exchange from
            beginning to end.
          </p>
        </div>
      </section>

      <ConversationStory />

      <section className="border-t border-white/[0.06] bg-[#070b14] px-6 py-24">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="text-center text-3xl font-bold tracking-wide">The same four steps, in words</h2>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
            {STEPS.map(({ icon: Icon, tint, ring, number, title, body }) => (
              <div
                key={number}
                className="rounded-[2rem] border border-gray-800/80 bg-[#0b1221] p-8 transition-colors hover:border-gray-700"
              >
                <div className="mb-6 flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${ring}`}>
                    <Icon size={18} className={tint} />
                  </div>
                  <span className="text-[13px] font-semibold tracking-[0.2em] text-gray-500">{number}</span>
                </div>
                <h3 className="mb-4 text-[17px] font-semibold">{title}</h3>
                <p className="text-[14px] leading-relaxed text-gray-400">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-6 rounded-[2rem] border border-white/[0.08] bg-white/[0.02] px-8 py-7 sm:flex-row">
            <p className="text-[14px] text-gray-400">
              All of it runs on the machine you start it on. Nothing is sent to a cloud translator.
            </p>
            <Link
              href="/why-quickvoice"
              className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-blue-500"
            >
              Why that matters
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-6 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 text-[13px] text-gray-500 sm:flex-row">
          <span>QuickVoice — English and Japanese, on your own hardware.</span>
          <Link href="/landing" className="transition-colors hover:text-white">
            Back to QuickVoice
          </Link>
        </div>
      </footer>
    </div>
  );
}
