"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (session) {
      router.replace("/alzheimer-predictions");
    } else {
      router.replace("/login");
    }
  }, [session, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-zinc-500">Redirigiendo...</p>
    </div>
  );
}
