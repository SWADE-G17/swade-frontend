"use client";

import { useMemo, useState } from "react";
import { createStudy } from "@/lib/studyApi";
import type { StudyCreateResponse } from "@/types/study";

export default function UploadNewPredictionModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: (created: StudyCreateResponse) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => !!file && !creating, [file, creating]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Selecciona un archivo .nii o .nii.gz.");
      return;
    }

    const name = file.name.toLowerCase();
    if (!name.endsWith(".nii") && !name.endsWith(".nii.gz")) {
      setError("El archivo debe ser .nii o .nii.gz.");
      return;
    }

    try {
      setCreating(true);
      setError(null);
      const created = await createStudy(file);
      onCreated?.(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg"
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">
              Nueva predicción
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Sube un archivo NIfTI (.nii o .nii.gz)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-2 text-sm text-zinc-700">
            <span className="font-medium">Archivo</span>
            <input
              type="file"
              accept=".nii,.nii.gz"
              onChange={(e) => {
                const selected = e.target.files?.[0] ?? null;
                setFile(selected);
                setError(null);
              }}
              className="block w-full cursor-pointer rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-sm
              file:rounded-md file:border-0 file:bg-[#5D5FEF] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:border-zinc-400"
            />
          </label>

          {error && (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center justify-center rounded-xl bg-[#5D5FEF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4f51d9] disabled:cursor-not-allowed disabled:bg-[#5D5FEF]/60"
          >
            {creating ? "Creando…" : "Subir y poner en cola"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Cancelar
          </button>
        </form>
      </div>
    </div>
  );
}

