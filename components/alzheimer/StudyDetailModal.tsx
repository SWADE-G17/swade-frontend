"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { StudyDetailResponse, StudyResultResponse } from "@/types/study";
import { downloadBlobFromApi, openPdfInNewTab } from "@/lib/download";
import {
  fetchStudyDetail,
  fetchStudyResult,
  resolveApiPath,
} from "@/lib/studyApi";
import StudyStatusBadge from "@/components/common/StudyStatusBadge";
import { formatDateUtc } from "@/lib/format";

export default function StudyDetailModal({
  studyId,
  onClose,
}: {
  studyId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<StudyDetailResponse | null>(null);
  const [result, setResult] = useState<StudyResultResponse | null>(null);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (!studyId) return;

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const d = await fetchStudyDetail(studyId);
        if (cancelled) return;
        setDetail(d);
        setPollingError(null);

        if (d.status === "COMPLETED") {
          const outcome = await fetchStudyResult(studyId);
          if (cancelled) return;

          if (outcome.status === 200) {
            setResult(outcome.data);
            return; // stop polling
          }

          if (outcome.status === 409) {
            timeout = setTimeout(poll, 1500);
            return;
          }

          if (outcome.status === 404) {
            setDownloadError("Resultado no encontrado (404).");
            timeout = setTimeout(poll, 1500);
            return;
          }
        }

        if (d.status === "FAILED") {
          setResult(null);
          return; // stop polling
        }

        timeout = setTimeout(poll, 1500);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Error al consultar.";
        if (message === "404") setPollingError("Estudio no encontrado (404).");
        else setPollingError(message);
        timeout = setTimeout(poll, 2000);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [studyId]);

  const resolvedHeatmapUrl = result?.heatmapPath
    ? resolveApiPath(result.heatmapPath)
    : null;
  const resolvedReportUrl = result?.reportPath
    ? resolveApiPath(result.reportPath)
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">
              Study Details
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              {studyId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {detail ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <StudyStatusBadge status={detail.status} />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Patient file
                </div>
                <div className="break-all text-sm font-medium text-zinc-800">
                  {detail.originalFilename}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Created
                </div>
                <div className="text-sm text-zinc-700">{formatDateUtc(detail.createdAt)}</div>
              </div>

              {detail.status === "FAILED" && detail.error && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {detail.error}
                </div>
              )}

              {pollingError && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {pollingError}
                </div>
              )}

              {detail.status !== "COMPLETED" && detail.status !== "FAILED" && (
                <p className="text-xs text-zinc-500">
                  Waiting for the backend to finish processing...
                </p>
              )}

              {detail.status === "COMPLETED" && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                    Result
                  </div>

                  <div className="mt-2 text-sm text-zinc-800">
                    <span className="font-medium">Prediction: </span>
                    {result ? result.prediction : "Getting result..."}
                  </div>

                  {result && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {resolvedHeatmapUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setDownloadError(null);
                            downloadBlobFromApi(
                              result.heatmapPath,
                              "processed_mri.nii",
                            ).catch((err) => {
                              setDownloadError(
                                err instanceof Error
                                  ? err.message
                                  : "No se pudo descargar el heatmap.",
                              );
                            });
                          }}
                          className="inline-flex items-center justify-center rounded-xl bg-[#5D5FEF] px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-[#4f51d9]"
                        >
                          Download heatmap (.nii)
                        </button>
                      )}

                      {resolvedReportUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setDownloadError(null);
                            openPdfInNewTab(result.reportPath).catch((err) => {
                              setDownloadError(
                                err instanceof Error
                                  ? err.message
                                  : "No se pudo abrir el reporte.",
                              );
                            });
                          }}
                          className="inline-flex items-center justify-center rounded-xl border border-[#5D5FEF]/40 bg-white px-3 py-2 text-xs font-medium text-[#2B2B5F] transition hover:bg-[#5D5FEF]/10"
                        >
                          View report PDF
                        </button>
                      )}
                    </div>
                  )}

                      <button
                        type="button"
                        onClick={() => {
                          // Ruta frontend para visualizar en Niivue.
                          // Por ahora el volumen está mockeado (ver app/estudios/[id]/resultado).
                          router.push(`/estudios/${studyId}/resultado`);
                        }}
                        className="inline-flex items-center justify-center rounded-xl border border-[#5D5FEF]/40 bg-white px-3 py-2 text-xs font-medium text-[#2B2B5F] transition hover:bg-[#5D5FEF]/10"
                      >
                        Visualizar con Niivue
                      </button>

                  {downloadError && (
                    <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      {downloadError}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-900">
                Loading study...
              </p>
              <p className="text-xs text-zinc-500">
                Polling the backend until the study finishes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

