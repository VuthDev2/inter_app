"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Cross-page motion for the public pages.
 *
 * Only the marketing routes animate. The signed-in app is left alone: those
 * pages own their own scroll containers and a wrapper that animates would
 * fight them.
 *
 * Two rules this file exists to respect:
 *
 * 1. `transform` on an ancestor makes `position: fixed` descendants position
 *    against that ancestor instead of the viewport. The welcome page's nav is
 *    `fixed`, so that page fades only -- never slides -- or its bar would
 *    scroll away with the content.
 * 2. `mode="wait"` so the outgoing page finishes before the next mounts.
 *    Overlapping them double-counts page height and the scrollbar jumps.
 */

const SLIDE_ROUTES = [
  "/how-it-works",
  "/why-quickvoice",
  "/interpreter-app",
  "/browser-extension",
];

// Fades but never slides -- see rule 1 above.
const FADE_ONLY_ROUTES = ["/landing", "/"];

const EASE = [0.22, 1, 0.36, 1] as const;

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const slides = SLIDE_ROUTES.includes(pathname);
  const fades = FADE_ONLY_ROUTES.includes(pathname);
  const animated = slides || fades;

  // A route change keeps the old scroll offset, so arriving at a long page can
  // drop you into the middle of it. Instant, not smooth: a smooth scroll races
  // the enter animation and the page appears to slide twice.
  useEffect(() => {
    if (animated) window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, animated]);

  const shell = "flex flex-1 shrink-0 flex-col";

  if (!animated || reduceMotion) {
    return <div className={shell}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        className={shell}
        initial={slides ? { opacity: 0, y: 14 } : { opacity: 0 }}
        animate={slides ? { opacity: 1, y: 0 } : { opacity: 1 }}
        exit={
          slides
            ? { opacity: 0, y: -10, transition: { duration: 0.16, ease: "easeIn" } }
            : { opacity: 0, transition: { duration: 0.16, ease: "easeIn" } }
        }
        // Exit is deliberately much shorter than enter. `mode="wait"` leaves a
        // gap where neither page is mounted, and at equal durations that gap
        // reads as a black flash rather than a transition.
        transition={{
          duration: 0.42,
          ease: EASE,
          opacity: { duration: 0.28, ease: "easeOut" },
        }}
        // Leaving a translateY(0) behind would keep this element a containing
        // block for any `fixed` child a page adds later. Clear it once at rest.
        onAnimationComplete={(definition) => {
          if (typeof definition === "object" && definition !== null && "y" in definition) {
            const node = document.getElementById(`pt-${pathname}`);
            if (node) node.style.transform = "";
          }
        }}
        id={`pt-${pathname}`}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
