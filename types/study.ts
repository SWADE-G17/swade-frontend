export type StudyStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export type StudyCreateResponse = {
  id: string;
  status: StudyStatus;
  createdAt: string; // ISO-8601 UTC Instant
};

export type StudySummaryResponse = {
  id: string;
  originalFilename: string;
  status: StudyStatus;
  createdAt: string; // ISO-8601 UTC Instant
};

export type StudyDetailResponse = {
  id: string;
  originalFilename: string;
  status: StudyStatus;
  createdAt: string; // ISO-8601 UTC Instant
  error?: string | null;
};

export type StudyResultResponse = {
  prediction: string;
  // Absolute URLs to the streaming volume endpoints (already JWT-gated).
  // null means the worker hasn't finished writing them yet — caller must
  // not try to mount the viewer in that case.
  heatmapUrl: string | null;
  origUrl: string | null;
  // Report still served as a relative path under the same API base.
  reportPath: string | null;
};

export type ParsedPrediction = {
  predictedName: string;
  confidence: number;
};

export function parsePrediction(raw: string): ParsedPrediction | null {
  try {
    const obj = JSON.parse(raw);
    const name: string = obj.predicted_name ?? "Desconocido";
    const idx: number = obj.predicted_class ?? 0;
    const probs: number[] = obj.probabilities ?? [];
    return { predictedName: name, confidence: probs[idx] ?? 0 };
  } catch {
    return null;
  }
}

