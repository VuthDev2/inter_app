"use client";

import type { ReactNode } from "react";

/**
 * A marker pen for the one phrase in a paragraph that carries it.
 *
 * Long stretches of grey body copy are where a reader's eye gives up. Lifting a
 * single phrase per paragraph onto a bright rounded ground gives them somewhere
 * to land and a way to skim the page without reading all of it.
 *
 * Used sparingly on purpose: highlight everything and nothing is highlighted.
 * One phrase per paragraph, and never a whole sentence.
 */

const TONES = {
  // Solid — for the claim a section is built around.
  blue: "bg-[#2f6bff] text-white",
  cyan: "bg-cyan-400 text-[#04070d]",
  emerald: "bg-emerald-400 text-[#04070d]",
  amber: "bg-amber-300 text-[#04070d]",
  // Tinted — quieter, for a phrase inside body copy that should not shout.
  soft: "bg-blue-500/20 text-blue-100 ring-1 ring-inset ring-blue-400/25",
  softCyan: "bg-cyan-400/15 text-cyan-100 ring-1 ring-inset ring-cyan-300/25",
  softEmerald: "bg-emerald-400/15 text-emerald-100 ring-1 ring-inset ring-emerald-300/25",
} as const;

export default function Highlight({
  children,
  tone = "soft",
}: {
  children: ReactNode;
  tone?: keyof typeof TONES;
}) {
  return (
    <mark
      className={`rounded-[7px] px-[7px] py-[2px] font-medium decoration-clone ${TONES[tone]}`}
      // box-decoration-break keeps the rounded ends correct when a highlighted
      // phrase wraps across two lines, instead of slicing the corners off.
      style={{ WebkitBoxDecorationBreak: "clone", boxDecorationBreak: "clone" }}
    >
      {children}
    </mark>
  );
}
