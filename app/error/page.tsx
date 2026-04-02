"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const message =
    searchParams.get("message") ?? "Ha ocurrido un error inesperado.";
  const code = searchParams.get("code") ?? "Error";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1a1145] via-[#1e1554] to-[#2a1a6b] px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 text-6xl font-bold text-white/20">{code}</div>
        <h1 className="mb-4 font-serif text-3xl font-bold tracking-widest text-white">
          SWADE
        </h1>
        <p className="mb-8 text-sm text-gray-300">{message}</p>
        <div className="flex justify-center gap-3">
          <Link
            href="/login"
            className="rounded-md bg-[#1a5c6b] px-6 py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-[#1d6d7e]"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/alzheimer-predictions"
            className="rounded-md border border-white/20 px-6 py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-white/10"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1a1145] via-[#1e1554] to-[#2a1a6b]">
          <p className="text-white">Cargando...</p>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
