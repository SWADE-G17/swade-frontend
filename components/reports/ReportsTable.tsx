"use client";

import type { StudySummaryResponse } from "@/types/study";
import { stripFilenameExtensions } from "@/lib/format";

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

export type ReportRow = {
  study: StudySummaryResponse;
  reportPath: string;
};

export default function ReportsTable({
  rows,
  onDownload,
  downloadingId,
}: {
  rows: ReportRow[];
  onDownload: (row: ReportRow) => void;
  downloadingId: string | null;
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold text-zinc-500">
            <th className="pb-3 pr-4">Paciente N.º</th>
            <th className="pb-3 pr-4">Nombre archivo</th>
            <th className="pb-3 pr-2 text-right"> </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={3}
                className="py-10 text-center text-sm text-zinc-500"
              >
                No hay informes disponibles aún.
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const { study } = row;
              const isDownloading = downloadingId === study.id;
              return (
                <tr
                  key={study.id}
                  className="border-t border-zinc-100 hover:bg-zinc-50/60"
                >
                  <td className="py-3 pr-4 font-mono text-xs text-zinc-800">
                    {study.id}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="block max-w-[260px] truncate font-medium text-zinc-800">
                      {stripFilenameExtensions(study.originalFilename)}
                    </span>
                  </td>
                  <td className="py-3 pr-2 text-right">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={`Descargar informe de ${stripFilenameExtensions(study.originalFilename)}`}
                      title="Descargar informe (PDF)"
                      onClick={() => onDownload(row)}
                      disabled={isDownloading}
                    >
                      <DownloadIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
