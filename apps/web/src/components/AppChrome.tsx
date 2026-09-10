"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

/**
 * The app bar lives here, in the root layout, rather than inside each page.
 *
 * When every page rendered its own <Navbar />, a navigation unmounted the bar
 * and mounted a new one, so the highlight only moved once the next page's code
 * had loaded and rendered -- on a heavy page like the interpreter that is a
 * visible delay, and the whole bar redraws. Rendered from the layout it is the
 * same React element across navigations: nothing remounts, and the active item
 * updates the moment the URL changes.
 */

// Sign-in and marketing screens are their own full-page experience.
const BARE_ROUTES = [
  "/",
  "/landing",
  "/login",
  "/signup",
  "/verify",
  "/verifysuccess",
  "/forgotpassword",
  // Reachable without an account -- someone deciding whether to install the
  // extension has not signed in yet -- so it brings its own header instead of
  // the signed-in app bar.
  "/browser-extension",
];

export default function AppChrome() {
  const pathname = usePathname();
  if (BARE_ROUTES.includes(pathname)) return null;
  return <Navbar />;
}
