import { resolveApiPath } from "@/lib/studyApi";
import { getAccessToken } from "@/lib/auth";

export async function downloadBlobFromApi(
  url: string,
  filename: string,
): Promise<void> {
  const finalUrl = resolveApiPath(url);
  const token = await getAccessToken();
  const res = await fetch(finalUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("Sesión expirada (401).");
    if (res.status === 409) throw new Error("El estudio aún no está completado (409).");
    if (res.status === 404) throw new Error("Recurso no encontrado (404).");
    throw new Error(`Error al descargar (${res.status}).`);
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    triggerDownloadFromUrl(objectUrl, filename);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// Programmatic download via a synthetic <a download>. The caller owns the
// lifecycle of the URL (e.g. revoke after use, or keep it alive while an
// iframe is still using the same blob).
export function triggerDownloadFromUrl(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
