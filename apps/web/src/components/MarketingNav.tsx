"use client";

import { LayoutGroup, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * The bar the three public pages share.
 *
 * These used to be anchors that scrolled the welcome page. As pages they need
 * a way to reach each other, and the welcome page needs to stay reachable from
 * all of them -- otherwise arriving at "Why QuickVoice" from a link is a dead
 * end. Same three names, same order, wherever you are.
 */
export const MARKETING_LINKS = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Why QuickVoice", href: "/why-quickvoice" },
  { label: "Interpreter", href: "/interpreter-app" },
  { label: "Extension", href: "/browser-extension" },
] as const;

export default function MarketingNav() {
  const pathname = usePathname();
  const barRef = useRef<HTMLElement>(null);

  // Publish the bar's height so a section can be exactly one screen tall
  // without anyone hard-coding a number that changes when the bar wraps to two
  // rows on a phone.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const publish = () =>
      document.documentElement.style.setProperty("--appbar-h", `${bar.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(bar);
    const clear = () => document.documentElement.style.setProperty("--appbar-h", "0px");
    return () => {
      observer.disconnect();
      clear();
    };
  }, []);

  return (
    // Same shell as the welcome page's bar: a floating rounded pill, not a
    // full-width slab. Two different nav shapes across pages read as a glitch
    // when you click between them. Kept `sticky` rather than the welcome
    // page's `fixed` so --appbar-h still reserves real space -- the sections
    // below size themselves against it.
    <header ref={barRef} className="sticky top-0 z-50 w-full px-6 pt-5 md:pt-6 pb-3">
      <nav
        aria-label="QuickVoice"
        className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-x-3 gap-y-3 rounded-[28px] border border-white/[0.09] bg-black/80 px-4 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md lg:flex-nowrap lg:rounded-full md:px-6"
      >
        <Link href="/landing" className="flex min-w-0 shrink items-center gap-2 pl-1 pr-1 md:gap-3 md:pl-3 md:pr-4">
          <img src="/logo-d.png" alt="" className="h-7 w-7 shrink-0" />
          <span className="truncate text-base font-bold italic tracking-tight text-white md:text-lg">
            Quick<span className="text-blue-500">Voice</span>
          </span>
        </Link>

        <LayoutGroup id="marketing-nav">
        <div className="order-last flex w-full min-w-0 items-center justify-between gap-1 text-[13px] font-medium text-gray-300 lg:order-none lg:w-auto lg:flex-1 lg:justify-center lg:gap-6 xl:gap-8">
          {MARKETING_LINKS.map(({ label, href }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative shrink-0 whitespace-nowrap pb-1 transition-colors duration-200 ${
                  active ? "text-white" : "hover:text-white"
                }`}
              >
                {label}
                {/* One element that moves between links rather than a border
                    per link switching on and off: shared layoutId is what lets
                    it travel instead of blink. */}
                {active && (
                  <motion.span
                    layoutId="marketing-nav-underline"
                    className="absolute -bottom-0 left-0 right-0 h-[2px] rounded-full bg-blue-500"
                    transition={{ type: "spring", stiffness: 480, damping: 38, mass: 0.8 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
        </LayoutGroup>

        <div className="flex shrink-0 items-center gap-2 text-[14px] font-semibold md:gap-3 md:pr-1">
          <Link
            href="/signup"
            className="hidden rounded-full px-5 py-2 text-gray-400 transition-all hover:text-white sm:inline-block"
          >
            Sign Up
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-blue-600 px-4 py-2 text-white shadow-[0_0_20px_rgba(0,195,255,0.4)] transition-colors hover:bg-blue-500 md:px-6 md:py-2.5"
          >
            Login
          </Link>
        </div>
      </nav>
    </header>
  );
}
