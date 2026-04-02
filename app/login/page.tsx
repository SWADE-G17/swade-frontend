"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function EyeOffIcon({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label="Toggle password visibility"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function EyeIcon({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label="Toggle password visibility"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      router.replace("/alzheimer-predictions");
    } catch {
      setError("Error inesperado al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1a1145] via-[#1e1554] to-[#2a1a6b] px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-10 text-center font-serif text-4xl font-bold tracking-widest text-white">
          SWADE
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <input
              type="email"
              placeholder="Usuario"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 pr-12 text-sm text-gray-700 placeholder-gray-400 outline-none transition focus:border-[#2d7a8a] focus:ring-2 focus:ring-[#2d7a8a]/30"
            />
            <UserIcon className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 pr-12 text-sm text-gray-700 placeholder-gray-400 outline-none transition focus:border-[#2d7a8a] focus:ring-2 focus:ring-[#2d7a8a]/30"
            />
            {showPassword ? (
              <EyeIcon
                className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(false)}
              />
            ) : (
              <EyeOffIcon
                className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(true)}
              />
            )}
          </div>

          {error && (
            <div className="rounded-md border border-red-300/40 bg-red-500/20 px-4 py-2 text-center text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#1a5c6b] py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-[#1d6d7e] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          ¿No tienes cuenta?{" "}
          <Link
            href="/signup"
            className="font-medium text-[#5fcdd9] underline-offset-2 hover:underline"
          >
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
