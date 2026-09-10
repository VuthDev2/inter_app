"use client";

import Link from "next/link";
import {
  Check,
  Globe,
  Languages,
  MousePointerClick,
  PanelRight,
  ShieldCheck,
} from "lucide-react";
import MarketingNav from "@/components/MarketingNav";

/**
 * A page of its own for the browser extension.
 *
 * Standalone rather than a section of the welcome page, and standalone rather
 * than a page inside the signed-in app: someone deciding whether to install
 * this has not signed in yet, so it cannot sit behind the auth guard.
 *
 * Everything claimed here was checked against the built extension running in
 * Chrome. The older in-app page promises tab-audio capture, translating "any
 * language" and typing translations into fields on other sites; the extension
 * does none of that, and a page that oversells it only sets up a
 * disappointment on first use.
 */

const CAPABILITIES = [
  {
    icon: MousePointerClick,
    tint: "text-blue-400",
    ring: "bg-blue-500/10",
    title: "Right-click any selection",
    body: "Highlight a sentence in an article, an email or a chat, and choose Translate selection with QuickVoice. The answer comes back where you are — no copying it into another window first.",
  },
  {
    icon: PanelRight,
    tint: "text-cyan-400",
    ring: "bg-cyan-500/10",
    title: "A side panel that stays put",
    body: "For longer passages, open the panel and paste. It sends text either direction, English to Japanese or back, while the page you are reading stays open beside it.",
  },
  {
    icon: ShieldCheck,
    tint: "text-emerald-400",
    ring: "bg-emerald-500/10",
    title: "Answers from your own machine",
    body: "The extension talks to the QuickVoice server you are running. Whatever you highlight goes to your computer and nowhere else — there is no third-party translation service in the path.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Load it into Chrome",
    body: "Open chrome://extensions, turn on Developer mode, choose Load unpacked, and pick the extension's dist folder.",
  },
  {
    step: "02",
    title: "Point it at your server",
    body: "Open the extension's popup and paste your QuickVoice web address. It finds the model server and its own credentials from there, so a new link never means editing code.",
  },
  {
    step: "03",
    title: "Highlight something",
    body: "Right-click a selection on any page. The popup names the server it reached, so you can tell at a glance whether it is connected.",
  },
];

export default function BrowserExtensionPage() {
  return (
    <div className="min-h-screen w-full bg-[#04070d] text-white">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-20 pb-24 md:pt-28">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-blue-600/15 blur-[130px]"
        />
        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-300">
            <Globe size={13} />
            Browser extension
          </span>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight md:text-[54px]">
            Translate the page
            <br />
            you are already on
          </h1>
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-gray-400 md:text-[16px]">
            QuickVoice Companion puts the same on-device models behind a right-click. It reads what
            you highlight, sends it to the QuickVoice server on your own computer, and gives it back
            in the other language.
          </p>
        </div>
      </section>

      {/* What it does */}
      <section className="px-6 pb-24">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
          {CAPABILITIES.map(({ icon: Icon, tint, ring, title, body }) => (
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

      {/* Setup */}
      <section className="border-t border-white/[0.06] bg-[#070b14] px-6 py-24">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="text-center text-3xl font-bold tracking-wide">Three steps to set it up</h2>
          <p className="mt-4 text-center text-[14px] text-gray-400">
            About two minutes, and only the middle one is specific to QuickVoice.
          </p>

          <ol className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map(({ step, title, body }) => (
              <li
                key={step}
                className="relative rounded-[2rem] border border-white/[0.07] bg-white/[0.02] p-8"
              >
                <span className="text-[13px] font-semibold tracking-[0.2em] text-blue-400">{step}</span>
                <h3 className="mt-4 text-[15px] font-semibold text-gray-100">{title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-gray-400">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Languages, stated plainly */}
      <section className="px-6 py-24">
        <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-white/[0.08] bg-white/[0.02] p-10 text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05]">
            <Languages size={22} className="text-gray-300" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">English and Japanese</h2>
          <p className="mx-auto mt-4 max-w-xl text-[14px] leading-relaxed text-gray-400">
            Both directions, and no others. The models that run on your machine are trained on that
            one pair, so the extension offers exactly what it can translate rather than a longer
            list that fails at the last moment.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-[13px] text-gray-300">
            {["English → Japanese", "Japanese → English"].map((pair) => (
              <span
                key={pair}
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2"
              >
                <Check size={14} className="text-emerald-400" />
                {pair}
              </span>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-6 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 text-[13px] text-gray-500 sm:flex-row">
          <span>QuickVoice Companion — runs against your own QuickVoice server.</span>
          <Link href="/landing" className="transition-colors hover:text-white">
            Back to QuickVoice
          </Link>
        </div>
      </footer>
    </div>
  );
}
