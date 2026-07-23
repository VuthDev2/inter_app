"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const router = useRouter();
  const { user, initialized } = useAuth();

  useEffect(() => {
    if (!initialized) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [initialized, user, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );
}
