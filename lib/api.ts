import { getAccessToken } from "@/lib/auth";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  if (!token) throw new Error("No hay sesión activa.");
  return { Authorization: `Bearer ${token}` };
}

export async function authFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = await authHeaders();
  const res = await fetch(input, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });

  if (res.status === 401) {
    throw new Error("No autorizado.");
  }

  return res;
}
