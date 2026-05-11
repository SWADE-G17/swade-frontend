"use client";

import { useState } from "react";
import type { Usuario } from "@/types/user";
import { deleteUser } from "@/lib/userApi";

export default function DeleteUserConfirmModal({
  user,
  onClose,
  onDeleted,
}: {
  user: Usuario;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    try {
      setDeleting(true);
      await deleteUser(user.id);
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setDeleting(false);
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
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-zinc-900">Eliminar usuario</h3>
        <p className="mt-2 text-sm text-zinc-600">
          ¿Seguro que deseas eliminar a{" "}
          <span className="font-medium text-zinc-900">
            {user.username ?? user.email ?? user.id}
          </span>
          ? Esta acción no se puede deshacer.
        </p>

        {error && (
          <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? "Eliminando…" : "Eliminar"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
