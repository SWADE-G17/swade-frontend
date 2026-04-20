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
  heatmapPath: string; // relative path
  reportPath: string; // relative path
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

