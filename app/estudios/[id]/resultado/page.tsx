"use client";

import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { fetchStudyResult } from "@/lib/studyApi";
import { getAccessToken, useAuth } from "@/lib/auth";
import type { StudyResultResponse, ParsedPrediction } from "@/types/study";
import { parsePrediction } from "@/types/study";

const NiivueVolumeViewer = dynamic(
  () => import("@/components/niivue/NiivueVolumeViewer"),
  { ssr: false },
);

type ViewState =
  | { kind: "loading" }
  | { kind: "ok"; result: StudyResultResponse }
  | { kind: "in-progress" }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

function PageShell({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen px-6 py-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Visualización del mapa de calor
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              ID del estudio: <span className="font-mono">{id}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 w-full">{children}</div>
      </div>
    </div>
  );
}

function CenteredMessage({
  title,
  detail,
  action,
  tone = "neutral",
}: {
  title: string;
  detail?: string;
  action?: React.ReactNode;
  tone?: "neutral" | "warning" | "error";
}) {
  const toneClasses =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-zinc-200 bg-zinc-50 text-zinc-700";

  return (
    <div
      className={`flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-xl border px-6 py-12 text-center ${toneClasses}`}
      role="status"
    >
      <p className="text-sm font-semibold">{title}</p>
      {detail && <p className="max-w-md text-xs opacity-80">{detail}</p>}
      {action}
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
    >
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-[#5D5FEF]"
        aria-hidden
      />
      <span className="text-sm text-zinc-600">{label}</span>
    </div>
  );
}

function PredictionSummary({ raw }: { raw: string }) {
  const parsed: ParsedPrediction | null = parsePrediction(raw);
  if (!parsed) {
    return (
      <p className="text-sm text-zinc-700">
        <span className="font-medium">Predicción:</span> {raw}
      </p>
    );
  }
  const pct = (parsed.confidence * 100).toFixed(1);
  return (
    <p className="text-sm text-zinc-700">
      <span className="font-medium">Predicción:</span> {parsed.predictedName}{" "}
      <span className="text-zinc-500">({pct}% confianza)</span>
    </p>
  );
}

export default function StudyResultadoPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const { signOut } = useAuth();

  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const goToLogin = useCallback(() => {
    // signOut clears cached token and routes to /login.
    signOut().catch(() => {
      router.replace("/login");
    });
  }, [signOut, router]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setView({ kind: "loading" });

    (async () => {
      try {
        const outcome = await fetchStudyResult(id);
        if (cancelled) return;

        if (outcome.status === 401 || outcome.status === 403) {
          goToLogin();
          return;
        }
        if (outcome.status === 404) {
          setView({ kind: "not-found" });
          return;
        }
        if (outcome.status === 409) {
          setView({ kind: "in-progress" });
          return;
        }

        const token = await getAccessToken();
        if (cancelled) return;
        if (!token) {
          goToLogin();
          return;
        }
        setAuthToken(token);
        setView({ kind: "ok", result: outcome.data });
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo obtener el resultado del estudio.";
        setView({ kind: "error", message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, retryNonce, goToLogin]);

  const retry = useCallback(() => setRetryNonce((n) => n + 1), []);

  const retryButton = (
    <button
      type="button"
      onClick={retry}
      className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
    >
      Reintentar
    </button>
  );

  if (view.kind === "loading") {
    return (
      <PageShell id={id}>
        <Spinner label="Cargando resultado…" />
      </PageShell>
    );
  }

  if (view.kind === "not-found") {
    return (
      <PageShell id={id}>
        <CenteredMessage
          title="Resultado no disponible"
          detail="No encontramos el resultado del estudio. Es posible que no exista o que ya no esté disponible."
          action={retryButton}
        />
      </PageShell>
    );
  }

  if (view.kind === "in-progress") {
    return (
      <PageShell id={id}>
        <CenteredMessage
          tone="warning"
          title="El estudio aún se está procesando"
          detail="Vuelve a esta vista cuando el procesamiento haya finalizado."
          action={retryButton}
        />
      </PageShell>
    );
  }

  if (view.kind === "error") {
    return (
      <PageShell id={id}>
        <CenteredMessage
          tone="error"
          title="No se pudo cargar el resultado"
          detail={view.message}
          action={retryButton}
        />
      </PageShell>
    );
  }

  const { result } = view;
  const { heatmapUrl, origUrl, prediction } = result;

  if (!heatmapUrl || !origUrl) {
    return (
      <PageShell id={id}>
        <div className="flex flex-col gap-4">
          <PredictionSummary raw={prediction} />
          <CenteredMessage
            tone="warning"
            title="Volúmenes aún no disponibles"
            detail="El procesamiento finalizó, pero los volúmenes (T1 base y mapa de calor) todavía se están escribiendo. Reintenta en unos segundos."
            action={retryButton}
          />
        </div>
      </PageShell>
    );
  }

  const headers: Record<string, string> | undefined = authToken
    ? { Authorization: `Bearer ${authToken}` }
    : undefined;

  return (
    <PageShell id={id}>
      <div className="flex flex-col gap-4">
        <PredictionSummary raw={prediction} />

        <NiivueVolumeViewer
          baseVolumeUrl={origUrl}
          baseVolumeName={`${id}_orig.mgz`}
          overlayVolumeUrl={heatmapUrl}
          overlayVolumeName={`${id}_heatmap.nii.gz`}
          authHeaders={headers}
          className="h-[min(78vh,840px)]"
          onLoadError={(err) => {
            // Niivue swallows status codes inside its fetch wrapper, but the
            // most likely cause of a load failure here (the resultado fetch
            // already passed auth) is a mid-load token expiry. We surface the
            // error inside the viewer; if it's an auth issue the user can
            // retry, which will re-mount with a fresh token from cache, or
            // they'll be bounced to login on the next API call.
            // eslint-disable-next-line no-console
            console.error("Niivue volume load failed", err);
          }}
        />
      </div>
    </PageShell>
  );
}
