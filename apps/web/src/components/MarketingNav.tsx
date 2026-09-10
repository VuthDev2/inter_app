"use client";

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
    return () => observer.disconnect();
  }, []);

  return (
    <header ref={barRef} className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#04070d]/85 backdrop-blur">
      {/* Two rows on a phone. Three names plus the logo and a button need
          about 355px of a 390px screen, so a single row scrolled sideways and
          left "How it works" cut down to a stray "s". */}
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-3 px-5 py-3.5 sm:flex-nowrap sm:px-6 sm:py-4">
        <Link href="/landing" className="flex shrink-0 items-center gap-2">
          <img src="/logo-d.png" alt="" className="h-7 w-auto" />
          <span className="text-[15px] font-bold italic tracking-tight text-white">
            Quick<span className="text-blue-500">Voice</span>
          </span>
        </Link>

        {/* Scrolls sideways rather than wrapping: three names plus the buttons
            do not fit a narrow phone, and a second row pushed the content down
            on every page. */}
        <nav
          aria-label="QuickVoice"
          className="order-last flex w-full min-w-0 items-center justify-between gap-1 text-[13px] font-medium sm:order-none sm:w-auto sm:flex-1 sm:justify-center sm:gap-6"
        >
          {MARKETING_LINKS.map(({ label, href }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 whitespace-nowrap border-b-2 pb-1 text-[12.5px] transition-colors sm:px-2 sm:text-[13px] ${
                  active
                    ? "border-blue-500 text-white"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2 text-[13px] font-semibold">
          <Link
            href="/signup"
            className="hidden rounded-full px-4 py-2 text-gray-400 transition-colors hover:text-white sm:inline-block"
          >
            Sign Up
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-blue-600 px-5 py-2 text-white transition-colors hover:bg-blue-500"
          >
            Login
          </Link>
        </div>
      </div>
    </header>
  );
}
