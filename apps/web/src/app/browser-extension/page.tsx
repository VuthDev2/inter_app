"use client";

import Link from "next/link";
import { ArrowRight, Check, Languages, MousePointer2, PanelRight, Plug, ShieldCheck } from "lucide-react";
import MarketingNav from "@/components/MarketingNav";

/**
 * The browser extension.
 *
 * Built around showing rather than telling: the thing it does is a menu that
 * appears over a page you are reading, so the page shows that. The "why" page
 * next door argues in rows of prose — two card grids under one nav read as the
 * same page written twice.
 *
 * The mockups are markup, not screenshots, so they stay sharp and follow the
 * theme, and every string in them matches what the built extension shows in
 * Chrome. The context menu is positioned over the paragraph the way a real one
 * is: small, tight, anchored at the pointer, covering the text underneath.
 */

const STEPS = [
  {
    step: "01",
    title: "Load it into Chrome",
    body: "chrome://extensions → Developer mode → Load unpacked → the extension's dist folder.",
  },
  {
    step: "02",
    title: "Paste your QuickVoice link",
    body: "The popup takes your web address and finds the model server and its credentials from there.",
  },
  {
    step: "03",
    title: "Highlight anything",
    body: "Right-click a selection on any page. The popup names the server it reached, so a broken connection is visible.",
  },
];

const NOTES = [
  { icon: ShieldCheck, tint: "text-emerald-400", title: "Nothing leaves your machine", body: "It asks the QuickVoice server you are running. No third-party translator sees the page." },
  { icon: Plug, tint: "text-cyan-400", title: "A new link is a paste, not a rebuild", body: "The address is discovered at runtime, so a re-issued tunnel never means editing code." },
  { icon: Languages, tint: "text-blue-400", title: "English and Japanese", body: "Both directions — the pair the on-device models were trained for, and nothing it would fail on." },
];

export default function BrowserExtensionPage() {
  return (
    <div className="min-h-screen w-full bg-[#04070d] text-white">
      <MarketingNav />

      {/* Hero: the product, demonstrated */}
      <section className="px-6 pt-16 pb-20">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-cyan-300">
              Browser extension
            </p>
            <h1 className="mt-6 text-4xl font-bold leading-[1.06] tracking-tight md:text-[50px]">
              A translator that
              <br />
              lives in the page
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-gray-400">
              Highlight a line anywhere — an article, an email, a chat — and read it back in the
              other language. No new tab, no pasting into a box somewhere else.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-2.5 text-[13px] text-gray-400">
              {["English → Japanese", "Japanese → English"].map((pair) => (
                <span
                  key={pair}
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5"
                >
                  <Check size={12} className="text-emerald-400" />
                  {pair}
                </span>
              ))}
            </div>
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

      {/* The side panel */}
      <section className="border-y border-white/[0.06] bg-[#070b14] px-6 py-20">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1fr]">
          <div className="order-2 lg:order-1">
            <div className="overflow-hidden rounded-xl border border-white/[0.1] bg-[#0a0f1a] shadow-[0_40px_90px_-30px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between border-b border-white/[0.07] bg-white/[0.03] px-4 py-2.5">
                <span className="flex items-center gap-2 text-[12px] font-semibold text-gray-300">
                  <PanelRight size={13} className="text-cyan-300" />
                  QuickVoice
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Connected
                </span>
              </div>
              <div className="space-y-3 p-4">
                <p className="text-[10px] uppercase tracking-widest text-gray-500">English</p>
                <div className="rounded-lg border border-white/[0.08] bg-black/30 p-3 text-[13px] leading-6 text-gray-300">
                  Could we move the meeting to Thursday afternoon?
                </div>
                <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-gray-600">
                  <span className="h-px flex-1 bg-white/[0.07]" />
                  translate
                  <span className="h-px flex-1 bg-white/[0.07]" />
                </div>
                <p className="text-[10px] uppercase tracking-widest text-cyan-300">Japanese</p>
                <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/[0.07] p-3 text-[14px] leading-7 text-white">
                  会議を木曜日の午後に変更できますか？
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <h2 className="text-3xl font-bold leading-tight tracking-tight md:text-[36px]">
              For the longer things
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-gray-400">
              A panel beside the page instead of over it. Paste a paragraph, send it either
              direction, and keep what you were reading in view the whole time.
            </p>
            <ul className="mt-7 space-y-3.5">
              {NOTES.map(({ icon: Icon, tint, title, body }) => (
                <li key={title} className="flex gap-3.5">
                  <Icon size={16} className={`mt-0.5 shrink-0 ${tint}`} />
                  <span className="text-[14px] leading-relaxed text-gray-400">
                    <span className="font-semibold text-gray-200">{title}.</span> {body}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Setup — tight two-column rows, no stranded space */}
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
                className="grid grid-cols-[auto_1fr] gap-x-5 border-b border-white/[0.08] py-6 sm:grid-cols-[auto_15rem_1fr] sm:gap-x-8 sm:py-7"
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
              Already running QuickVoice? The extension needs nothing else installed.
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
