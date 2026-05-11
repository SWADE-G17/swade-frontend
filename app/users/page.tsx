"use client";

import { useEffect, useMemo, useState } from "react";
import type { Usuario } from "@/types/user";
import { fetchUsers } from "@/lib/userApi";
import UsersTable from "@/components/users/UsersTable";
import CreateUserModal from "@/components/users/CreateUserModal";
import EditUserModal from "@/components/users/EditUserModal";
import DeleteUserConfirmModal from "@/components/users/DeleteUserConfirmModal";

export default function UsersPage() {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<Usuario | null>(null);
  const [deleteUser, setDeleteUser] = useState<Usuario | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const data = await fetchUsers();
      setUsers(data);
    } catch {
      // keep previous list on failure
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    );
  }, [users, search]);

  const subtitle = `${users.length} ${users.length === 1 ? "usuario" : "usuarios"}`;

  return (
    <div className="min-h-screen px-6 py-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-800">
            Usuarios
          </h2>
          <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={refresh}
            disabled={loading}
          >
            {loading ? "Actualizando…" : "Actualizar"}
          </button>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl bg-[#5D5FEF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4f51d9] disabled:cursor-not-allowed disabled:bg-[#5D5FEF]/60"
            onClick={() => setCreateOpen(true)}
          >
            + Nuevo usuario
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <input
            type="text"
            placeholder="Buscar por nombre, correo o rol…"
            aria-label="Buscar usuarios"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-[#5D5FEF]/60 focus:ring-2 focus:ring-[#5D5FEF]/20"
          />
        </div>
      </div>

      <div className="mt-4 border border-zinc-200 bg-white p-5 shadow-sm">
        <UsersTable
          users={filtered}
          onEdit={(u) => setEditUser(u)}
          onDelete={(u) => setDeleteUser(u)}
        />
      </div>

      {createOpen && (
        <CreateUserModal
          onClose={() => setCreateOpen(false)}
          onCreated={refresh}
        />
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onUpdated={refresh}
        />
      )}

      {deleteUser && (
        <DeleteUserConfirmModal
          user={deleteUser}
          onClose={() => setDeleteUser(null)}
          onDeleted={refresh}
        />
      )}
    </div>
  );
}
