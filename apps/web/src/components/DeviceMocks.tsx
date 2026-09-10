"use client";

import { ArrowLeftRight, ChevronDown, Clock, FileText, Mic, MoreHorizontal, Pause, Send, Settings, Volume2, Waves } from "lucide-react";

/**
 * The Live Interpreter, drawn from the app rather than imagined.
 *
 * Every string here is the one the code actually renders — "Tap to speak",
 * "Type something…", "日本語を入力…", "Listening…", the 🇺🇸/🇯🇵 flags from FLAGS
 * in SessionScreen.tsx, and the four tabs from App.tsx. Markup rather than
 * screenshots, so they stay sharp, follow the site's theme, and can be
 * corrected the moment the app moves.
 */

function LanguageCard({
  flag,
  label,
  text,
  muted,
  align = "left",
}: {
  flag: string;
  label: string;
  text: string;
  muted?: boolean;
  align?: "left" | "right";
}) {
  return (
    <div
      className={`rounded-2xl bg-white/[0.045] p-3.5 ${align === "right" ? "ml-auto" : "mr-auto"}`}
      style={{ width: "88%" }}
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-semibold text-gray-200">
        <span>{flag}</span>
        {label}
        <ChevronDown size={10} className="text-gray-500" />
      </span>
      <p className={`mt-2.5 text-[13px] ${muted ? "text-gray-600" : "text-gray-200"}`}>{text}</p>
    </div>
  );
}

/** The phone: one column, cards stacked, the mic under them. */
export function IPhoneMock() {
  return (
    <div className="relative mx-auto w-[286px]">
      <div className="rounded-[42px] border border-white/[0.14] bg-[#0b0d11] p-2.5 shadow-[0_50px_100px_-30px_rgba(0,0,0,1)]">
        <div className="relative overflow-hidden rounded-[34px] bg-[#050609]">
          {/* the notch */}
          <div className="absolute left-1/2 top-2 z-10 h-[22px] w-[92px] -translate-x-1/2 rounded-full bg-black" />

          <div className="flex h-[560px] flex-col px-4 pb-3 pt-9">
            <div className="flex items-center justify-between">
              <MoreHorizontal size={15} className="text-gray-600" />
              <span className="text-[14px] font-bold tracking-tight text-white">Live Interpreter</span>
              <MoreHorizontal size={15} className="text-gray-500" />
            </div>

            <div className="mt-auto space-y-2.5">
              <LanguageCard flag="🇯🇵" label="Japanese" text="日本語を入力…" muted align="right" />
              <LanguageCard flag="🇺🇸" label="English" text="Type something…" muted />
            </div>

            <div className="mt-5 flex flex-col items-center">
              <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#2f6bff] shadow-[0_0_28px_rgba(47,107,255,.45)]">
                <Mic size={20} className="text-white" />
              </span>
              <span className="mt-2 text-[11px] text-gray-500">Tap to speak</span>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/[0.05] px-2 py-2">
              {[
                { icon: Waves, label: "Live", active: true },
                { icon: Mic, label: "Record" },
                { icon: Clock, label: "History" },
                { icon: Settings, label: "Settings" },
              ].map(({ icon: Icon, label, active }) => (
                <span
                  key={label}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 ${
                    active ? "bg-[#12325e]" : ""
                  }`}
                >
                  <Icon size={13} className={active ? "text-[#4d94ff]" : "text-gray-600"} />
                  <span className={`text-[8.5px] ${active ? "text-[#4d94ff]" : "text-gray-600"}`}>
                    {label}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The tablet: the same screen with room to breathe, mid-conversation. */
export function IPadMock() {
  return (
    <div className="w-full">
      <div className="rounded-[26px] border border-white/[0.14] bg-[#0b0d11] p-3 shadow-[0_50px_100px_-30px_rgba(0,0,0,1)]">
        <div className="overflow-hidden rounded-[16px] bg-[#050609]">
          <div className="flex h-[400px] flex-col px-7 py-5">
            <div className="flex items-center justify-between">
              <MoreHorizontal size={16} className="text-gray-600" />
              <span className="text-[15px] font-bold tracking-tight text-white">Live Interpreter</span>
              <MoreHorizontal size={16} className="text-gray-500" />
            </div>

            <div className="mt-auto space-y-3">
              <div className="ml-auto w-[62%] rounded-2xl bg-white/[0.045] p-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-semibold text-gray-200">
                  🇯🇵 Japanese <ChevronDown size={10} className="text-gray-500" />
                </span>
                <p className="mt-3 text-[15px] leading-6 text-white">駅はどこですか？</p>
                <p className="mt-1.5 text-[11px] text-[#4d94ff]">聞き取り中…</p>
              </div>
              <div className="w-[62%] rounded-2xl bg-white/[0.045] p-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-semibold text-gray-200">
                  🇺🇸 English <ChevronDown size={10} className="text-gray-500" />
                </span>
                <p className="mt-3 text-[15px] leading-6 text-white">Where is the station?</p>
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <Volume2 size={11} />
                  speaking
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col items-center">
              <span className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[#2f6bff] shadow-[0_0_30px_rgba(47,107,255,.5)]">
                <Mic size={21} className="text-white" />
              </span>
              <span className="mt-2 text-[11px] text-gray-500">Tap to speak</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The browser, checked against a screenshot of the running page rather than
 *  from memory: the swap arrows and language on the left, the Two way switch in
 *  the middle, the output language and speaker on the right, the composer at the
 *  bottom of the card, and the session controls on their own bar underneath. */
export function BrowserMock() {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-white/[0.1] bg-[#0a0f1a] shadow-[0_40px_90px_-30px_rgba(0,0,0,1)]">
      <div className="flex items-center gap-2 border-b border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 flex-1 truncate rounded bg-black/40 px-2.5 py-1 text-[10px] text-gray-500">
          quickvoice.local/interpreter
        </span>
      </div>

      <div className="p-4">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
          {/* language row */}
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="flex items-center gap-2 text-gray-200">
              <ArrowLeftRight size={12} className="text-gray-500" />
              English (US)
              <ChevronDown size={10} className="text-gray-500" />
            </span>
            <span className="flex items-center gap-2">
              <span className="flex h-[17px] w-[30px] items-center rounded-full bg-white/[0.12] px-0.5">
                <span className="ml-auto h-[13px] w-[13px] rounded-full bg-[#4d94ff]" />
              </span>
              <span className="font-medium text-[#4d94ff]">Two way</span>
            </span>
            <span className="flex items-center gap-2 text-gray-200">
              Japanese
              <ChevronDown size={10} className="text-gray-500" />
              <Volume2 size={12} className="text-gray-600" />
            </span>
          </div>

          {/* the conversation so far */}
          <div className="mt-4 space-y-2.5">
            <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-white/[0.05] px-4 py-3">
              <p className="mb-1.5 text-[9px] uppercase tracking-widest text-gray-500">English</p>
              <p className="text-[13.5px] text-white">Where is the station?</p>
            </div>
            <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-[#142035] px-4 py-3">
              <p className="mb-1.5 text-[9px] uppercase tracking-widest text-blue-300">Japanese</p>
              <p className="text-[14px] leading-6 text-white">駅はどこですか？</p>
            </div>
          </div>

          {/* composer */}
          <div className="mt-4 flex items-center gap-2.5">
            <span className="flex flex-1 items-center rounded-full border border-white/[0.09] bg-white/[0.02] py-2.5 pl-4 pr-2 text-[12px] text-gray-500">
              Type something…
              <span className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.07]">
                <Send size={12} className="text-gray-400" />
              </span>
            </span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2f6bff] shadow-[0_0_20px_rgba(47,107,255,.45)]">
              <Mic size={15} className="text-white" />
            </span>
          </div>
        </div>

        {/* session controls, on their own bar */}
        <div className="mx-auto mt-3 flex w-fit items-center gap-4 rounded-full bg-white/[0.04] px-5 py-2.5 text-[10.5px] text-gray-400">
          <span className="flex items-center gap-1.5"><FileText size={11} />View Transcript</span>
          <span className="flex items-center gap-1.5 text-[#ff6b6b]"><span className="h-2 w-2 rounded-[2px] bg-[#ff6b6b]" />Save Session</span>
          <span className="flex items-center gap-1.5"><Pause size={11} />Pause Session</span>
          <span className="flex items-center gap-1.5"><Mic size={11} />Mute</span>
        </div>
      </div>
    </div>
  );
}
