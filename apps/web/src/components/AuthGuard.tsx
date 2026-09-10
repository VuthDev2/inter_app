"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { initialized, user } = useAuth();

  useEffect(() => {
    if (initialized && !user) {
      router.push("/login");
    }
  }, [initialized, user, router]);

  if (!initialized) {
    return (
      // Only the area under the app bar, which the layout keeps on screen.
      // A full-screen takeover here used to blank the header on every guarded
      // page, which read as the whole top jumping.
      <div className="flex-1 flex items-center justify-center bg-[rgb(var(--bg))] text-[rgba(var(--text-secondary),1)] text-lg">
        Loading...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
