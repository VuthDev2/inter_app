"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

const WAVEFORM = [8, 15, 25, 38, 20, 31, 13, 26, 36, 18, 28, 10];

export function DeviceEcosystemShowcase({ paused = false }: { paused?: boolean }) {
  const reduceMotion = useReducedMotion();
  const showcaseRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(showcaseRef, { margin: "-12% 0px -12% 0px" });
  const motionEnabled = !reduceMotion && isInView && !paused;

  return (
    <div
      ref={showcaseRef}
      className="relative h-[390px] w-full max-w-[720px] md:h-[480px]"
      aria-label="QuickVoice web and mobile applications"
    >
      <div className="absolute left-[2%] top-[5%] h-[84%] w-[92%] bg-[radial-gradient(ellipse,rgba(37,99,235,.11),transparent_68%)]" />
      <div className="absolute bottom-0 right-0 h-[58%] w-[46%] bg-[radial-gradient(ellipse,rgba(34,211,238,.07),transparent_70%)]" />

      <motion.div
        animate={motionEnabled ? { y: [0, -7, 0], rotateX: [0, 0.8, 0] } : { y: 0, rotateX: 0 }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-0 top-[12%] z-10 w-[92%] [perspective:1200px] [will-change:transform] md:top-[10%]"
      >
        <div className="relative rounded-t-[1.15rem] rounded-b-[0.65rem] border border-white/[0.18] bg-gradient-to-b from-[#737b88] via-[#303640] to-[#11141a] p-[5px] pb-[7px] shadow-[0_34px_90px_rgba(0,0,0,.62),0_0_55px_rgba(37,99,235,.10)] md:rounded-t-[1.45rem] md:rounded-b-[0.8rem] md:p-[6px] md:pb-[8px]">
          <div className="relative rounded-[0.85rem] bg-[#030507] p-[4px] md:rounded-[1.12rem] md:p-[5px]">
            <div className="absolute left-1/2 top-0 z-30 h-[9px] w-[38px] -translate-x-1/2 rounded-b-[8px] bg-[#020304] md:h-[11px] md:w-[48px]">
              <span className="absolute left-1/2 top-[2px] h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-[#263142] ring-1 ring-white/10 md:top-[3px]" />
            </div>
            <div className="relative aspect-[1.71/1] overflow-hidden rounded-[0.62rem] bg-[#080d18] md:rounded-[0.9rem]">
              <Image
                src="/screen.png"
                alt="QuickVoice web application dashboard"
                fill
                priority
                sizes="(min-width: 1024px) 620px, 75vw"
                className="object-cover"
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
              <motion.div
                animate={motionEnabled ? { x: ["-140%", "180%"] } : { x: "-140%" }}
                transition={{ duration: 7, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                className="absolute -bottom-1/2 -top-1/2 left-0 w-[18%] rotate-[16deg] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent blur-sm"
              />
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-[5%] bottom-[2px] h-px bg-white/10" />
        </div>

        <div className="relative mx-auto h-[13px] w-[108%] -translate-x-[3.7%] md:h-[18px]">
          <div className="absolute inset-x-[2.5%] top-0 h-[3px] rounded-full bg-gradient-to-b from-[#747d89] to-[#181c23] shadow-[0_2px_5px_rgba(0,0,0,.7)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#69727f] via-[#303641] to-[#0a0c10] [clip-path:polygon(2.5%_0,97.5%_0,100%_58%,98%_100%,2%_100%,0_58%)] shadow-[0_12px_24px_rgba(0,0,0,.45)]" />
          <div className="absolute left-1/2 top-0 z-10 h-[4px] w-[15%] -translate-x-1/2 rounded-b-[5px] bg-gradient-to-b from-[#181c22] to-[#08090c] ring-1 ring-white/[0.06]" />
          <div className="absolute inset-x-[3%] bottom-0 h-px bg-white/[0.14]" />
        </div>
      </motion.div>

      <div className="absolute bottom-[25%] left-[45%] z-20 flex items-center gap-1 opacity-65 md:left-[49%]">
        <div className="h-px w-8 bg-gradient-to-r from-transparent to-blue-400/45 md:w-12" />
        <div className="flex h-9 items-center gap-[3px]">
          {WAVEFORM.map((height, index) => (
            <motion.span
              key={index}
              animate={motionEnabled ? { scaleY: [0.14, height / 38, 0.14] } : { scaleY: 0.14 }}
              transition={{ duration: 1.2, delay: index * 0.055, repeat: Infinity, ease: "easeInOut" }}
              className="h-[38px] w-[2px] rounded-full bg-blue-400/75"
              style={{ transformOrigin: "center" }}
            />
          ))}
        </div>
        <div className="relative h-px w-9 bg-gradient-to-r from-blue-400/45 to-transparent md:w-14">
          {motionEnabled && (
            <motion.span
              animate={{ x: [0, 48], opacity: [0, 1, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-[2px] left-0 h-1 w-1 rounded-full bg-blue-200 shadow-[0_0_8px_rgba(147,197,253,.9)]"
            />
          )}
        </div>
      </div>

      <motion.div
        animate={motionEnabled ? { y: [0, -11, 0], rotateZ: [-1.5, 0.8, -1.5] } : { y: 0, rotateZ: -1.5 }}
        transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        className="absolute bottom-[1%] right-[2%] z-30 w-[27%] min-w-[122px] max-w-[172px] [will-change:transform] md:right-[3%]"
      >
        <div className="absolute -left-[4px] top-[18%] h-[5%] w-[4px] rounded-l-md bg-gradient-to-b from-[#68717c] to-[#20242b] shadow-[-1px_0_1px_rgba(255,255,255,.12)]" />
        <div className="absolute -left-[4px] top-[28%] h-[9%] w-[4px] rounded-l-md bg-gradient-to-b from-[#68717c] to-[#20242b] shadow-[-1px_0_1px_rgba(255,255,255,.12)]" />
        <div className="absolute -left-[4px] top-[40%] h-[9%] w-[4px] rounded-l-md bg-gradient-to-b from-[#68717c] to-[#20242b] shadow-[-1px_0_1px_rgba(255,255,255,.12)]" />
        <div className="absolute -right-[4px] top-[31%] h-[16%] w-[4px] rounded-r-md bg-gradient-to-b from-[#59616c] to-[#181b21] shadow-[1px_0_1px_rgba(255,255,255,.1)]" />

        <div className="relative aspect-[0.485/1] rounded-[2.35rem] border border-white/25 bg-gradient-to-br from-[#9aa1aa] via-[#343a43] to-[#101217] p-[3px] shadow-[0_30px_70px_rgba(0,0,0,.7),0_0_44px_rgba(37,99,235,.20)] md:rounded-[2.85rem]">
          <div className="relative h-full w-full rounded-[2.2rem] bg-[#020305] p-[5px] shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)] md:rounded-[2.7rem] md:p-[6px]">
            <div className="absolute left-1/2 top-[8px] z-30 h-[13px] w-[34%] -translate-x-1/2 rounded-full bg-black shadow-[0_1px_0_rgba(255,255,255,.05)] md:top-[10px] md:h-[15px]">
              <span className="absolute right-[12%] top-1/2 h-[3px] w-[3px] -translate-y-1/2 rounded-full bg-[#172236] ring-1 ring-[#36445b]/70" />
            </div>

            <div className="relative h-full w-full overflow-hidden rounded-[1.92rem] bg-[#f5f2f8] md:rounded-[2.4rem]">
              <Image
                src="/live-interpreter-mobile.png"
                alt="QuickVoice Live Interpreter mobile screen"
                width={390}
                height={844}
                priority
                sizes="172px"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.12] via-transparent to-blue-300/[0.03]" />
              <motion.div
                animate={motionEnabled ? { x: ["-150%", "210%"] } : { x: "-150%" }}
                transition={{ duration: 5.5, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
                className="absolute -bottom-1/3 -top-1/3 left-0 w-[22%] rotate-[14deg] bg-gradient-to-r from-transparent via-white/[0.16] to-transparent blur-sm"
              />
              <div className="absolute bottom-[5px] left-1/2 h-[3px] w-[31%] -translate-x-1/2 rounded-full bg-black/75 shadow-[0_0_1px_rgba(255,255,255,.25)] md:bottom-[7px] md:h-[4px]" />
            </div>
          </div>
          <div className="pointer-events-none absolute inset-[1px] rounded-[inherit] border border-white/[0.12]" />
        </div>
      </motion.div>

      <div className="absolute bottom-0 left-[11%] right-[4%] h-10 rounded-[50%] bg-black/60 blur-xl" />
    </div>
  );
}
