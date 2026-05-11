"use client";

import { useState } from "react";
import type { UsuarioRole } from "@/types/user";
import { supabase, createSignUpClient } from "@/lib/supabase";

const ROLES: UsuarioRole[] = ["Administrador", "Clínico", "Académico"];

export default function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<UsuarioRole>("Clínico");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !creating &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    password === confirmPassword &&
    username.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      setCreating(true);

      const signUpClient = createSignUpClient();
      const { data, error: signUpError } = await signUpClient.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      const newUserId = data.user?.id;
      if (!newUserId) {
        setError("No se pudo crear el usuario: no se recibió el identificador.");
        return;
      }

      const { error: dbError } = await supabase.from("usuario").upsert({
        id: newUserId,
        username: username.trim(),
        role,
        email: email.trim(),
      });

      if (dbError) {
        setError(
          `Usuario de autenticación creado, pero falló al guardar el perfil: ${dbError.message}`,
        );
        return;
      }

      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">
              Crear usuario
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Nueva cuenta con correo y contraseña
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-zinc-700">
            <span className="font-medium">Correo electrónico</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-[#5D5FEF]/60 focus:ring-2 focus:ring-[#5D5FEF]/20"
              placeholder="correo@ejemplo.com"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-zinc-700">
            <span className="font-medium">Nombre de usuario</span>
            <input
              type="text"
              required
              maxLength={255}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-[#5D5FEF]/60 focus:ring-2 focus:ring-[#5D5FEF]/20"
              placeholder="Dr. García"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-zinc-700">
            <span className="font-medium">Contraseña</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-[#5D5FEF]/60 focus:ring-2 focus:ring-[#5D5FEF]/20"
              placeholder="Mín. 6 caracteres"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-zinc-700">
            <span className="font-medium">Confirmar contraseña</span>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-[#5D5FEF]/60 focus:ring-2 focus:ring-[#5D5FEF]/20"
              placeholder="Repetir contraseña"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-zinc-700">
            <span className="font-medium">Rol</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UsuarioRole)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#5D5FEF]/60 focus:ring-2 focus:ring-[#5D5FEF]/20"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center justify-center rounded-xl bg-[#5D5FEF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4f51d9] disabled:cursor-not-allowed disabled:bg-[#5D5FEF]/60"
          >
            {creating ? "Creando…" : "Crear usuario"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Cancelar
          </button>
        </form>
      </div>
    </div>
  );
}
