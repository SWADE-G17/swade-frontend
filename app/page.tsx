"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, getDefaultRoute } from "@/lib/auth";

export default function Home() {
  const { session, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (session) {
      router.replace(getDefaultRoute(role));
    } else {
      router.replace("/login");
    }
  }, [session, role, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-zinc-500">Redirigiendo...</p>
    </div>
  );
}
