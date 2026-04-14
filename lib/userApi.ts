import { API_BASE_URL, authFetch } from "@/lib/api";
import type { Usuario, UsuarioUpdateRequest } from "@/types/user";

export async function fetchUsers(): Promise<Usuario[]> {
  const res = await authFetch(`${API_BASE_URL}/usuarios`);
  if (!res.ok) throw new Error(`GET /usuarios failed (${res.status})`);
  return (await res.json()) as Usuario[];
}

export async function updateUser(
  id: string,
  body: UsuarioUpdateRequest,
): Promise<Usuario> {
  const res = await authFetch(`${API_BASE_URL}/usuarios/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 400) throw new Error("Datos de usuario inválidos.");
  if (res.status === 404) throw new Error("Usuario no encontrado.");
  if (!res.ok) throw new Error(`PUT /usuarios/${id} failed (${res.status})`);
  return (await res.json()) as Usuario;
}

export async function deleteUser(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE_URL}/usuarios/${id}`, {
    method: "DELETE",
  });
  if (res.status === 404) throw new Error("Usuario no encontrado.");
  if (res.status !== 204)
    throw new Error(`DELETE /usuarios/${id} failed (${res.status})`);
}
