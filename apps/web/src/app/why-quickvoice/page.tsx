"use client";

import Link from "next/link";
import { ArrowRight, Cpu, Gauge, Languages, ShieldCheck, Tag, WifiOff } from "lucide-react";
import MarketingNav from "@/components/MarketingNav";

/**
 * Why QuickVoice, as its own page.
 *
 * The claims here are deliberately checkable ones — where the models run, which
 * pair they handle, what happens with the network off — rather than adjectives.
 * A translator you cannot verify is a translator you cannot trust with a
 * conversation that matters.
 */

const REASONS = [
  {
    icon: ShieldCheck,
    tint: "text-purple-400",
    ring: "bg-purple-500/10",
    title: "Your conversation stays yours",
    body: "Speech goes to a server you started, on hardware you own. There is no third-party translation API in the path, so there is no copy of what you said sitting in someone else's logs.",
  },
  {
    icon: Cpu,
    tint: "text-blue-400",
    ring: "bg-blue-500/10",
    title: "The models are on the machine",
    body: "Whisper for listening, a translation model for meaning, a speech model for the reply — all loaded locally. The first run downloads them; after that they are simply there.",
  },
  {
    icon: Gauge,
    tint: "text-cyan-400",
    ring: "bg-cyan-500/10",
    title: "Fast enough to interrupt",
    body: "A turn comes back in well under a second on Apple silicon. That is the difference between a translated conversation and two people taking turns waiting.",
  },
  {
    icon: Languages,
    tint: "text-emerald-400",
    ring: "bg-emerald-500/10",
    title: "Two languages, done properly",
    body: "English and Japanese, both directions. A model trained for one pair beats a model that claims a hundred, and the app only ever offers what it can actually deliver.",
  },
  {
    icon: Tag,
    tint: "text-amber-400",
    ring: "bg-amber-500/10",
    title: "Names survive translation",
    body: "Add the words that matter — a person, a company, a product — and they are carried through untouched instead of being helpfully turned into something else.",
  },
  {
    icon: WifiOff,
    tint: "text-rose-400",
    ring: "bg-rose-500/10",
    title: "No account between you and a sentence",
    body: "The interpreting itself does not depend on anyone's service being up. Your own machine is the only thing that has to be running.",
  },
];

export default function WhyQuickVoicePage() {
  return (
    <div className="min-h-screen w-full bg-[#04070d] text-white">
      <MarketingNav />

      <section className="relative overflow-hidden px-6 pt-20 pb-16 md:pt-24">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[380px] w-[760px] -translate-x-1/2 rounded-full bg-purple-600/15 blur-[130px]"
        />
        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <span className="mb-6 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-300">
            Why QuickVoice
          </span>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight md:text-[52px]">
            Every word stays
            <br />
            on your hardware
          </h1>
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-gray-400 md:text-[16px]">
            Most translators are a microphone pointed at someone else's server. QuickVoice runs the
            models where you are, which changes what you can say in front of it.
          </p>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {REASONS.map(({ icon: Icon, tint, ring, title, body }) => (
            <div
              key={title}
              className="rounded-[2rem] border border-gray-800/80 bg-[#0b1221] p-8 transition-colors hover:border-gray-700"
            >
              <div className={`mb-6 flex h-10 w-10 items-center justify-center rounded-full ${ring}`}>
                <Icon size={18} className={tint} />
              </div>
              <h2 className="mb-4 text-[16px] font-semibold">{title}</h2>
              <p className="text-[14px] leading-relaxed text-gray-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-white/[0.06] bg-[#070b14] px-6 py-24">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center rounded-[2rem] border border-white/[0.08] bg-white/[0.02] px-8 py-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            See it happen, one turn at a time
          </h2>
          <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-gray-400">
            The four steps behind a single exchange — listening, understanding, translating and
            speaking back — laid out as you scroll.
          </p>
          <Link
            href="/how-it-works"
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-blue-500"
          >
            How it works
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
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
