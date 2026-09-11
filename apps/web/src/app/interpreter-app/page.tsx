"use client";

import Link from "next/link";
import { ArrowLeftRight, ArrowRight, Bookmark, Repeat, Tag, Volume2 } from "lucide-react";
import MarketingNav from "@/components/MarketingNav";
import { BrowserMock, IPadMock, IPhoneMock } from "@/components/DeviceMocks";
import { Card, NumberedList, PillButton } from "@/components/Surface";

/**
 * The interpreter itself — the thing the rest of the site is about.
 *
 * The mockups are drawn from the app's own code rather than imagined: the
 * strings, the flags, the tab bar and the one-way/two-way switch are the ones
 * that actually render. See components/DeviceMocks.tsx.
 */

const BEHAVIOURS = [
  {
    icon: Repeat,
    tint: "text-blue-400",
    title: "It hands the microphone back",
    body: "The translation is spoken, and listening resumes about six-tenths of a second after the voice stops — long enough not to hear itself, short enough that the reply just happens. Nobody has to press anything between turns.",
  },
  {
    icon: ArrowLeftRight,
    tint: "text-cyan-400",
    title: "Two-way means either of you",
    body: "Switch it on and both sides are live at once. A turn is filed under whichever language was actually spoken, not the one selected, so the two of you can swap without touching the screen.",
  },
  {
    icon: Tag,
    tint: "text-amber-400",
    title: "Names come through intact",
    body: "Words you protect are hidden behind placeholders before translation and restored after, so a person called Nana stays Nana instead of turning into the Japanese for grandmother halfway through.",
  },
  {
    icon: Bookmark,
    tint: "text-emerald-400",
    title: "The conversation is kept",
    body: "Save a session and it lands in History with both sides intact. Open it later, read it back, or carry it on from where it stopped — the transcript becomes the record of the meeting.",
  },
];

export default function InterpreterPage() {
  return (
    <div className="min-h-screen w-full bg-[#04070d] text-white">
      <MarketingNav />

      {/* Hero — the phone, because that is where a conversation happens */}
      <section className="flex min-h-[calc(100svh-var(--appbar-h,64px))] items-center px-6 py-16">
        <div className="mx-auto grid w-full max-w-[1240px] grid-cols-1 items-center gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-blue-300">
              Live interpreter
            </p>
            <h1 className="mt-7 text-[42px] font-bold leading-[1.05] tracking-tight md:text-[58px] xl:text-[64px]">
              Put the phone
              <br />
              on the table
              <br />
              <span className="text-gray-600">and just talk.</span>
            </h1>
            <p className="mt-8 max-w-lg text-[16px] leading-relaxed text-gray-400 md:text-[17px]">
              One side of the screen for each of you. Speak, hear it come back in the other
              language, and carry on — no pressing a button between turns, no handing the device
              across the table, no waiting for a menu.
            </p>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-gray-500">
              The same conversation runs on an iPhone, an iPad and in a browser, against the same
              models on your own machine.
            </p>
          </div>

          <IPhoneMock />
        </div>
      </section>

      {/* The tablet — the shared-table case */}
      <section className="border-y border-white/[0.06] bg-[#070b14] px-6 py-24">
        <div className="mx-auto grid w-full max-w-[1240px] grid-cols-1 items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div className="lg:order-2">
            <h2 className="text-[34px] font-bold leading-[1.06] tracking-tight md:text-[42px]">
              On a tablet, it becomes
              <br />
              a table between you
            </h2>
            <p className="mt-7 max-w-lg text-[15.5px] leading-relaxed text-gray-400">
              A bigger screen turns the two language cards into two seats. Each person reads their
              own side at a comfortable distance, the transcript stays visible while the answer is
              spoken, and neither of you has to lean in.
            </p>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-gray-500">
              This is the reception desk, the clinic, the meeting-room case — anywhere the device
              sits between two people rather than in one person&apos;s hand.
            </p>
          </div>
          <div className="lg:order-1">
            <IPadMock />
          </div>
        </div>
      </section>

      {/* The browser */}
      <section className="px-6 py-24">
        <div className="mx-auto grid w-full max-w-[1240px] grid-cols-1 items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <h2 className="text-[34px] font-bold leading-[1.06] tracking-tight md:text-[42px]">
              In a browser, with the
              <br />
              switch that changes everything
            </h2>
            <p className="mt-7 max-w-lg text-[15.5px] leading-relaxed text-gray-400">
              The web version adds one control the others keep implicit: one-way or two-way. One-way
              fixes the direction — useful when you are the only one speaking, into a room. Two-way
              opens both sides and lets the app decide from what it heard.
            </p>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-gray-500">
              Everything else matches: same models, same turn-taking, same history. It is the same
              interpreter, in a window.
            </p>
          </div>
          <BrowserMock />
        </div>
      </section>

      {/* What makes it a conversation */}
      <section className="border-t border-white/[0.06] bg-[#070b14] px-6 py-24">
        <div className="mx-auto w-full max-w-[1240px]">
          <h2 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight md:text-[42px]">
            What makes it a conversation rather than a translator
          </h2>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-gray-400">
            Translating one sentence is a feature. Four things turn that into two people talking
            without either of them managing the software.
          </p>

          <div className="mt-16 grid grid-cols-1 gap-x-14 gap-y-10 md:grid-cols-2">
            {BEHAVIOURS.map(({ icon: Icon, tint, title, body }) => (
              <div key={title} className="flex gap-4">
                <Icon size={18} className={`mt-1 shrink-0 ${tint}`} />
                <div>
                  <h3 className="text-[17px] font-semibold">{title}</h3>
                  <p className="mt-3 text-[14.5px] leading-relaxed text-gray-400">{body}</p>
                </div>
              </div>
            ))}
          </div>

          <Card className="mt-16 flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center md:p-10">
            <p className="flex items-center gap-3 text-[15px] leading-relaxed text-gray-300">
              <Volume2 size={18} className="shrink-0 text-gray-500" />
              English and Japanese, both directions, spoken aloud in a natural voice.
            </p>
            <PillButton href="/how-it-works">
              How a turn actually works
              <ArrowRight size={16} />
            </PillButton>
          </Card>
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
