"use client";

import Link from "next/link";
import { ArrowRight, Check, MousePointer2, PanelRight } from "lucide-react";
import MarketingNav from "@/components/MarketingNav";

/**
 * The browser extension.
 *
 * Shaped around showing rather than telling: the thing it does is a menu that
 * appears over a page you are reading, so the page shows that menu instead of
 * describing it in a card. The "why" page next door makes an argument in rows
 * of prose — two card grids under one nav read as the same page written twice.
 *
 * The mockups below are plain markup, not screenshots, so they stay sharp and
 * keep working in both themes. Every word in them matches what the built
 * extension actually shows in Chrome.
 */

const STEPS = [
  {
    step: "01",
    title: "Load it into Chrome",
    body: "chrome://extensions → Developer mode → Load unpacked → pick the extension's dist folder.",
  },
  {
    step: "02",
    title: "Paste your QuickVoice link",
    body: "Open the popup and give it your web address. It finds the model server and its credentials from there.",
  },
  {
    step: "03",
    title: "Highlight anything",
    body: "Right-click a selection on any page. The popup names the server it reached, so connection problems are visible.",
  },
];

export default function BrowserExtensionPage() {
  return (
    <div className="min-h-screen w-full bg-[#04070d] text-white">
      <MarketingNav />

      {/* Hero: the product, demonstrated */}
      <section className="px-6 pt-20 pb-24 md:pt-24">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-cyan-300">
              Browser extension
            </p>
            <h1 className="mt-7 text-4xl font-bold leading-[1.08] tracking-tight md:text-[52px]">
              A translator that
              <br />
              lives in the page
            </h1>
            <p className="mt-7 max-w-lg text-[16px] leading-relaxed text-gray-400">
              Highlight a line anywhere — an article, an email, a chat — and read it back in the
              other language. No new tab, no pasting into a box somewhere else.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3 text-[13px] text-gray-400">
              {["English → Japanese", "Japanese → English"].map((pair) => (
                <span
                  key={pair}
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2"
                >
                  <Check size={13} className="text-emerald-400" />
                  {pair}
                </span>
              ))}
            </div>
          </div>

          {/* A page with a selection and the context menu over it */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0a0f1a] shadow-[0_30px_80px_-20px_rgba(0,0,0,.9)]">
              <div className="flex items-center gap-2 border-b border-white/[0.07] bg-white/[0.03] px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 truncate rounded-md bg-black/40 px-3 py-1 text-[11px] text-gray-500">
                  news.example.jp/article
                </span>
              </div>

              <div className="relative p-7">
                <p className="text-[15px] leading-8 text-gray-400">
                  次の駅で乗り換えてください。{" "}
                  <span className="rounded bg-blue-500/35 px-1 py-0.5 text-white">
                    駅はどこですか？
                  </span>{" "}
                  改札は北口にあります。案内板に従って進んでください。
                </p>

                {/* the menu item that does the work */}
                <div className="mt-5 w-[280px] overflow-hidden rounded-xl border border-white/[0.1] bg-[#161b26] shadow-2xl">
                  <div className="px-4 py-2.5 text-[12px] text-gray-500">Copy</div>
                  <div className="px-4 py-2.5 text-[12px] text-gray-500">Search the web</div>
                  <div className="flex items-center gap-2.5 border-t border-white/[0.07] bg-blue-500/15 px-4 py-2.5 text-[12px] font-medium text-blue-200">
                    <MousePointer2 size={13} />
                    Translate selection with QuickVoice
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-emerald-300">Translation</p>
                  <p className="mt-1.5 text-[15px] text-white">Where is the station?</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The side panel, shown the same way */}
      <section className="border-y border-white/[0.06] bg-[#070b14] px-6 py-24">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="order-2 lg:order-1">
            <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0a0f1a] shadow-[0_30px_80px_-20px_rgba(0,0,0,.9)]">
              <div className="flex items-center justify-between border-b border-white/[0.07] bg-white/[0.03] px-4 py-3">
                <span className="flex items-center gap-2 text-[12px] font-semibold text-gray-300">
                  <PanelRight size={14} className="text-cyan-300" />
                  QuickVoice
                </span>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
                  Connected
                </span>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-widest text-gray-500">English</p>
                  <div className="rounded-lg border border-white/[0.08] bg-black/30 p-3.5 text-[13px] leading-6 text-gray-300">
                    Could we move the meeting to Thursday afternoon?
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-600">
                  <span className="h-px flex-1 bg-white/[0.07]" />
                  translate
                  <span className="h-px flex-1 bg-white/[0.07]" />
                </div>
                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-widest text-cyan-300">Japanese</p>
                  <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/[0.07] p-3.5 text-[14px] leading-7 text-white">
                    会議を木曜日の午後に変更できますか？
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <h2 className="text-3xl font-bold leading-tight tracking-tight md:text-[38px]">
              For the longer things
            </h2>
            <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-gray-400">
              A panel that opens beside the page instead of over it. Paste a paragraph, send it
              either direction, and keep what you were reading in view the whole time.
            </p>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-gray-400">
              It talks to the QuickVoice server you are running, so the words go to your own
              computer and stop there.
            </p>
          </div>
        </div>
      </section>

      {/* Setup, as a numbered run rather than three boxes */}
      <section className="px-6 py-24">
        <div className="mx-auto w-full max-w-5xl">
          <h2 className="text-3xl font-bold tracking-tight">Two minutes to set up</h2>
          <div className="mt-14 space-y-px">
            {STEPS.map(({ step, title, body }) => (
              <div
                key={step}
                className="grid grid-cols-[auto_1fr] items-baseline gap-x-6 border-t border-white/[0.07] py-8 sm:grid-cols-[auto_0.9fr_1.4fr] sm:gap-x-10"
              >
                <span className="font-mono text-[13px] text-cyan-400">{step}</span>
                <h3 className="text-[17px] font-semibold">{title}</h3>
                <p className="col-span-2 mt-3 text-[14px] leading-relaxed text-gray-400 sm:col-span-1 sm:mt-0">
                  {body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-16 flex flex-col items-start justify-between gap-6 border-t border-white/[0.07] pt-10 sm:flex-row sm:items-center">
            <p className="max-w-md text-[14px] leading-relaxed text-gray-500">
              English and Japanese only — the pair the on-device models were trained for, so the
              extension never offers a language it would fail on.
            </p>
            <Link
              href="/why-quickvoice"
              className="group inline-flex shrink-0 items-center gap-2 text-[14px] font-semibold text-cyan-300 transition-colors hover:text-white"
            >
              Why it runs on your machine
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-6 py-10">
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
