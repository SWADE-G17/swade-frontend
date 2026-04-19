"use client";

import { useState } from "react";
import type { Usuario, UsuarioRole } from "@/types/user";
import { updateUser } from "@/lib/userApi";

const ROLES: UsuarioRole[] = ["Administrador", "Clínico", "Académico"];

export default function EditUserModal({
  user,
  onClose,
  onUpdated,
}: {
  user: Usuario;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [username, setUsername] = useState(user.username ?? "");
  const [role, setRole] = useState<UsuarioRole>(user.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges =
    username.trim() !== (user.username ?? "") || role !== user.role;
  const canSubmit = !saving && hasChanges && username.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setSaving(true);
      await updateUser(user.id, {
        username: username.trim(),
        role,
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
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
            <h3 className="text-sm font-semibold text-zinc-900">Edit User</h3>
            <p className="mt-1 text-xs text-zinc-500">
              {user.email ?? user.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-zinc-700">
            <span className="font-medium">Username</span>
            <input
              type="text"
              required
              maxLength={255}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-[#5D5FEF]/60 focus:ring-2 focus:ring-[#5D5FEF]/20"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-zinc-700">
            <span className="font-medium">Role</span>
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
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
