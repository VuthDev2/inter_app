"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Lift content off the page instead of letting it float on it.
 *
 * A section of pale text on the same flat dark ground as everything else gives
 * the eye nothing to catch. Putting it on a surface with its own background and
 * a real radius makes it an object on the page rather than part of the
 * background — and a white button next to all that dark is the brightest thing
 * on the screen, which is exactly what a call to action should be.
 */

/** A raised card. `tone="bright"` inverts to near-white for the one block on a
 *  page that should stop you. */
export function Card({
  children,
  tone = "raised",
  className = "",
}: {
  children: ReactNode;
  tone?: "raised" | "sunken" | "bright";
  className?: string;
}) {
  const tones = {
    // The default: slightly lighter than the page, with a lit top edge.
    raised:
      "border border-white/[0.09] bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_24px_60px_-24px_rgba(0,0,0,.9)]",
    // For a block that should sit *into* the page rather than on it.
    sunken: "border border-white/[0.06] bg-black/30",
    // Inverted. Used once per page at most.
    bright: "bg-[#f3f5f7] text-[#04070d] shadow-[0_30px_70px_-25px_rgba(0,0,0,.9)]",
  } as const;

  return (
    <div className={`rounded-[2rem] ${tones[tone]} ${className}`}>{children}</div>
  );
}

/** The brightest thing on a dark page. */
export function PillButton({
  href,
  children,
  tone = "white",
}: {
  href: string;
  children: ReactNode;
  tone?: "white" | "dark";
}) {
  const tones = {
    white: "bg-white text-[#04070d] hover:bg-gray-200",
    dark: "bg-[#04070d] text-white hover:bg-[#101722]",
  } as const;

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-semibold transition-colors ${tones[tone]}`}
    >
      {children}
    </Link>
  );
}

/** A number beside a line, with a rule under it — the shape of a short list of
 *  steps that should read as a list rather than as a paragraph. */
export function NumberedList({
  items,
  accent = "text-emerald-400",
}: {
  items: { n: string; label: string }[];
  accent?: string;
}) {
  return (
    <ol className="w-full">
      {items.map(({ n, label }, index) => (
        <li
          key={n}
          className={`flex items-baseline gap-6 py-5 ${
            index < items.length - 1 ? "border-b border-white/[0.12]" : ""
          }`}
        >
          <span className={`font-mono text-[15px] ${accent}`}>{n}</span>
          <span className="text-[20px] font-medium tracking-tight md:text-[24px]">{label}</span>
        </li>
      ))}
    </ol>
  );
}
