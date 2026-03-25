import { resolveApiPath } from "@/lib/studyApi";

export async function downloadBlobFromApi(
  url: string,
  filename: string,
): Promise<void> {
  const finalUrl = resolveApiPath(url);
  const res = await fetch(finalUrl);

  if (!res.ok) {
    if (res.status === 409) throw new Error("El estudio aún no está completado (409).");
    if (res.status === 404) throw new Error("Recurso no encontrado (404).");
    throw new Error(`Error al descargar (${res.status}).`);
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export function openPdfInNewTab(url: string) {
  const finalUrl = resolveApiPath(url);
  window.open(finalUrl, "_blank", "noopener,noreferrer");
}

