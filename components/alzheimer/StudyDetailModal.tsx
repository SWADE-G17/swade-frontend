"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { StudyDetailResponse, StudyResultResponse } from "@/types/study";
import { downloadBlobFromApi, openPdfInNewTab } from "@/lib/download";
import {
  fetchStudyDetail,
  fetchStudyResult,
  resolveApiPath,
} from "@/lib/studyApi";
import { useAuth } from "@/lib/auth";
import StudyStatusBadge from "@/components/common/StudyStatusBadge";
import { formatDateUtc, stripFilenameExtensions } from "@/lib/format";

export default function StudyDetailModal({
  studyId,
  onClose,
}: {
  studyId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [detail, setDetail] = useState<StudyDetailResponse | null>(null);
  const [result, setResult] = useState<StudyResultResponse | null>(null);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const closeStartedRef = useRef(false);

  const requestClose = useCallback(() => {
    if (closeStartedRef.current) return;
    closeStartedRef.current = true;
    setPanelOpen(false);
    window.setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setPanelOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestClose]);

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

          if (outcome.status === 401 || outcome.status === 403) {
            signOut().catch(() => router.replace("/login"));
            return;
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
        const message = err instanceof Error ? err.message : "Error al consultar el estudio.";
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
  }, [studyId, signOut, router]);

  // heatmapUrl / origUrl from the contract are absolute URLs and may be null
  // while the worker is still writing the volumes. reportPath is still
  // relative, so resolveApiPath() is needed for it.
  const heatmapDownloadUrl = result?.heatmapUrl ?? null;
  const resolvedReportUrl = result?.reportPath
    ? resolveApiPath(result.reportPath)
    : null;
  const volumesPending =
    !!result && (result.heatmapUrl === null || result.origUrl === null);

  const overlay = (
    <>
      <div
        className={`fixed inset-0 z-[100] bg-black/40 transition-opacity duration-300 ease-out ${
          panelOpen ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) requestClose();
        }}
      />
      <div
        className={`fixed top-0 right-0 z-[110] flex h-[100dvh] max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden border-l border-zinc-200 bg-white shadow-2xl transition-transform duration-300 ease-out ${
          panelOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="study-detail-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 p-5">
          <div>
            <h3
              id="study-detail-title"
              className="text-sm font-semibold text-zinc-900"
            >
              Detalles del estudio
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              {studyId}
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="space-y-3">
          {detail ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <StudyStatusBadge status={detail.status} />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Archivo del paciente
                </div>
                <div className="break-all text-sm font-medium text-zinc-800">
                  {stripFilenameExtensions(detail.originalFilename)}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Creado
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
                  Esperando a que el servidor termine de procesar…
                </p>
              )}

              {detail.status === "COMPLETED" && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                    Resultado
                  </div>

                  {result ? (
                    <PredictionTable raw={result.prediction} />
                  ) : (
                    <div className="mt-2 text-sm text-zinc-800">
                      Obteniendo resultado…
                    </div>
                  )}

                  {result && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {heatmapDownloadUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setDownloadError(null);
                            downloadBlobFromApi(
                              heatmapDownloadUrl,
                              "processed_mri.nii.gz",
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
                          Descargar mapa de calor (.nii.gz)
                        </button>
                      )}

                      {resolvedReportUrl && result.reportPath && (
                        <button
                          type="button"
                          onClick={() => {
                            setDownloadError(null);
                            const reportPath = result.reportPath;
                            if (!reportPath) return;
                            openPdfInNewTab(reportPath).catch((err) => {
                              setDownloadError(
                                err instanceof Error
                                  ? err.message
                                  : "No se pudo abrir el reporte.",
                              );
                            });
                          }}
                          className="inline-flex items-center justify-center rounded-xl border border-[#5D5FEF]/40 bg-white px-3 py-2 text-xs font-medium text-[#2B2B5F] transition hover:bg-[#5D5FEF]/10"
                        >
                          Ver informe (PDF)
                        </button>
                      )}
                    </div>
                  )}

                      <button
                        type="button"
                        disabled={volumesPending}
                        title={
                          volumesPending
                            ? "Los volúmenes aún no están disponibles."
                            : undefined
                        }
                        onClick={() => {
                          router.push(`/estudios/${studyId}/resultado`);
                        }}
                        className="mt-3 inline-flex items-center justify-center rounded-xl border border-[#5D5FEF]/40 bg-white px-3 py-2 text-xs font-medium text-[#2B2B5F] transition hover:bg-[#5D5FEF]/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Visualizar en el navegador web
                      </button>

                  {volumesPending && (
                    <p className="mt-2 text-xs text-zinc-500">
                      Volúmenes aún no disponibles. Reintenta en unos segundos.
                    </p>
                  )}

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
                Cargando estudio…
              </p>
              <p className="text-xs text-zinc-500">
                Consultando el estado hasta que el estudio finalice.
              </p>
            </div>
          )}
          </div>
        </div>
      </div>
    </>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}

const CLASS_LABELS = ["AD", "MCI", "CN"] as const;

function PredictionTable({ raw }: { raw: string }) {
  let parsed: { predictedClass: number | null; probabilities: number[] } | null =
    null;
  try {
    const obj = JSON.parse(raw) as {
      predicted_class?: number;
      probabilities?: number[];
    };
    parsed = {
      predictedClass:
        typeof obj.predicted_class === "number" ? obj.predicted_class : null,
      probabilities: Array.isArray(obj.probabilities) ? obj.probabilities : [],
    };
  } catch {
    parsed = null;
  }

  if (!parsed) {
    return (
      <div className="mt-2 break-words text-xs text-zinc-700">{raw}</div>
    );
  }

  const { predictedClass, probabilities } = parsed;

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-emerald-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-emerald-100/60 text-[11px] uppercase tracking-wide text-emerald-900">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Nombre clase</th>
            <th className="px-3 py-2 text-right font-semibold">
              Probabilidad de la clase
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-emerald-100">
          {CLASS_LABELS.map((label, idx) => {
            const prob = probabilities[idx];
            const isPredicted = predictedClass === idx;
            return (
              <tr
                key={label}
                className={
                  isPredicted
                    ? "bg-emerald-50 font-semibold text-emerald-900"
                    : "text-zinc-800"
                }
              >
                <td className="px-3 py-2">{label}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {typeof prob === "number"
                    ? `${(prob * 100).toFixed(2)}%`
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

