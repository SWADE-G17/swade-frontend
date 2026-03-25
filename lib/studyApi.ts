import type {
  StudyCreateResponse,
  StudyDetailResponse,
  StudyResultResponse,
  StudySummaryResponse,
} from "@/types/study";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

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
  const res = await fetch(`${API_BASE_URL}/estudios`);
  if (!res.ok) throw new Error(`GET /estudios failed (${res.status})`);
  return (await res.json()) as StudySummaryResponse[];
}

export async function createStudy(file: File): Promise<StudyCreateResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/estudios`, {
    method: "POST",
    body: formData,
  });

  if (res.status === 400) throw new Error("Solicitud inválida (400).");
  if (res.status !== 202) {
    throw new Error(`POST /estudios inesperado (${res.status}).`);
  }

  return (await res.json()) as StudyCreateResponse;
}

export async function fetchStudyDetail(
  id: string,
): Promise<StudyDetailResponse> {
  const res = await fetch(`${API_BASE_URL}/estudios/${id}`);
  if (res.status === 404) throw new Error("404");
  if (!res.ok) throw new Error(`GET detail failed (${res.status})`);
  return (await res.json()) as StudyDetailResponse;
}

export type StudyResultFetchOutcome =
  | { status: 200; data: StudyResultResponse }
  | { status: 404 }
  | { status: 409 };

export async function fetchStudyResult(
  id: string,
): Promise<StudyResultFetchOutcome> {
  const res = await fetch(`${API_BASE_URL}/estudios/${id}/resultado`);
  if (res.status === 404) return { status: 404 };
  if (res.status === 409) return { status: 409 };
  if (!res.ok) throw new Error(`GET resultado failed (${res.status})`);
  return { status: 200, data: (await res.json()) as StudyResultResponse };
}

