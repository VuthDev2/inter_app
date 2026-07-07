import { Link, useRouterState } from "@tanstack/react-router";
import { Home, History, User, Settings, MonitorSmartphone } from "lucide-react";
import type { ReactNode } from "react";

type Tab = {
  to: string;
  label: string;
  icon: ReactNode;
};

const TABS: Tab[] = [
  { to: "/home", label: "Home", icon: <Home className="h-5 w-5" /> },
  { to: "/remote", label: "Remote", icon: <MonitorSmartphone className="h-5 w-5" /> },
  { to: "/history", label: "History", icon: <History className="h-5 w-5" /> },
  { to: "/profile", label: "Profile", icon: <User className="h-5 w-5" /> },
  { to: "/settings", label: "Settings", icon: <Settings className="h-5 w-5" /> },
];

export function BottomTabBar() {
  const location = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      id="bottom-tab-bar"
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 sm:hidden"
      style={{
        background: "color-mix(white, transparent)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid oklch(0.3 0.02 255 / 50%)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-stretch">
        {TABS.map((tab) => {
          const isActive =
            tab.to === "/home"
              ? location === "/home"
              : location.startsWith(tab.to);

          return (
            <Link
              key={tab.to}
              to={tab.to}
              id={`tab-${tab.label.toLowerCase()}`}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 transition-all duration-200"
              style={{
                color: isActive
                  ? "oklch(0.78 0.16 200)"
                  : "oklch(0.55 0.02 255)",
              }}
            >
              {/* Active glow pill */}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full"
                  style={{
                    background: "oklch(0.78 0.16 200)",
                    boxShadow: "0 0 10px 2px oklch(0.78 0.16 200 / 60%)",
                  }}
                />
              )}

              {/* Icon wrapper */}
              <span
                className="flex items-center justify-center rounded-xl transition-all duration-200"
                style={{
                  width: "2.25rem",
                  height: "2.25rem",
                  background: isActive
                    ? "oklch(0.78 0.16 200 / 12%)"
                    : "transparent",
                  transform: isActive ? "scale(1.08)" : "scale(1)",
                }}
              >
                {tab.icon}
              </span>

              {/* Label */}
              <span
                className="text-[10px] font-medium leading-none tracking-wide transition-all duration-200"
                style={{
                  opacity: isActive ? 1 : 0.7,
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
