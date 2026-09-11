"use client";

import Link from "next/link";
import { ArrowRight, Ear, Languages, Mic, Timer, Volume2 } from "lucide-react";
import MarketingNav from "@/components/MarketingNav";
import ConversationStory from "@/components/ConversationStory";
import Highlight from "@/components/Highlight";

/**
 * How it works.
 *
 * The scroll-driven scene carries the shape of a turn; everything below it is
 * the detail that scene cannot hold — what each stage actually is, where the
 * time goes, and the problems that only appear once two people are genuinely
 * talking. The numbers are the ones measured on this project's own hardware,
 * not marketing rounding.
 */

const STAGES = [
  {
    icon: Mic,
    tint: "text-blue-400",
    ring: "bg-blue-500/10",
    number: "01",
    title: "It hears you",
    body: "Audio is captured at whatever rate your hardware prefers rather than a number the app insists on — asking an iPad for 16kHz when its microphone runs at 48 produced perfect silence, at the right length, with no error. The stream goes to Whisper running on your own machine.",
    detail: "Whisper small · Metal",
  },
  {
    icon: Ear,
    tint: "text-cyan-400",
    ring: "bg-cyan-500/10",
    number: "02",
    title: "It works out when you stopped",
    body: "Speech is judged as a rise above the room, not against a fixed loudness, so a quiet office and a busy street both work. The room level is re-learnt continuously; once you go quiet for about seven-tenths of a second, the turn is closed and sent.",
    detail: "adaptive gate · 700ms tail",
  },
  {
    icon: Languages,
    tint: "text-indigo-400",
    ring: "bg-indigo-500/10",
    number: "03",
    title: "It crosses the language",
    body: "A pair of models trained for exactly this direction turn the sentence around. Crucially the app routes by the language it actually heard, not the one you selected — say something in Japanese while English is picked and it still goes the right way.",
    detail: "fugumt en⇄ja · int8",
  },
  {
    icon: Volume2,
    tint: "text-emerald-400",
    ring: "bg-emerald-500/10",
    number: "04",
    title: "It speaks back, then listens again",
    body: "The translation is spoken aloud, and the microphone reopens shortly after the voice stops — long enough that the app does not transcribe itself, short enough that the other person can simply reply. That reopening is what makes it a conversation instead of a series of recordings.",
    detail: "Kokoro · mic returns in 600ms",
  },
];

const TIMELINE = [
  { label: "You stop speaking", value: "0ms", tint: "bg-white/25" },
  { label: "Turn closed, audio sent", value: "~700ms", tint: "bg-blue-500" },
  { label: "Whisper returns the text", value: "~350ms", tint: "bg-cyan-400" },
  { label: "Translation returns", value: "~100ms", tint: "bg-indigo-400" },
  { label: "Voice begins", value: "~250ms", tint: "bg-emerald-400" },
];

const HARD_PARTS = [
  {
    title: "It must not translate itself",
    body: "The moment a translation is spoken aloud, the microphone can hear it — and a translated sentence, re-heard, translates again. That loop will run forever if nothing stops it. Each spoken line is remembered and compared against whatever comes back, so the app's own voice is recognised and dropped rather than answered.",
  },
  {
    title: "Names are not words",
    body: "A translator has no way of knowing that Nana is a person. Left alone it becomes the Japanese for grandmother, mid-sentence, and the meaning quietly changes. Words you list are hidden behind placeholders before translation and put back afterwards, so they cross unchanged.",
  },
  {
    title: "Silence is ambiguous",
    body: "A pause for breath and the end of a sentence look identical to a microphone. Cut too early and one sentence arrives as three fragments; wait too long and the conversation stalls. The gap sits just above a Japanese clause break — long enough to think, short enough to feel immediate.",
  },
  {
    title: "A wrong guess needs a fallback",
    body: "Nothing is transcribed until you stop, so a missed word is invisible until it is too late. When the gate rejects a turn that still had a plausible rise above the room, it is sent anyway: one wasted request costs far less than a lost sentence.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen w-full bg-[#04070d] text-white">
      <MarketingNav />

      {/* Hero */}
      <section className="flex min-h-[calc(100svh-var(--appbar-h,64px))] items-center px-6 py-16">
        <div className="mx-auto grid w-full max-w-[1240px] grid-cols-1 items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-blue-300">
              How it works
            </p>
            {/* Deliberately not "Four steps. One natural conversation." — the
                scene below says exactly that, and hearing it twice in one
                scroll made the page read as itself, repeated. */}
            <h1 className="mt-7 text-[42px] font-bold leading-[1.05] tracking-tight md:text-[58px] xl:text-[64px]">
              A second and a half,
              <br />
              from spoken
              <br />
              <span className="text-gray-600">to spoken back.</span>
            </h1>
            <p className="mt-8 max-w-lg text-[16px] leading-relaxed text-gray-400 md:text-[17px]">
              You speak. It listens, works out that you have finished, crosses the language and
              answers aloud — then hands the microphone back so the other person can reply. The
              whole round trip takes <Highlight tone="blue">about a second and a half</Highlight>, and
              <Highlight tone="softEmerald">none of it leaves the machine you started it on</Highlight>.
            </p>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-gray-500">
              What follows is the honest version: what each stage actually is, where the time goes,
              and <Highlight>the four problems that only appear once two people are really talking</Highlight>.
            </p>
          </div>

          {/* Where the time goes */}
          <div className="mx-auto w-full max-w-[400px]">
            <div className="rounded-2xl border border-white/[0.09] bg-gradient-to-b from-white/[0.045] to-transparent p-6">
              <p className="mb-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                <Timer size={13} />
                One turn, end to end
              </p>
              <div className="space-y-4">
                {TIMELINE.map(({ label, value, tint }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tint}`} />
                    <span className="text-[13.5px] text-gray-300">{label}</span>
                    <span className="ml-auto font-mono text-[12px] text-gray-500">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 border-t border-white/[0.08] pt-4">
                <p className="flex items-baseline justify-between">
                  <span className="text-[13px] text-gray-400">Heard to answered</span>
                  <span className="font-mono text-[15px] font-semibold text-white">≈1.4s</span>
                </p>
              </div>
            </div>
            <p className="mt-4 px-1 text-[12.5px] leading-relaxed text-gray-600">
              Measured on Apple silicon with the models warm. The first turn after a cold start is
              slower while they load.
            </p>
          </div>
        </div>
      </section>

      <ConversationStory />

      {/* The four stages in detail */}
      <section className="border-t border-white/[0.06] bg-[#070b14] px-6 py-24">
        <div className="mx-auto w-full max-w-[1240px]">
          <h2 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight md:text-[42px]">
            The same four steps, with the detail put back in
          </h2>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-gray-400">
            Each stage is <Highlight tone="soft">a real piece of software doing one job on your machine</Highlight>.
            Here is what each of them is, and the decision inside it that mattered most.
          </p>

          <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {STAGES.map(({ icon: Icon, tint, ring, number, title, body, detail }) => (
              <div
                key={number}
                className="rounded-[2rem] border border-gray-800/80 bg-[#0b1221] p-8 transition-colors hover:border-gray-700"
              >
                <div className="mb-6 flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${ring}`}>
                    <Icon size={18} className={tint} />
                  </div>
                  <span className="text-[13px] font-semibold tracking-[0.2em] text-gray-500">{number}</span>
                  <span className="ml-auto rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 font-mono text-[11px] text-gray-500">
                    {detail}
                  </span>
                </div>
                <h3 className="mb-4 text-[18px] font-semibold">{title}</h3>
                <p className="text-[14.5px] leading-relaxed text-gray-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The hard parts */}
      <section className="px-6 py-24">
        <div className="mx-auto w-full max-w-[1240px]">
          <h2 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight md:text-[42px]">
            The parts that only show up in a real conversation
          </h2>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-gray-400">
            <Highlight tone="amber">Translating a sentence is the easy half.</Highlight> These four are what
            stand between a working demo and something two people can actually talk through.
          </p>

          <div className="mt-14">
            {HARD_PARTS.map(({ title, body }, index) => (
              <div
                key={title}
                className={`grid grid-cols-1 gap-4 py-9 md:grid-cols-[0.8fr_1.2fr] md:gap-12 ${
                  index > 0 ? "border-t border-white/[0.07]" : "border-t border-white/[0.07]"
                }`}
              >
                <h3 className="text-[19px] font-semibold leading-snug md:text-[21px]">{title}</h3>
                <p className="text-[15px] leading-relaxed text-gray-400">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col items-start justify-between gap-6 border-t border-white/[0.07] pt-10 sm:flex-row sm:items-center">
            <p className="max-w-md text-[14px] leading-relaxed text-gray-500">
              All of it runs on the machine you start it on. Nothing is sent to a cloud translator,
              which is the reason the rest of it had to be solved this way.
            </p>
            <Link
              href="/why-quickvoice"
              className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-5 py-2.5 text-[14px] font-semibold text-blue-200 transition-colors hover:bg-blue-500/20"
            >
              Why that matters
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-6 py-9">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col items-center justify-between gap-4 text-[13px] text-gray-500 sm:flex-row">
          <span>QuickVoice — English and Japanese, on your own hardware.</span>
          <Link href="/landing" className="transition-colors hover:text-white">
            Back to QuickVoice
          </Link>
        </div>
      </footer>
    </div>
  );
}
