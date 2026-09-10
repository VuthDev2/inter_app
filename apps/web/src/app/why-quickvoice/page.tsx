"use client";

import Link from "next/link";
import { ArrowRight, Check, Cpu, Languages, Mic, Volume2, X } from "lucide-react";
import MarketingNav from "@/components/MarketingNav";

/**
 * Why QuickVoice.
 *
 * Deliberately not a grid of cards — the extension page is that, and two card
 * grids in the same nav read as one page written twice. This is an argument,
 * so it is shaped like one: the comparison that makes the case, then the
 * claims spelled out in full-width rows, then the numbers.
 *
 * Every claim is one you could check by running it, which is the point.
 */

const COMPARISON = [
  { question: "Where your voice goes", usual: "A server you do not own", ours: "The machine in front of you" },
  { question: "Who can read the transcript", usual: "Whoever holds the logs", ours: "Nobody — it never leaves" },
  { question: "With the network down", usual: "Nothing works", ours: "Interpreting still works" },
  { question: "Cost per minute spoken", usual: "Metered, per API call", ours: "Nothing, it is your hardware" },
  { question: "Languages offered", usual: "A hundred, most of them badly", ours: "Two, done properly" },
];

const CLAIMS = [
  {
    number: "01",
    title: "The models sit on your disk",
    body: "Whisper for listening, fugumt for meaning, Kokoro for the reply. The first run fetches them; after that they load from your own drive and answer from there. You can unplug the network and watch it keep working.",
    aside: "whisper · fugumt · kokoro",
  },
  {
    number: "02",
    title: "Fast enough to interrupt someone",
    body: "A spoken turn comes back in well under a second on Apple silicon. That is the line between a translated conversation and two people politely waiting for a machine to finish thinking.",
    aside: "≈0.5s per turn",
  },
  {
    number: "03",
    title: "Names survive the translation",
    body: "Add the words that must not change — a person, a company, a product — and they are carried through untouched. Without that, Nana quietly becomes the Japanese word for grandmother halfway through a sentence.",
    aside: "protected terms",
  },
  {
    number: "04",
    title: "Two languages, chosen on purpose",
    body: "English and Japanese, both directions. A model trained on one pair beats a general one that claims a hundred, and the app only ever offers what it can actually deliver rather than failing at the last moment.",
    aside: "en ⇄ ja",
  },
];

export default function WhyQuickVoicePage() {
  return (
    <div className="min-h-screen w-full bg-[#04070d] text-white">
      <MarketingNav />

      {/* Hero — one screen, and the half that was empty now carries the whole
          argument as a picture: every stage of a turn, inside one box, with the
          only line that matters drawn underneath it. */}
      <section className="flex min-h-[calc(100svh-var(--appbar-h,64px))] items-center border-b border-white/[0.06] px-6 py-16">
        <div className="mx-auto grid w-full max-w-[1240px] grid-cols-1 items-center gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-purple-300">
              Why QuickVoice
            </p>
            <h1 className="mt-7 text-[42px] font-bold leading-[1.05] tracking-tight md:text-[58px] xl:text-[64px]">
              Most translators
              <br />
              are a microphone{" "}
              <span className="text-gray-600">pointed at someone else&apos;s server.</span>
            </h1>
            <p className="mt-8 max-w-lg text-[16px] leading-relaxed text-gray-400 md:text-[17px]">
              This one runs where you are. That single difference decides what you can afford to say
              in front of it.
            </p>
          </div>

          <div className="mx-auto w-full max-w-[400px]">
            <div className="rounded-2xl border border-white/[0.09] bg-gradient-to-b from-white/[0.045] to-transparent p-6">
              <p className="mb-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Your machine
              </p>

              <div className="space-y-1.5">
                {[
                  { icon: Mic, tint: "text-blue-400", label: "Your voice", meta: "microphone" },
                  { icon: Cpu, tint: "text-cyan-400", label: "Whisper", meta: "listening" },
                  { icon: Languages, tint: "text-indigo-400", label: "fugumt", meta: "translating" },
                  { icon: Volume2, tint: "text-emerald-400", label: "Kokoro", meta: "speaking back" },
                ].map(({ icon: Icon, tint, label, meta }, index) => (
                  <div key={label}>
                    <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#0b0f18] px-4 py-3">
                      <Icon size={15} className={`shrink-0 ${tint}`} />
                      <span className="text-[13.5px] font-medium text-gray-200">{label}</span>
                      <span className="ml-auto text-[11px] text-gray-600">{meta}</span>
                    </div>
                    {index < 3 && (
                      <span className="ml-[26px] block h-3 w-px bg-white/[0.12]" aria-hidden />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* the line nothing crosses */}
            <div className="mt-5 flex items-center gap-3 px-1" aria-hidden>
              <span className="h-px flex-1 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.22)_0_6px,transparent_6px_12px)]" />
              <X size={13} className="text-gray-600" />
              <span className="h-px flex-1 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.22)_0_6px,transparent_6px_12px)]" />
            </div>
            <p className="mt-3 text-center text-[12.5px] text-gray-500">
              Nothing above this line crosses it
            </p>
          </div>
        </div>
      </section>

      {/* The comparison that carries the argument */}
      <section className="px-6 py-24">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-white/[0.08] pb-4 text-[11px] font-semibold uppercase tracking-[0.18em] sm:grid-cols-[1.4fr_1fr_1fr] sm:gap-x-8">
            <span className="text-gray-600">&nbsp;</span>
            <span className="text-right text-gray-500 sm:text-left">The usual way</span>
            <span className="text-right text-purple-300 sm:text-left">QuickVoice</span>
          </div>

          {COMPARISON.map(({ question, usual, ours }) => (
            <div
              key={question}
              className="grid grid-cols-[1fr_auto_auto] items-start gap-x-4 border-b border-white/[0.05] py-6 sm:grid-cols-[1.4fr_1fr_1fr] sm:items-center sm:gap-x-8"
            >
              <span className="text-[14px] font-medium text-gray-200 sm:text-[15px]">{question}</span>
              <span className="flex items-start justify-end gap-2 text-right text-[13px] text-gray-500 sm:justify-start sm:text-left">
                <X size={14} className="mt-0.5 shrink-0 text-gray-700" />
                {usual}
              </span>
              <span className="flex items-start justify-end gap-2 text-right text-[13px] text-white sm:justify-start sm:text-left">
                <Check size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                {ours}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* The claims, as full-width rows rather than boxes */}
      <section className="border-t border-white/[0.06] bg-[#070b14] px-6 py-24">
        <div className="mx-auto w-full max-w-[1240px]">
          {CLAIMS.map(({ number, title, body, aside }, index) => (
            <div
              key={number}
              className={`grid grid-cols-1 gap-6 py-12 md:grid-cols-[auto_1fr_auto] md:gap-12 ${
                index > 0 ? "border-t border-white/[0.06]" : ""
              }`}
            >
              <span className="text-[13px] font-semibold tracking-[0.2em] text-purple-400 md:pt-2">
                {number}
              </span>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight md:text-[28px]">{title}</h2>
                <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-gray-400">{body}</p>
              </div>
              <span className="self-start rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 font-mono text-[12px] text-gray-500 md:mt-2">
                {aside}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* The numbers, quietly */}
      <section className="px-6 py-20">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06] sm:grid-cols-3">
          {[
            { value: "2", label: "languages, both ways" },
            { value: "0", label: "third parties in the path" },
            { value: "1", label: "machine has to be running" },
          ].map(({ value, label }) => (
            <div key={label} className="bg-[#04070d] px-8 py-10 text-center">
              <p className="text-4xl font-bold tracking-tight text-white">{value}</p>
              <p className="mt-3 text-[13px] text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-12 flex w-full max-w-5xl justify-center">
          <Link
            href="/how-it-works"
            className="group inline-flex items-center gap-2 text-[14px] font-semibold text-purple-300 transition-colors hover:text-white"
          >
            See the four steps behind one exchange
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-6 py-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-4 text-[13px] text-gray-500 sm:flex-row">
          <span>QuickVoice — English and Japanese, on your own hardware.</span>
          <Link href="/landing" className="transition-colors hover:text-white">
            Back to QuickVoice
          </Link>
        </div>
      </footer>
    </div>
  );
}
