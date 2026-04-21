"use client";

import type { UsuarioRole } from "@/types/user";

const styles: Record<UsuarioRole, string> = {
  Administrador: "bg-purple-50 text-purple-700 ring-purple-200",
  Clínico: "bg-sky-50 text-sky-700 ring-sky-200",
  Académico: "bg-amber-50 text-amber-700 ring-amber-200",
};

export default function RoleBadge({ role }: { role: UsuarioRole }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[role]}`}
    >
      {role}
    </span>
  );
}
