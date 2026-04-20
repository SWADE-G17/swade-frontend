"use client";

import type { ParsedPrediction, StudySummaryResponse } from "@/types/study";
import StudyStatusBadge from "@/components/common/StudyStatusBadge";
import { formatDateUtc, stripFilenameExtensions } from "@/lib/format";

function DotsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

export default function StudiesTable({
  studies,
  predictionById,
  onOpenDetails,
}: {
  studies: StudySummaryResponse[];
  predictionById: Record<string, ParsedPrediction | null | undefined>;
  onOpenDetails: (id: string) => void;
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold text-zinc-500">
            <th className="pb-3 pr-4">Paciente N.º</th>
            <th className="pb-3 pr-4">ID paciente</th>
            <th className="pb-3 pr-4">Predicción</th>
            <th className="pb-3 pr-4">Expira</th>
            <th className="pb-3 pr-4">Precisión</th>
            <th className="pb-3 pr-4">Creado</th>
            <th className="pb-3 pr-4">Estado</th>
            <th className="pb-3 pr-2 text-right"> </th>
          </tr>
        </thead>
        <tbody>
          {studies.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="py-10 text-center text-sm text-zinc-500"
              >
                No hay estudios aún. Usa «+ Nueva predicción».
              </td>
            </tr>
          ) : (
            studies.map((s) => {
              const parsed = predictionById[s.id];
              const predictionLabel =
                s.status === "FAILED"
                  ? "Error"
                  : s.status === "COMPLETED"
                    ? parsed?.predictedName ?? "Pendiente"
                    : "Pendiente";
              const confidenceLabel =
                s.status === "COMPLETED" && parsed
                  ? `${(parsed.confidence * 100).toFixed(2)}%`
                  : "--";

              return (
                <tr
                  key={s.id}
                  className="border-t border-zinc-100 hover:bg-zinc-50/60"
                >
                  <td className="py-3 pr-4 font-mono text-xs text-zinc-800">
                    {s.id}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="block max-w-[260px] truncate font-medium text-zinc-800">
                      {stripFilenameExtensions(s.originalFilename)}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-zinc-800">{predictionLabel}</td>
                  <td className="py-3 pr-4 text-zinc-500">--</td>
                  <td className="py-3 pr-4 text-zinc-500">{confidenceLabel}</td>
                  <td className="py-3 pr-4 text-zinc-500">
                    {formatDateUtc(s.createdAt)}
                  </td>
                  <td className="py-3 pr-4">
                    <StudyStatusBadge status={s.status} />
                  </td>
                  <td className="py-3 pr-2 text-right">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                      aria-label="Acciones del estudio"
                      onClick={() => onOpenDetails(s.id)}
                    >
                      <DotsIcon className="h-4 w-4" />
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

