"use client";

import { useEffect } from "react";

/**
 * Recover from a rebuild that happened while the page was open.
 *
 * Next.js puts a content hash in every JavaScript filename, so a new build
 * gives every chunk a new name. A tab that was already open then asks for files
 * that no longer exist: the request 404s, React cannot finish rendering, and
 * the page goes white with nothing to click. That is a blank screen caused by
 * deploying, not by anything the person did.
 *
 * The stylesheet fails the same way, and worse: the page still renders, so you
 * get every element with the browser's default styling and no indication that
 * anything went wrong.
 *
 * A build file that fails to load is unambiguous, so reload once and let the
 * fresh HTML pull the current filenames. The marker guards against a reload
 * loop if the failure is something else that happens to look the same.
 */
const RELOADED_KEY = "quickvoice.reloadedForStaleBuild";

function isStaleChunk(message: string) {
  return /Loading chunk|ChunkLoadError|Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(
    message,
  );
}

export default function ReloadOnStaleBuild() {
  useEffect(() => {
    const recover = (message: string) => {
      if (!isStaleChunk(message)) return;
      try {
        if (sessionStorage.getItem(RELOADED_KEY)) return;
        sessionStorage.setItem(RELOADED_KEY, "1");
      } catch {
        // Private window: reload anyway rather than leaving a blank page.
      }
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => recover(event.message || "");

    // A <link> or <script> that 404s fires an error on the element and does not
    // bubble, so it needs the capture phase -- and it never reaches the handler
    // above, which is why a missing stylesheet left the page unstyled instead
    // of reloading it.
    const onResourceError = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const url =
        (target as HTMLLinkElement)?.href || (target as HTMLScriptElement)?.src || "";
      if (url.includes("/_next/static/")) recover("Loading chunk failed: " + url);
    };
    const onRejection = (event: PromiseRejectionEvent) =>
      recover(String((event.reason as Error)?.message ?? event.reason ?? ""));

    window.addEventListener("error", onError);
    window.addEventListener("error", onResourceError, true);
    window.addEventListener("unhandledrejection", onRejection);
    // A load that got this far is running the current build.
    try {
      sessionStorage.removeItem(RELOADED_KEY);
    } catch {}

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("error", onResourceError, true);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
