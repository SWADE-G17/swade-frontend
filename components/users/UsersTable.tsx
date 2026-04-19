"use client";

import type { Usuario } from "@/types/user";
import RoleBadge from "@/components/users/RoleBadge";
import { formatDateUtc } from "@/lib/format";

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

export default function UsersTable({
  users,
  onEdit,
  onDelete,
}: {
  users: Usuario[];
  onEdit: (user: Usuario) => void;
  onDelete: (user: Usuario) => void;
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold text-zinc-500">
            <th className="pb-3 pr-4">Username</th>
            <th className="pb-3 pr-4">Email</th>
            <th className="pb-3 pr-4">Role</th>
            <th className="pb-3 pr-4">Created</th>
            <th className="pb-3 pr-4">Updated</th>
            <th className="pb-3 pr-2 text-right"> </th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="py-10 text-center text-sm text-zinc-500"
              >
                No users found.
              </td>
            </tr>
          ) : (
            users.map((u) => (
              <tr
                key={u.id}
                className="border-t border-zinc-100 hover:bg-zinc-50/60"
              >
                <td className="py-3 pr-4">
                  <span className="block max-w-[200px] truncate font-medium text-zinc-800">
                    {u.username ?? "—"}
                  </span>
                </td>
                <td className="py-3 pr-4 text-zinc-600">
                  {u.email ?? "—"}
                </td>
                <td className="py-3 pr-4">
                  <RoleBadge role={u.role} />
                </td>
                <td className="py-3 pr-4 text-zinc-500">
                  {formatDateUtc(u.createdAt)}
                </td>
                <td className="py-3 pr-4 text-zinc-500">
                  {formatDateUtc(u.updatedAt)}
                </td>
                <td className="py-3 pr-2 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                      aria-label={`Edit ${u.username ?? u.email}`}
                      onClick={() => onEdit(u)}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-red-500 hover:bg-red-50"
                      aria-label={`Delete ${u.username ?? u.email}`}
                      onClick={() => onDelete(u)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
