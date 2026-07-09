import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, HistoryIcon, Mic, Radio, Settings } from "lucide-react";
import type { ReactNode } from "react";

type Tab = {
  to: string;
  label: string;
  icon: ReactNode;
};

const TABS: Tab[] = [
  { to: "/live", label: "Live", icon: <Radio className="h-6 w-6" strokeWidth={2} /> },
  { to: "/record", label: "Record", icon: <Mic className="h-6 w-6" strokeWidth={2} /> },
  { to: "/history", label: "History", icon: <HistoryIcon className="h-6 w-6" strokeWidth={2} /> },
  { to: "/settings", label: "Settings", icon: <Settings className="h-6 w-6" strokeWidth={2} /> },
];

export function BottomTabBar() {
  const location = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      id="bottom-tab-bar"
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 sm:hidden"
      style={{
        background: "white",
        borderTop: "1px solid oklch(0 0 0 / 18%)",
        borderLeft: "1px solid oklch(0 0 0 / 14%)",
        borderRight: "1px solid oklch(0 0 0 / 14%)",
        borderTopLeftRadius: "3rem",
        borderTopRightRadius: "3rem",
        boxShadow: "0 -10px 24px oklch(0 0 0 / 8%)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="grid grid-cols-4 items-center px-3 pb-1 pt-[-1.5]">
        {TABS.map((tab) => {
          const isActive = tab.to === "/live" ? location === "/live" : location.startsWith(tab.to);

          return (
            <Link
              key={tab.to}
              to={tab.to}
              id={`tab-${tab.label.toLowerCase()}`}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className="flex min-w-0 flex-col items-center justify-center gap-1 transition-colors duration-200"
              style={{
                color: isActive ? "oklch(0.57 0.22 250)" : "oklch(0 0 0)",
              }}
            >
              <span className="flex h-9 w-12 items-center justify-center">{tab.icon}</span>
              <span
                className="block max-w-full truncate text-center text-[13px] font-light leading-tight transition-colors duration-200"
                style={{
                  fontFamily: "var(--font-sans)",
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
