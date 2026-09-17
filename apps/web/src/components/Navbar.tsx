"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, AudioWaveform, Speech, History, Settings, LogOut, Puzzle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

// `section` lists the other routes that belong under a nav item. Without it the
// highlight only matched the exact href, so opening the record screen, a folder
// or a saved recording lit up nothing at all and there was no way to tell where
// you were.
const NAV_ITEMS = [
  { label: "Home", href: "/dashboard", icon: Home, section: [] as string[] },
  { label: "Live Interpreter", href: "/interpreter", icon: AudioWaveform, section: [] as string[] },
  {
    label: "Record",
    href: "/prerecord",
    icon: Speech,
    section: ["/record"],
  },
  { label: "History", href: "/history", icon: History, section: ["/allrecords", "/folder", "/insiderecord", "/insiderecord-twoway"] },
  { label: "Extension", href: "/extension", icon: Puzzle, section: [] as string[] },
  { label: "Settings", href: "/setting", icon: Settings, section: [] as string[] },
];

export default function Navbar() {
  const pathname = usePathname();
  const { signOut, user } = useAuth();
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "U";
  const initial = displayName.charAt(0).toUpperCase();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);

  // Publish this bar's height so a page can size itself to "the rest of the
  // window" on its own. Asking the layout to bound it instead is what squashed
  // the landing page: a flex child's automatic minimum size is the only thing
  // holding that page's 240vh conversation section at its natural height.
  // offsetHeight is 0 while the bar is hidden (it is md:block), which is the
  // right answer -- on a phone there is no bar taking room.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const publish = () => {
      document.documentElement.style.setProperty("--appbar-h", `${bar.offsetHeight}px`);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(bar);
    const clear = () => document.documentElement.style.setProperty("--appbar-h", "0px");
    window.addEventListener("resize", publish);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", publish);
      clear();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
  }

  const isActive = (item: typeof NAV_ITEMS[number]) => pathname === item.href || item.section.some((p) => pathname.startsWith(p));

  return (
    <>
    <header ref={barRef} className="hidden w-full border-b border-[rgb(var(--border))] bg-[rgb(var(--bg))] md:block">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6 py-3 sm:py-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3 shrink-0">
          <img src="/logo-l.png" alt="QuickVoice Logo" className="h-8 sm:h-10 w-auto block dark:hidden" />
          <img src="/logo-d.png" alt="QuickVoice Logo" className="h-8 sm:h-10 w-auto hidden dark:block" />
          {/* The mark alone between md and lg: that is exactly the band where
              six labelled links need every pixel, and the wordmark next to the
              logo is the one thing there that repeats information. */}
          <span className="hidden lg:inline text-lg font-bold italic tracking-tight text-[rgb(var(--text))]">
            Quick<span className="text-blue-500">Voice</span>
          </span>
        </Link>

        {/* Nav links */}
        {/* Six labelled links never fit a phone: the bar wrapped onto a second
            row and then scrolled sideways, with Settings cut off at the edge.
            So the labels come off -- but only once they genuinely stop fitting.
            Six labels plus the logo and the avatar need about 700px, so they
            stay all the way down to md; below that the icons alone sit in one
            row, the way the phone app's tab bar does. Cutting the labels at lg
            instead stripped them from ordinary laptop-sized windows, and a row
            of unlabelled grey glyphs is not what this bar is meant to look
            like. The name stays on the item as `title` and `aria-label`. */}
        <nav aria-label="Main navigation" className="flex min-w-0 items-center gap-0.5 sm:gap-1 md:gap-0 lg:gap-4">
          {NAV_ITEMS.map(({ label, href, icon: Icon, section }) => {
            const active = pathname === href || section.some((p) => pathname.startsWith(p));
            return (
              <Link
                key={href}
                href={href}
                title={label}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                className={`flex items-center gap-1.5 rounded-xl p-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  active
                    ? "bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]"
                    : "text-[rgba(var(--text-secondary),1)] hover:text-[rgba(var(--text),0.9)]"
                }`}
              >
                <Icon size={18} className="shrink-0 md:size-4" />
                <span className="hidden whitespace-nowrap text-[13px] md:inline lg:text-sm">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Profile with dropdown */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="h-9 w-9 rounded-full bg-[rgb(var(--primary))] flex items-center justify-center text-[rgb(var(--bg))] text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Account"
            title={displayName}
          >
            {initial}
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-lg py-1 z-50">
              <div className="px-4 py-3 border-b border-[rgb(var(--border))]">
                <p className="text-sm font-medium text-[rgba(var(--text),0.9)] truncate">{displayName}</p>
                <p className="text-xs text-[rgba(var(--muted),1)] truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[rgba(var(--text),0.9)] hover:bg-[rgba(var(--text),0.05)] transition-colors"
              >
                <LogOut size={16} className="text-[rgba(var(--muted),1)]" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
    <nav aria-label="Mobile navigation" className="fixed inset-x-3 bottom-3 z-50 flex h-[68px] items-center justify-around rounded-[24px] border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/95 px-1 shadow-2xl backdrop-blur-xl md:hidden">
      {NAV_ITEMS.filter((item) => item.label !== "Extension").map((item) => {
        const active = isActive(item);
        const Icon = item.icon;
        return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-medium transition-colors ${active ? "bg-[rgb(var(--primary))]/20 text-[rgb(var(--primary))]" : "text-[rgba(var(--text-secondary),1)]"}`}><Icon size={21}/><span className="truncate">{item.label === "Live Interpreter" ? "Live" : item.label}</span></Link>;
      })}
    </nav>
    </>
  );
}
