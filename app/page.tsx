"use client";

import { useEffect, useMemo, useState } from "react";

type StudyStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

type StudyCreateResponse = {
  id: string;
  status: StudyStatus;
  createdAt: string;
};

type StudySummaryResponse = {
  id: string;
  originalFilename: string;
  status: StudyStatus;
  createdAt: string;
};

type StudyDetailResponse = {
  id: string;
  originalFilename: string;
  status: StudyStatus;
  createdAt: string;
  error?: string | null;
};

type StudyResultResponse = {
  prediction: string;
  heatmapPath: string;
  reportPath: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

function formatDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString();
}

function getStatusLabel(status: StudyStatus) {
  switch (status) {
    case "QUEUED":
      return "En cola";
    case "PROCESSING":
      return "Procesando";
    case "COMPLETED":
      return "Completado";
    case "FAILED":
      return "Fallido";
    default:
      return status;
  }
}

function getStatusColor(status: StudyStatus) {
  switch (status) {
    case "QUEUED":
      return "bg-amber-100 text-amber-800";
    case "PROCESSING":
      return "bg-[#5D5FEF]/10 text-[#5D5FEF]";
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-800";
    case "FAILED":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-zinc-100 text-zinc-800";
  }
}

async function downloadBlob(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 409) {
      throw new Error("El estudio aún no está completado (409).");
    }
    if (res.status === 404) {
      throw new Error("Recurso no encontrado (404).");
    }
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

function openPdfInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeStudyId, setActiveStudyId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StudyDetailResponse | null>(null);
  const [result, setResult] = useState<StudyResultResponse | null>(null);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [studies, setStudies] = useState<StudySummaryResponse[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const canSubmit = useMemo(
    () => !!file && !creating,
    [file, creating],
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingList(true);
        const res = await fetch(`${API_BASE_URL}/estudios`);
        if (!res.ok) return;
        const data = (await res.json()) as StudySummaryResponse[];
        setStudies(data);
      } catch {
        // ignore list errors for now
      } finally {
        setLoadingList(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!activeStudyId) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/estudios/${activeStudyId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setPollingError("Estudio no encontrado (404).");
          } else {
            setPollingError(`Error al obtener estado (${res.status}).`);
          }
          return;
        }
        const data = (await res.json()) as StudyDetailResponse;
        if (cancelled) return;
        setDetail(data);
        // Mantener la tabla consistente con el estado actual del estudio.
        setStudies((prev) =>
          prev.some((s) => s.id === data.id)
            ? prev.map((s) =>
                s.id === data.id
                  ? {
                      ...s,
                      originalFilename: data.originalFilename,
                      createdAt: data.createdAt,
                      status: data.status,
                    }
                  : s,
              )
            : [{ id: data.id, originalFilename: data.originalFilename, createdAt: data.createdAt, status: data.status }, ...prev],
        );
        setPollingError(null);

        if (data.status === "COMPLETED") {
          try {
            const resultRes = await fetch(
              `${API_BASE_URL}/estudios/${activeStudyId}/resultado`,
            );
            if (resultRes.status === 409) {
              setTimeout(poll, 1500);
              return;
            }
            if (!resultRes.ok) {
              setPollingError(
                `Error al obtener resultado (${resultRes.status}).`,
              );
              return;
            }
            const resultJson = (await resultRes.json()) as StudyResultResponse;
            if (cancelled) return;
            setResult(resultJson);
          } catch (err) {
            if (cancelled) return;
            setPollingError(
              err instanceof Error ? err.message : "Error al obtener resultado.",
            );
          }
        } else if (data.status === "FAILED") {
          // stop polling; detail has error
        } else {
          setTimeout(poll, 1500);
        }
      } catch (err) {
        if (cancelled) return;
        setPollingError(
          err instanceof Error ? err.message : "Error al obtener estado.",
        );
        setTimeout(poll, 2000);
      }
    };

    const timeoutId = setTimeout(poll, 0);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [activeStudyId]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setCreateError(null);
  };

  const handleCreateStudy = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setCreateError("Selecciona un archivo .nii o .nii.gz.");
      return;
    }
    const name = file.name.toLowerCase();
    if (!name.endsWith(".nii") && !name.endsWith(".nii.gz")) {
      setCreateError("El archivo debe ser .nii o .nii.gz.");
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);
      setDetail(null);
      setResult(null);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE_URL}/estudios`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        if (res.status === 400) {
          setCreateError(
            "Solicitud inválida (400). Verifica el archivo seleccionado.",
          );
        } else {
          setCreateError(`Error al crear estudio (${res.status}).`);
        }
        return;
      }

      if (res.status !== 202) {
        setCreateError(
          `Respuesta inesperada del servidor (${res.status}). Se esperaba 202.`,
        );
        return;
      }

      const data = (await res.json()) as StudyCreateResponse;
      setActiveStudyId(data.id);
      setIsCreateModalOpen(false);
      setFile(null);
      // Dejamos createError limpio para la próxima apertura del modal.
      setCreateError(null);

      setStudies((prev) => [
        {
          id: data.id,
          originalFilename: file.name,
          status: data.status,
          createdAt: data.createdAt,
        },
        ...prev,
      ]);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Error inesperado al crear estudio.",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleSelectStudy = (id: string) => {
    setActiveStudyId(id);
    setDetail(null);
    setResult(null);
    setPollingError(null);
  };

  const resolvedHeatmapUrl =
    result && result.heatmapPath
      ? `${API_BASE_URL}${result.heatmapPath}`
      : null;
  const resolvedReportUrl =
    result && result.reportPath ? `${API_BASE_URL}${result.reportPath}` : null;

  const getTablePrediction = (s: StudySummaryResponse) => {
    if (s.status === "FAILED") return "Error";
    if (s.status !== "COMPLETED") return "Pendiente";

    // Solo resolvemos la predicción completa para el estudio seleccionado.
    if (activeStudyId === s.id && result) return result.prediction;
    return "Completado";
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 antialiased">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col border-r border-zinc-200 bg-white px-4 py-6 lg:flex">
          <div className="flex items-center gap-2 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5D5FEF]/10 text-[#5D5FEF] font-bold">
              S
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-wide">SWADE</div>
              <div className="text-[11px] text-zinc-500">MRA Processing</div>
            </div>
          </div>

          <div className="mt-7 px-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Main Menu
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <button className="flex w-full items-center justify-between rounded-xl bg-[#5D5FEF]/5 px-3 py-2 text-zinc-900">
                <span className="font-medium text-zinc-900">Dashboard</span>
              </button>
              <button className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-zinc-700 hover:bg-zinc-50">
                <span className="font-medium text-zinc-700">Alzheimer predictions</span>
              </button>
              <button className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-zinc-700 hover:bg-zinc-50">
                <span className="font-medium text-zinc-700">Users</span>
              </button>
              <button className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-zinc-700 hover:bg-zinc-50">
                <span className="font-medium text-zinc-700">Reports</span>
              </button>
            </div>
          </div>

          <div className="mt-auto px-2 pt-6">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-sm font-semibold">Daniel Perez</div>
              <div className="text-[11px] text-zinc-500">Administrator</div>
            </div>
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-zinc-200 bg-white px-6 py-4">
            <div className="flex flex-1 items-center gap-4">
              <div className="relative w-full max-w-md">
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-[#5D5FEF]/60 focus:ring-2 focus:ring-[#5D5FEF]/20"
                />
              </div>

              <button className="hidden rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 lg:inline-flex">
                Filter
              </button>

              <button className="hidden rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 xl:inline-flex">
                Sort By: Recent
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    setLoadingList(true);
                    const res = await fetch(`${API_BASE_URL}/estudios`);
                    if (!res.ok) return;
                    const data = (await res.json()) as StudySummaryResponse[];
                    setStudies(data);
                  } finally {
                    setLoadingList(false);
                  }
                }}
                className="hidden rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 sm:inline-flex"
              >
                {loadingList ? "Updating..." : "Refresh"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreateError(null);
                  setFile(null);
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center justify-center rounded-xl bg-[#5D5FEF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4f51d9] disabled:cursor-not-allowed disabled:bg-[#5D5FEF]/60"
              >
                + New Prediction
              </button>
            </div>
          </header>

          <main className="flex-1 px-6 py-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Alzheimer Predictions
                </h2>

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-zinc-500">
                        <th className="pb-3 pr-4">Patient ID</th>
                        <th className="pb-3 pr-4">Patient Name</th>
                        <th className="pb-3 pr-4">Prediction</th>
                        <th className="pb-3 pr-4">Expires</th>
                        <th className="pb-3 pr-4">Precision</th>
                        <th className="pb-3 pr-4">Created</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 pr-2 text-right"> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {studies.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-sm text-zinc-500">
                            No hay estudios aún. Usa “+ New Prediction”.
                          </td>
                        </tr>
                      ) : (
                        studies.map((s) => (
                          <tr
                            key={s.id}
                            className={`cursor-pointer border-t border-zinc-100 ${
                              activeStudyId === s.id ? "bg-[#5D5FEF]/5" : "hover:bg-zinc-50"
                            }`}
                            onClick={() => handleSelectStudy(s.id)}
                          >
                            <td className="py-3 pr-4 font-mono text-xs text-zinc-800">
                              {s.id}
                            </td>
                            <td className="py-3 pr-4">
                              <span className="block max-w-[220px] truncate font-medium text-zinc-800">
                                {s.originalFilename}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-zinc-800">
                              {getTablePrediction(s)}
                            </td>
                            <td className="py-3 pr-4 text-zinc-500">--</td>
                            <td className="py-3 pr-4 text-zinc-500">--</td>
                            <td className="py-3 pr-4 text-zinc-500">{formatDate(s.createdAt)}</td>
                            <td className="py-3 pr-4">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusColor(
                                  s.status,
                                )}`}
                              >
                                {getStatusLabel(s.status)}
                              </span>
                            </td>
                            <td className="py-3 pr-2 text-right">
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectStudy(s.id);
                                }}
                                aria-label="Study actions"
                              >
                                <span className="text-lg leading-none">⋮</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Study Detail
                </h2>

                {!activeStudyId ? (
                  <p className="mt-4 text-sm text-zinc-500">
                    Selecciona un estudio en la tabla para ver su estado y descargar el resultado.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                        ID
                      </p>
                      <p className="mt-1 font-mono text-xs text-zinc-800">
                        {activeStudyId}
                      </p>
                    </div>

                    {detail && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-zinc-700">Estado:</span>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusColor(
                              detail.status,
                            )}`}
                          >
                            {getStatusLabel(detail.status)}
                          </span>
                        </div>

                        <p className="text-sm text-zinc-700">
                          <span className="font-medium">Archivo:</span> {detail.originalFilename}
                        </p>
                        <p className="text-sm text-zinc-700">
                          <span className="font-medium">Creado:</span> {formatDate(detail.createdAt)}
                        </p>

                        {detail.status === "FAILED" && detail.error && (
                          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                            Error: {detail.error}
                          </p>
                        )}
                      </div>
                    )}

                    {pollingError && (
                      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        {pollingError}
                      </p>
                    )}

                    {!detail ||
                    (detail.status !== "COMPLETED" && detail.status !== "FAILED") ? (
                      <p className="text-xs text-zinc-500">
                        Consultando estado del estudio cada 1–2 segundos...
                      </p>
                    ) : null}

                    {detail?.status === "COMPLETED" && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                          Resultado
                        </p>
                        <p className="mt-2 text-zinc-800">
                          <span className="font-medium">Predicción:</span>{" "}
                          {result ? result.prediction : "Obteniendo..."}
                        </p>

                        {result && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {resolvedHeatmapUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  downloadBlob(resolvedHeatmapUrl, "processed_mri.nii").catch((err) =>
                                    setPollingError(
                                      err instanceof Error
                                        ? err.message
                                        : "No se pudo descargar el heatmap.",
                                    ),
                                  )
                                }
                                className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-800"
                              >
                                Descargar heatmap (.nii)
                              </button>
                            )}
                            {resolvedReportUrl && (
                              <button
                                type="button"
                                onClick={() => openPdfInNewTab(resolvedReportUrl)}
                                className="inline-flex items-center justify-center rounded-xl border border-emerald-700 px-3 py-2 text-xs font-medium text-emerald-800 transition hover:bg-emerald-700 hover:text-white"
                              >
                                Ver reporte PDF
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 text-[11px] text-zinc-400">
                  Polling:{" "}
                  <span className="font-mono">GET /estudios/{"{id}"}</span> cada
                  1–2s. Resultado:{" "}
                  <span className="font-mono">
                    GET /estudios/{"{id}"}/resultado
                  </span>
                </div>
              </section>
            </div>

            <footer className="mt-6 text-center text-[11px] text-zinc-400">
              Sin autenticación por ahora. Las peticiones van directo a Spring.
            </footer>
          </main>
        </div>
      </div>

      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">New Prediction</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Sube un archivo NIfTI (.nii o .nii.gz)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleCreateStudy}
              className="mt-4 flex flex-col gap-3"
            >
              <label className="flex flex-col gap-2 text-sm text-zinc-700">
                <span className="font-medium">Archivo</span>
                <input
                  type="file"
                  accept=".nii,.nii.gz"
                  onChange={handleFileChange}
                  className="block w-full cursor-pointer rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-sm file:rounded-md file:border-0 file:bg-[#5D5FEF] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:border-zinc-400"
                />
              </label>

              {createError && (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {createError}
                </p>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center justify-center rounded-xl bg-[#5D5FEF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4f51d9] disabled:cursor-not-allowed disabled:bg-[#5D5FEF]/60"
              >
                {creating ? "Creando estudio..." : "Upload & Enqueue"}
              </button>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
