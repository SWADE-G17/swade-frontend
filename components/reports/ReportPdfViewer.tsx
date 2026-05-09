"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchReporteBlob } from "@/lib/studyApi";
import { triggerDownloadFromUrl } from "@/lib/download";
import { useAuth } from "@/lib/auth";

// State persisted across re-renders for a single (studyId, retryNonce) attempt.
// `key` lets us render the loading spinner whenever the current request key
// doesn't match the last completed one, without needing a synchronous
// setState({ kind: "loading" }) inside the load effect.
type LoadedState =
  | { kind: "ready"; blobUrl: string; filename: string }
  | { kind: "unavailable" }
  | { kind: "error"; message: string };

type StoredState = LoadedState & { key: string };

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

export type ReportPdfViewerProps = {
  studyId: string;
  // Filename used for the explicit "Descargar PDF" button. The Content-Dispo
  // filename returned by the backend is also kept around as a fallback should
  // this be omitted.
  downloadFilename?: string;
  className?: string;
};

// Renders the per-estudio PDF report inline using the browser's native PDF
// viewer (an <iframe> over a blob: URL). The same fetched Blob backs both the
// inline view and the explicit "Descargar PDF" button — no double-fetching.
//
// Mirrors the pattern used by NiivueVolumeViewer / the heatmap consumer:
// loading spinner, friendly empty state for 404 ("no PDF yet" is a legitimate
// state, not an error), retryable error state for 502 / network.
export default function ReportPdfViewer({
  studyId,
  downloadFilename,
  className = "",
}: ReportPdfViewerProps) {
  const { signOut } = useAuth();
  const router = useRouter();

  const [retryNonce, setRetryNonce] = useState(0);
  const [stored, setStored] = useState<StoredState | null>(null);
  // Mirrors the latest committed blob URL so the effect cleanup / unmount can
  // revoke without reading state. Always the same URL as `stored.blobUrl`
  // when one exists.
  const blobUrlRef = useRef<string | null>(null);

  const requestKey = `${studyId}::${retryNonce}`;

  const goToLogin = useCallback(() => {
    signOut().catch(() => router.replace("/login"));
  }, [signOut, router]);

  useEffect(() => {
    if (!studyId) return;
    let cancelled = false;

    (async () => {
      try {
        const outcome = await fetchReporteBlob(studyId);
        if (cancelled) return;

        if (outcome.status === 401 || outcome.status === 403) {
          goToLogin();
          return;
        }
        if (outcome.status === 404) {
          setStored({ kind: "unavailable", key: requestKey });
          return;
        }
        if (outcome.status === 502) {
          setStored({
            kind: "error",
            message:
              "El servicio de almacenamiento no respondió. Reintenta en unos segundos.",
            key: requestKey,
          });
          return;
        }

        const url = URL.createObjectURL(outcome.blob);
        blobUrlRef.current = url;
        setStored({
          kind: "ready",
          blobUrl: url,
          filename: downloadFilename ?? outcome.filename,
          key: requestKey,
        });
      } catch (err) {
        if (cancelled) return;
        setStored({
          kind: "error",
          message:
            err instanceof Error
              ? err.message
              : "No se pudo obtener el reporte.",
          key: requestKey,
        });
      }
    })();

    return () => {
      cancelled = true;
      // Re-fetch / unmount: drop any blob URL bound to the stale request.
      // The next render shows the loading spinner via key mismatch, so the
      // iframe is no longer mounted with the now-revoked URL.
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [studyId, requestKey, goToLogin, downloadFilename]);

  const retry = useCallback(() => setRetryNonce((n) => n + 1), []);

  const isLoading = !stored || stored.key !== requestKey;

  if (isLoading) {
    return (
      <div
        className={`flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 ${className}`.trim()}
        role="status"
        aria-live="polite"
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-[#5D5FEF]"
          aria-hidden
        />
        <span className="text-sm text-zinc-600">Cargando reporte…</span>
      </div>
    );
  }

  if (stored.kind === "unavailable") {
    return (
      <div
        className={`flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-10 text-center ${className}`.trim()}
        role="status"
      >
        <p className="text-sm font-semibold text-zinc-700">
          Reporte no disponible todavía
        </p>
        <p className="max-w-md text-xs text-zinc-500">
          El servidor aún no ha generado el PDF para este estudio. Reintenta en
          unos segundos.
        </p>
        <button
          type="button"
          onClick={retry}
          className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (stored.kind === "error") {
    return (
      <div
        className={`flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-6 py-10 text-center ${className}`.trim()}
        role="alert"
      >
        <p className="text-sm font-semibold text-rose-800">
          No se pudo cargar el reporte
        </p>
        <p className="max-w-md text-xs text-rose-700/80">{stored.message}</p>
        <button
          type="button"
          onClick={retry}
          className="mt-1 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`.trim()}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">
          Vista previa del reporte (PDF) — generada por el servidor.
        </p>
        <button
          type="button"
          onClick={() =>
            triggerDownloadFromUrl(stored.blobUrl, stored.filename)
          }
          className="inline-flex items-center gap-2 rounded-xl bg-[#5D5FEF] px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-[#4f51d9]"
        >
          <DownloadIcon className="h-4 w-4" />
          Descargar PDF
        </button>
      </div>

      <iframe
        src={stored.blobUrl}
        title={`Reporte del estudio ${studyId}`}
        className="h-[min(72vh,820px)] w-full rounded-xl border border-zinc-200 bg-white"
      />
    </div>
  );
}
