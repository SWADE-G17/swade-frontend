"use client";

import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";

const AUTH_PAGES = ["/login", "/signup", "/error"];

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading } = useAuth();
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-zinc-50">
        <div className="text-sm text-zinc-500">Cargando…</div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 overflow-hidden bg-zinc-50 text-zinc-900">
      <Sidebar />
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ShellInner>{children}</ShellInner>
    </AuthProvider>
  );
}
