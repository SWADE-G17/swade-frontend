"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Error inesperado al registrarse.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1a1145] via-[#1e1554] to-[#2a1a6b] px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-6 font-serif text-4xl font-bold tracking-widest text-white">
            SWADE
          </h1>
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/20 px-6 py-4">
            <p className="text-sm text-emerald-200">
              Cuenta creada correctamente. Revisa tu correo electrónico para
              confirmar tu cuenta.
            </p>
          </div>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-medium text-[#5fcdd9] underline-offset-2 hover:underline"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1a1145] via-[#1e1554] to-[#2a1a6b] px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-10 text-center font-serif text-4xl font-bold tracking-widest text-white">
          SWADE
        </h1>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none transition focus:border-[#2d7a8a] focus:ring-2 focus:ring-[#2d7a8a]/30"
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none transition focus:border-[#2d7a8a] focus:ring-2 focus:ring-[#2d7a8a]/30"
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none transition focus:border-[#2d7a8a] focus:ring-2 focus:ring-[#2d7a8a]/30"
            />
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
            {loading ? "Registrando..." : "Registrarse"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-medium text-[#5fcdd9] underline-offset-2 hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
