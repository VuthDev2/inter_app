"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown, Maximize2, Mic, MousePointer2, NotebookPen, ShieldCheck } from "lucide-react";
import MarketingNav from "@/components/MarketingNav";

/**
 * The browser extension.
 *
 * Written from the panel as it is being built: a live transcript that sits
 * beside whatever you are listening to, not the right-click text translator
 * the older code in extension/src still implements. When that code catches up
 * this page is already describing the right thing; until then it describes
 * where the extension is going, which is what a page like this is for.
 *
 * The panel below is markup rather than a screenshot, so it stays sharp, keeps
 * the site's theme, and can be corrected in seconds when the real one moves.
 */

const CAPABILITIES = [
  {
    icon: Mic,
    tint: "text-blue-400",
    title: "One button, then it listens",
    body: "Press Start and speak — or let it run through a call. Lines land in the transcript as they are spoken, rather than after everyone has stopped talking.",
  },
  {
    icon: ArrowRight,
    tint: "text-cyan-400",
    title: "Pick a direction, or leave it on",
    body: "Japanese to English, English to Japanese. With translation switched on, every line arrives already turned around underneath the original.",
  },
  {
    icon: NotebookPen,
    tint: "text-amber-400",
    title: "Notes, in the same place",
    body: "Add a note against the transcript while it is running, so the thing you needed to remember is filed with the sentence that caused it.",
  },
  {
    icon: ShieldCheck,
    tint: "text-emerald-400",
    title: "Nothing leaves the machine",
    body: "Audio goes to the QuickVoice server you are running and stops there. No meeting recording is uploaded to a service you do not control.",
  },
];

const STEPS = [
  { step: "01", title: "Load it into Chrome", body: "chrome://extensions → Developer mode → Load unpacked → the extension's folder." },
  { step: "02", title: "Paste your QuickVoice link", body: "The popup takes your web address and finds the model server and its credentials from there." },
  { step: "03", title: "Open the panel and press Start", body: "It sits beside the tab you are on, so the call, the video or the page stays in view." },
];

export default function BrowserExtensionPage() {
  return (
    <div className="min-h-screen w-full bg-[#04070d] text-white">
      <MarketingNav />

      {/* Hero — the panel itself, doing its job */}
      <section className="flex min-h-[calc(100svh-var(--appbar-h,64px))] items-center px-6 py-16">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-cyan-300">
              Browser extension
            </p>
            <h1 className="mt-6 max-w-xl text-4xl font-bold leading-[1.06] tracking-tight md:text-[50px]">
              A live transcript,
              <br />
              beside whatever
              <br />
              you are listening to
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-gray-400">
              Open the panel next to a call, a video or a lecture, press Start, and read what is
              being said as it is said — in the other language, if you want it that way.
            </p>
            <div className="mt-8 flex flex-wrap gap-2.5 text-[13px] text-gray-400">
              {["Japanese → English", "English → Japanese"].map((pair) => (
                <span
                  key={pair}
                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5"
                >
                  {pair}
                </span>
              ))}
            </div>
          </div>

          {/* The side panel, as it looks in Chrome */}
          <div className="mx-auto w-full max-w-[340px]">
            <div className="overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0d0f12] shadow-[0_40px_90px_-30px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3.5">
                <span className="flex items-center gap-2.5">
                  <Mic size={16} className="text-blue-500" />
                  <span className="text-[15px] font-bold tracking-tight">QuickVoice</span>
                </span>
                <Maximize2 size={14} className="text-gray-500" />
              </div>

              <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                <span className="flex items-center gap-2 text-[12.5px] font-semibold">
                  Japanese
                  <ChevronDown size={12} className="text-gray-500" />
                  <span className="px-1 text-gray-600">→</span>
                  English
                  <ChevronDown size={12} className="text-gray-500" />
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-wider text-gray-400">ON</span>
                  <span className="flex h-[18px] w-8 items-center rounded-full bg-blue-600 px-0.5">
                    <span className="ml-auto h-[14px] w-[14px] rounded-full bg-white" />
                  </span>
                </span>
              </div>

              <div className="px-4 py-3">
                <p className="text-center text-[10px] font-semibold tracking-[0.18em] text-gray-500">
                  LIVE TRANSCRIPT
                </p>
                <div className="mt-3 h-px bg-white/[0.07]" />

                <div className="space-y-3.5 py-4">
                  <div>
                    <p className="text-[13px] leading-6 text-gray-300">次の駅で乗り換えてください。</p>
                    <p className="mt-1 text-[13px] leading-6 text-cyan-300">
                      Please change trains at the next station.
                    </p>
                  </div>
                  <div>
                    <p className="text-[13px] leading-6 text-gray-300">改札は北口にあります。</p>
                    <p className="mt-1 text-[13px] leading-6 text-cyan-300">
                      The ticket gate is at the north exit.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-gray-500">
                    <span className="flex gap-[3px]">
                      {[10, 16, 7, 13].map((h, i) => (
                        <span
                          key={i}
                          style={{ height: `${h}px` }}
                          className="w-[2px] rounded-full bg-blue-500/70"
                        />
                      ))}
                    </span>
                    listening…
                  </div>
                </div>

                <div className="h-px bg-white/[0.07]" />
                <p className="flex items-center gap-2 py-3 text-[12.5px] text-gray-500">
                  <NotebookPen size={13} />
                  Add Note
                </p>
                <button
                  type="button"
                  className="mb-1 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2f6bff] py-3 text-[14px] font-semibold text-white"
                >
                  <Mic size={15} />
                  Start
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Reading, rather than listening — the other half of what it does */}
      <section className="flex min-h-[calc(100svh-var(--appbar-h,64px))] items-center border-y border-white/[0.06] px-6 py-16">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <h2 className="text-3xl font-bold leading-tight tracking-tight md:text-[38px]">
              Or just highlight
              <br />
              something
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-gray-400">
              Not everything worth translating is spoken. Select a line in an article, an email or a
              chat, right-click, and read it back in the other language — without leaving the page
              or opening the panel at all.
            </p>
            <ul className="mt-7 space-y-3 text-[14px] leading-relaxed text-gray-400">
              {[
                "The answer appears where you are, not in another tab",
                "Same models, same server — nothing new to set up",
                "Works on any page, including ones you cannot copy from comfortably",
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-cyan-400" />
                  {line}
                </li>
              ))}
            </ul>
          </div>

            {/* A real page, with the menu open over the paragraph */}
            <div className="overflow-hidden rounded-xl border border-white/[0.1] bg-[#0a0f1a] shadow-[0_40px_90px_-30px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-2 border-b border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 flex-1 truncate rounded bg-black/40 px-2.5 py-1 text-[10px] text-gray-500">
                  news.example.jp/article/2891
                </span>
              </div>

              <div className="relative px-6 pb-6 pt-5">
                <p className="text-[11px] uppercase tracking-widest text-gray-600">交通・地域</p>
                <h2 className="mt-2 text-[19px] font-semibold leading-snug text-gray-200">
                  新しい地下鉄の路線が今月開通します
                </h2>
                <p className="mt-3.5 text-[13.5px] leading-7 text-gray-500">
                  今月末から新路線の運行が始まります。乗り換えは次の駅で行ってください。
                  観光客からの問い合わせで最も多いのは{" "}
                  <span className="rounded-[3px] bg-[#2f6bff]/45 px-1 py-[3px] text-white">
                    駅はどこですか？
                  </span>{" "}
                  という一言だといいます。改札は北口にあり、案内板に従って進むと五分ほどで到着します。
                </p>
                <p className="mt-3 text-[13.5px] leading-7 text-gray-600">
                  初日は臨時ダイヤで運行し、主要な駅には案内係が立つ予定です。詳しい時刻は公式サイトをご覧ください。
                </p>

                {/* the menu, over the text and anchored at the pointer */}
                <div className="pointer-events-none absolute left-[44%] top-[44%] z-10 w-[228px] overflow-hidden rounded-lg border border-white/[0.12] bg-[#1c212c] py-1 shadow-[0_20px_50px_-10px_rgba(0,0,0,.95)]">
                  {["Copy", "Search the web for “駅は…”"].map((item) => (
                    <div key={item} className="truncate px-3 py-[7px] text-[11.5px] text-gray-400">
                      {item}
                    </div>
                  ))}
                  <div className="my-1 h-px bg-white/[0.08]" />
                  <div className="flex items-center gap-2 bg-[#2f6bff] px-3 py-[7px] text-[11.5px] font-medium text-white">
                    <MousePointer2 size={12} />
                    Translate with QuickVoice
                  </div>
                </div>

                <div className="mt-7 flex items-center gap-3 rounded-lg border border-emerald-400/25 bg-emerald-500/[0.09] px-4 py-3">
                  <span className="rounded bg-emerald-500/20 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                    EN
                  </span>
                  <p className="text-[14px] text-white">Where is the station?</p>
                </div>
              </div>
            </div>
        </div>
      </section>

      {/* What it does */}
      <section className="border-y border-white/[0.06] bg-[#070b14] px-6 py-20">
        <div className="mx-auto w-full max-w-5xl">
          <div className="grid grid-cols-1 gap-x-14 gap-y-10 sm:grid-cols-2">
            {CAPABILITIES.map(({ icon: Icon, tint, title, body }) => (
              <div key={title} className="flex gap-4">
                <Icon size={18} className={`mt-1 shrink-0 ${tint}`} />
                <div>
                  <h2 className="text-[16px] font-semibold">{title}</h2>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-gray-400">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Setup */}
      <section className="px-6 py-20">
        <div className="mx-auto w-full max-w-4xl">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="text-3xl font-bold tracking-tight">Two minutes to set up</h2>
            <span className="text-[13px] text-gray-500">Only the middle step is QuickVoice-specific</span>
          </div>

          <div className="mt-10 border-t border-white/[0.08]">
            {STEPS.map(({ step, title, body }) => (
              <div
                key={step}
                className="grid grid-cols-[auto_1fr] gap-x-5 border-b border-white/[0.08] py-6 sm:grid-cols-[auto_16rem_1fr] sm:gap-x-8 sm:py-7"
              >
                <span className="font-mono text-[12px] text-cyan-400 sm:pt-1">{step}</span>
                <h3 className="text-[16px] font-semibold">{title}</h3>
                <p className="col-span-2 mt-2 text-[14px] leading-relaxed text-gray-400 sm:col-span-1 sm:mt-0 sm:pt-0.5">
                  {body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <p className="max-w-sm text-[13px] leading-relaxed text-gray-500">
              English and Japanese, both directions — the pair the on-device models were trained for.
            </p>
            <Link
              href="/why-quickvoice"
              className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-5 py-2.5 text-[14px] font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/20"
            >
              Why it runs on your machine
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-6 py-9">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-4 text-[13px] text-gray-500 sm:flex-row">
          <span>QuickVoice Companion — runs against your own QuickVoice server.</span>
          <Link href="/landing" className="transition-colors hover:text-white">
            Back to QuickVoice
          </Link>
        </div>
      </footer>
    </div>
  );
}
