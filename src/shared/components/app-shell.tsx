import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Languages, History, User as UserIcon, LogOut } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { BottomTabBar } from "@/components/bottom-tab-bar";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth" });
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Top header — hidden on mobile (tab bar takes over) */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/60 backdrop-blur-xl hidden sm:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/home" className="flex items-center gap-2 font-display text-lg font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Languages className="h-4 w-4" />
            </span>
            QuickVoice
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/home" label="Home" />
            <NavLink to="/history" label="History" icon={<History className="h-4 w-4" />} />
            <NavLink to="/profile" label="Profile" icon={<UserIcon className="h-4 w-4" />} />
            <NavLink to="/settings" label="Settings" />
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut();
                router.navigate({ to: "/auth" });
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </nav>
        </div>
      </header>

      {/* Mobile-only top bar with just the logo */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/60 backdrop-blur-xl sm:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/home" className="flex items-center gap-2 font-display text-base font-semibold">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Languages className="h-3.5 w-3.5" />
            </span>
            QuickVoice
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={async () => {
              await signOut();
              router.navigate({ to: "/auth" });
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main content — extra bottom padding on mobile so content clears the tab bar */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 pb-24 sm:pb-8">
        {children}
      </main>

      {/* Bottom tab bar — only on mobile */}
      <BottomTabBar />
    </div>
  );
}

function NavLink({ to, label, icon }: { to: string; label: string; icon?: ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&.active]:bg-secondary [&.active]:text-foreground"
      activeProps={{ className: "active" }}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
