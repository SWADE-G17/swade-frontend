"use client";

import type { StudySummaryResponse } from "@/types/study";
import { formatDateUtc, stripFilenameExtensions } from "@/lib/format";
import ReportPdfViewer from "@/components/reports/ReportPdfViewer";

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

function ChevronIcon({
  className,
  expanded,
}: {
  className?: string;
  expanded: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`${className ?? ""} transition-transform ${
        expanded ? "rotate-180" : ""
      }`.trim()}
    >
      <path d="m6 9 6 6 6-6" />
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
  expandedId,
  onToggleExpand,
}: {
  rows: ReportRow[];
  onDownload: (row: ReportRow) => void;
  downloadingId: string | null;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold text-zinc-500">
            <th className="w-8 pb-3" aria-hidden></th>
            <th className="pb-3 pr-4">Paciente N.º</th>
            <th className="pb-3 pr-4">Nombre archivo</th>
            <th className="pb-3 pr-4">Creado</th>
            <th className="pb-3 pr-2 text-right"> </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="py-10 text-center text-sm text-zinc-500"
              >
                No hay informes disponibles aún.
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const { study } = row;
              const isDownloading = downloadingId === study.id;
              const isExpanded = expandedId === study.id;
              const patientName = stripFilenameExtensions(
                study.originalFilename,
              );

              return (
                <RowGroup
                  key={study.id}
                  row={row}
                  isExpanded={isExpanded}
                  isDownloading={isDownloading}
                  patientName={patientName}
                  onToggleExpand={onToggleExpand}
                  onDownload={onDownload}
                />
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function RowGroup({
  row,
  isExpanded,
  isDownloading,
  patientName,
  onToggleExpand,
  onDownload,
}: {
  row: ReportRow;
  isExpanded: boolean;
  isDownloading: boolean;
  patientName: string;
  onToggleExpand: (id: string) => void;
  onDownload: (row: ReportRow) => void;
}) {
  const { study } = row;

  return (
    <>
      <tr
        className={`cursor-pointer border-t border-zinc-100 transition ${
          isExpanded ? "bg-[#5D5FEF]/5" : "hover:bg-zinc-50/60"
        }`}
        onClick={() => onToggleExpand(study.id)}
        aria-expanded={isExpanded}
      >
        <td className="py-3 pl-1 pr-2 align-middle">
          <ChevronIcon
            className="h-4 w-4 text-zinc-500"
            expanded={isExpanded}
          />
        </td>
        <td className="py-3 pr-4 font-mono text-xs text-zinc-800">
          {study.id}
        </td>
        <td className="py-3 pr-4">
          <span className="block max-w-[260px] truncate font-medium text-zinc-800">
            {patientName}
          </span>
        </td>
        <td className="py-3 pr-4 text-zinc-500">
          {formatDateUtc(study.createdAt)}
        </td>
        <td className="py-3 pr-2 text-right">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={`Descargar informe de ${patientName}`}
            title="Descargar informe (PDF)"
            onClick={(e) => {
              e.stopPropagation();
              onDownload(row);
            }}
            disabled={isDownloading}
          >
            <DownloadIcon className="h-4 w-4" />
          </button>
        </td>
      </tr>

      {isExpanded && (
        <tr className="border-t border-zinc-100 bg-zinc-50/40">
          <td colSpan={5} className="px-3 py-4">
            <ReportPdfViewer
              studyId={study.id}
              downloadFilename={`${patientName}.pdf`}
            />
          </td>
        </tr>
      )}
    </>
  );
}
