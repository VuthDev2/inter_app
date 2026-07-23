"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, AudioWaveform, Speech, History, Settings, CircleUserRound, LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Live Interpreter", href: "/interpreter", icon: AudioWaveform },
  { label: "Record", href: "/prerecord", icon: Speech },
  { label: "History", href: "/history", icon: History },
  { label: "Settings", href: "/setting", icon: Settings },
];

export default function Navbar() {
  const pathname = usePathname();
  const { signOut, user } = useAuth();
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "U";
  const initial = displayName.charAt(0).toUpperCase();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <header className="w-full border-b border-[rgb(var(--border))] bg-[rgb(var(--bg))]">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <img src="/logo-l.png" alt="QuickVoice Logo" className="h-10 w-auto block dark:hidden" />
          <img src="/logo-d.png" alt="QuickVoice Logo" className="h-10 w-auto hidden dark:block" />
          <span className="text-lg font-bold italic tracking-tight text-[rgb(var(--text))]">
            Quick<span className="text-blue-500">Voice</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-7">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded ${
                  isActive
                    ? "text-[rgb(var(--primary))]"
                    : "text-[rgba(var(--text-secondary),1)] hover:text-[rgba(var(--text),0.9)]"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Profile with dropdown */}
        <div className="relative" ref={menuRef}>
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
  );
}
