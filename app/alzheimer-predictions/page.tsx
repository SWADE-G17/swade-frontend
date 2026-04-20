"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import StudiesTable from "@/components/alzheimer/StudiesTable";
import UploadNewPredictionModal from "@/components/alzheimer/UploadNewPredictionModal";
import StudyDetailModal from "@/components/alzheimer/StudyDetailModal";
import type {
  ParsedPrediction,
  StudySummaryResponse,
} from "@/types/study";
import { parsePrediction } from "@/types/study";
import { fetchStudyResult, fetchStudies } from "@/lib/studyApi";
import { stripFilenameExtensions } from "@/lib/format";

export default function AlzheimerPredictionsPage() {
  const [studies, setStudies] = useState<StudySummaryResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailsStudyId, setDetailsStudyId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState("");

  // Para que la columna "Prediction" se vea como el figma, precargamos
  // la prediccion solo para estudios COMPLETED.
  const [predictionById, setPredictionById] = useState<
    Record<string, ParsedPrediction | null | undefined>
  >({});
  const fetchedPredictionIdsRef = useRef<Set<string>>(new Set());

  const refresh = async () => {
    try {
      setLoading(true);
      const data = await fetchStudies();
      setStudies(data);
    } catch {
      // keep previous list on failure
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const completed = studies.filter((s) => s.status === "COMPLETED");
    if (completed.length === 0) return;

    const run = async () => {
      for (const s of completed) {
        if (fetchedPredictionIdsRef.current.has(s.id)) continue;

        const outcome = await fetchStudyResult(s.id).catch(() => null);
        if (!outcome || outcome.status !== 200) continue;

        fetchedPredictionIdsRef.current.add(s.id);
        const parsed = parsePrediction(outcome.data.prediction);
        setPredictionById((prev) => ({
          ...prev,
          [s.id]: parsed,
        }));
      }
    };

    run();
  }, [studies]);

  const filteredStudies = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return studies;
    return studies.filter((s) => {
      const patientId = stripFilenameExtensions(s.originalFilename).toLowerCase();
      return (
        patientId.includes(q) ||
        s.originalFilename.toLowerCase().includes(q)
      );
    });
  }, [studies, patientSearch]);

  const headerSubtitle = useMemo(() => {
    const total = studies.length;
    const q = patientSearch.trim();
    if (!q) return `${total} ${total === 1 ? "estudio" : "estudios"}`;
    return `${filteredStudies.length} de ${total} ${total === 1 ? "estudio" : "estudios"}`;
  }, [studies.length, filteredStudies.length, patientSearch]);

  return (
    <div className="min-h-screen px-6 py-6">
      
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-800">
              Predicciones Alzheimer
            </h2>
            <p className="mt-1 text-xs text-zinc-400">{headerSubtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={refresh}
              disabled={loading}
            >
              {loading ? "Actualizando…" : "Actualizar"}
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl bg-[#5D5FEF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4f51d9] disabled:cursor-not-allowed disabled:bg-[#5D5FEF]/60"
              onClick={() => setUploadOpen(true)}
            >
              + Nueva predicción
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="relative w-full max-w-xs">
            <input
              type="search"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Buscar por ID de paciente"
              aria-label="Buscar estudios por ID de paciente"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-[#5D5FEF]/60 focus:ring-2 focus:ring-[#5D5FEF]/20"
            />
          </div>
        </div>
        <div className="border border-zinc-200 bg-white p-5 shadow-sm mt-4">
          <StudiesTable
            studies={filteredStudies}
            predictionById={predictionById}
            onOpenDetails={(id) => setDetailsStudyId(id)}
          />
        </div>

      {uploadOpen && (
        <UploadNewPredictionModal
          onClose={() => setUploadOpen(false)}
          onCreated={() => {
            fetchedPredictionIdsRef.current = new Set();
            refresh();
          }}
        />
      )}

      {detailsStudyId && (
        <StudyDetailModal
          studyId={detailsStudyId}
          onClose={() => setDetailsStudyId(null)}
        />
      )}
    </div>
  );
}

