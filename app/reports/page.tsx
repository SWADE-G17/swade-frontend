"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReportsTable, { type ReportRow } from "@/components/reports/ReportsTable";
import type { StudySummaryResponse } from "@/types/study";
import { fetchStudies, fetchStudyResult } from "@/lib/studyApi";
import { downloadBlobFromApi } from "@/lib/download";
import { stripFilenameExtensions } from "@/lib/format";

export default function ReportsPage() {
  const [studies, setStudies] = useState<StudySummaryResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // undefined = aún no consultado, null = sin PDF, string = ruta del PDF
  const [reportPathById, setReportPathById] = useState<
    Record<string, string | null | undefined>
  >({});
  const fetchedReportIdsRef = useRef<Set<string>>(new Set());

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
        if (fetchedReportIdsRef.current.has(s.id)) continue;

        const outcome = await fetchStudyResult(s.id).catch(() => null);
        if (!outcome || outcome.status !== 200) continue;

        fetchedReportIdsRef.current.add(s.id);
        setReportPathById((prev) => ({
          ...prev,
          [s.id]: outcome.data.reportPath ?? null,
        }));
      }
    };

    run();
  }, [studies]);

  const rows = useMemo<ReportRow[]>(() => {
    return studies
      .filter((s) => s.status === "COMPLETED")
      .map((s) => {
        const reportPath = reportPathById[s.id];
        if (typeof reportPath !== "string" || reportPath.length === 0) {
          return null;
        }
        return { study: s, reportPath };
      })
      .filter((r): r is ReportRow => r !== null);
  }, [studies, reportPathById]);

  const filteredRows = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const patientId = stripFilenameExtensions(
        r.study.originalFilename,
      ).toLowerCase();
      return (
        patientId.includes(q) ||
        r.study.originalFilename.toLowerCase().includes(q) ||
        r.study.id.toLowerCase().includes(q)
      );
    });
  }, [rows, patientSearch]);

  const headerSubtitle = useMemo(() => {
    const total = rows.length;
    const q = patientSearch.trim();
    const word = total === 1 ? "informe" : "informes";
    if (!q) return `${total} ${word}`;
    return `${filteredRows.length} de ${total} ${word}`;
  }, [rows.length, filteredRows.length, patientSearch]);

  const handleDownload = async (row: ReportRow) => {
    setDownloadError(null);
    setDownloadingId(row.study.id);
    try {
      const filename = `${stripFilenameExtensions(row.study.originalFilename)}.pdf`;
      await downloadBlobFromApi(row.reportPath, filename);
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : "No se pudo descargar el informe.",
      );
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen px-6 py-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-800">
            Informes
          </h2>
          <p className="mt-1 text-xs text-zinc-400">{headerSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => {
              fetchedReportIdsRef.current = new Set();
              setReportPathById({});
              refresh();
            }}
            disabled={loading}
          >
            {loading ? "Actualizando…" : "Actualizar"}
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
            aria-label="Buscar informes por ID de paciente"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-[#5D5FEF]/60 focus:ring-2 focus:ring-[#5D5FEF]/20"
          />
        </div>
      </div>

      {downloadError && (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {downloadError}
        </div>
      )}

      <div className="mt-4 border border-zinc-200 bg-white p-5 shadow-sm">
        <ReportsTable
          rows={filteredRows}
          onDownload={handleDownload}
          downloadingId={downloadingId}
        />
      </div>
    </div>
  );
}
