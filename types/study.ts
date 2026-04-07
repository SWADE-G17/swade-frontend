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

