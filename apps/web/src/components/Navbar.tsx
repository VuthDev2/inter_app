"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, AudioWaveform, History, Settings, CircleUserRound } from "lucide-react";

const NAV_ITEMS = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Live Interpreter", href: "/interpreter", icon: AudioWaveform },
  { label: "History", href: "/history", icon: History },
  { label: "Settings", href: "/setting", icon: Settings },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="w-full border-b border-white/5 bg-[#0a0e1a]">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <img src="/logo.png" alt="QuickVoice Logo" className="h-10 w-auto" />
          <span className="text-lg font-bold italic tracking-tight text-white">
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
                    ? "text-blue-400"
                    : "text-white/60 hover:text-white/90"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Profile */}
        <button
          className="h-9 w-9 rounded-full border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Account"
        >
          <CircleUserRound size={20} />
        </button>
      </div>
    </header>
  );
}
