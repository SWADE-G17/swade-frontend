"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import StudiesTable from "@/components/alzheimer/StudiesTable";
import UploadNewPredictionModal from "@/components/alzheimer/UploadNewPredictionModal";
import StudyDetailModal from "@/components/alzheimer/StudyDetailModal";
import type {
  StudyResultResponse,
  StudySummaryResponse,
} from "@/types/study";
import { fetchStudyResult, fetchStudies } from "@/lib/studyApi";

export default function AlzheimerPredictionsPage() {
  const [studies, setStudies] = useState<StudySummaryResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailsStudyId, setDetailsStudyId] = useState<string | null>(null);

  // Para que la columna "Prediction" se vea como el figma, precargamos
  // la prediccion solo para estudios COMPLETED.
  const [predictionById, setPredictionById] = useState<
    Record<string, string | null | undefined>
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
        setPredictionById((prev) => ({
          ...prev,
          [s.id]: (outcome.data as StudyResultResponse).prediction,
        }));
      }
    };

    run();
  }, [studies]);

  const headerSubtitle = useMemo(() => {
    const total = studies.length;
    return `${total} studies`;
  }, [studies.length]);

  return (
    <div className="min-h-screen px-6 py-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Alzheimer Predictions
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
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl bg-[#5D5FEF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4f51d9] disabled:cursor-not-allowed disabled:bg-[#5D5FEF]/60"
              onClick={() => setUploadOpen(true)}
            >
              + New Prediction
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="relative w-full max-w-xs">
            <input
              type="text"
              placeholder="Search"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-[#5D5FEF]/60 focus:ring-2 focus:ring-[#5D5FEF]/20"
            />
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <button className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
              Filter
            </button>
            <button className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
              Sort By: Recent
            </button>
          </div>
        </div>

        <StudiesTable
          studies={studies}
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

