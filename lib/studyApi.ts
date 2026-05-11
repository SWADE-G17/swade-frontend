import type {
  StudyCreateResponse,
  StudyDetailResponse,
  StudyResultResponse,
  StudySummaryResponse,
} from "@/types/study";
import { API_BASE_URL, authFetch, authHeaders } from "@/lib/api";

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function resolveApiPath(path: string) {
  if (!path) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!path.startsWith("/")) return `${API_BASE_URL}/${path}`;
  return `${API_BASE_URL}${path}`;
}

export async function fetchStudies(): Promise<StudySummaryResponse[]> {
  const res = await authFetch(`${API_BASE_URL}/estudios`);
  if (!res.ok)
    throw new Error(`No se pudo obtener la lista de estudios (${res.status}).`);
  return (await res.json()) as StudySummaryResponse[];
}

export async function createStudy(file: File): Promise<StudyCreateResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/estudios`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (res.status === 401) throw new Error("No autorizado.");
  if (res.status === 400) throw new Error("Solicitud inválida (400).");
  if (res.status !== 202) {
    throw new Error(`POST /estudios inesperado (${res.status}).`);
  }

  return (await res.json()) as StudyCreateResponse;
}

export async function fetchStudyDetail(
  id: string,
): Promise<StudyDetailResponse> {
  const res = await authFetch(`${API_BASE_URL}/estudios/${id}`);
  if (res.status === 404) throw new Error("404");
  if (!res.ok)
    throw new Error(`No se pudo obtener el detalle del estudio (${res.status}).`);
  return (await res.json()) as StudyDetailResponse;
}

export type StudyResultFetchOutcome =
  | { status: 200; data: StudyResultResponse }
  | { status: 401 }
  | { status: 403 }
  | { status: 404 }
  | { status: 409 };

// Bypasses authFetch's 401-throws-Error behavior so the caller can
// distinguish 401/403 (route to login) from other HTTP failures.
export async function fetchStudyResult(
  id: string,
): Promise<StudyResultFetchOutcome> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/estudios/${id}/resultado`, {
    headers,
  });
  if (res.status === 401) return { status: 401 };
  if (res.status === 403) return { status: 403 };
  if (res.status === 404) return { status: 404 };
  if (res.status === 409) return { status: 409 };
  if (!res.ok)
    throw new Error(`No se pudo obtener el resultado (${res.status}).`);
  return { status: 200, data: (await res.json()) as StudyResultResponse };
}

export type ReporteFetchOutcome =
  | { status: 200; blob: Blob; filename: string; contentLength?: number }
  | { status: 401 }
  | { status: 403 }
  | { status: 404 }
  | { status: 502 };

// Streams the per-estudio PDF report. The endpoint is the single source of
// truth — never reconstruct an object URL from report_path / MinIO. 404 means
// "no report yet" (legitimate state) and 502 means "upstream storage failed";
// callers should distinguish these from generic errors.
export async function fetchReporteBlob(
  id: string,
): Promise<ReporteFetchOutcome> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/estudios/${id}/reporte`, {
    headers,
  });

  if (res.status === 401) return { status: 401 };
  if (res.status === 403) return { status: 403 };
  if (res.status === 404) return { status: 404 };
  if (res.status === 502) return { status: 502 };
  if (!res.ok)
    throw new Error(`No se pudo obtener el reporte (${res.status}).`);

  const blob = await res.blob();
  const dispositionFilename = parseContentDispositionFilename(
    res.headers.get("Content-Disposition"),
  );
  const lengthHeader = res.headers.get("Content-Length");
  const parsedLength = lengthHeader ? Number(lengthHeader) : NaN;

  return {
    status: 200,
    blob,
    filename: dispositionFilename ?? `estudio-${id}-report.pdf`,
    contentLength: Number.isFinite(parsedLength) ? parsedLength : undefined,
  };
}

// RFC 6266 — prefers the encoded `filename*` form when present, falls back to
// the legacy quoted/bare `filename` form. Returns null when nothing usable was
// found so callers can apply their own fallback.
export function parseContentDispositionFilename(
  header: string | null,
): string | null {
  if (!header) return null;

  const star = /filename\*\s*=\s*([^']*)''([^;]+)/i.exec(header);
  if (star) {
    try {
      return decodeURIComponent(star[2].trim());
    } catch {
      // malformed encoding — fall through to the legacy form
    }
  }

  const quoted = /filename\s*=\s*"([^"]+)"/i.exec(header);
  if (quoted) return quoted[1];

  const bare = /filename\s*=\s*([^;]+)/i.exec(header);
  if (bare) return bare[1].trim();

  return null;
}
