"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Niivue } from "@niivue/niivue";

type PrimarySlice = "axial" | "coronal" | "sagittal";

// Heatmap is fixed to "jet" (azul → rojo). The toggle below either uses the
// caller's threshold (heatmap visible) or pushes cal_min to 1.0 to hide it.
const HEATMAP_COLORMAP = "jet";
const HEATMAP_OFF_THRESHOLD = 1;

const MPR_LAYOUT_LEFT_FRACTION = 0.62;

function applyMprLayout(nv: Niivue, primary: PrimarySlice) {
  const left = MPR_LAYOUT_LEFT_FRACTION;
  const right = 1 - left;

  const sliceMap = {
    axial: nv.sliceTypeAxial,
    coronal: nv.sliceTypeCoronal,
    sagittal: nv.sliceTypeSagittal,
  };

  const others = (["axial", "coronal", "sagittal"] as PrimarySlice[]).filter(
    (s) => s !== primary,
  );

  nv.setSliceType(nv.sliceTypeMultiplanar);
  nv.setMultiplanarPadPixels(3);
  nv.setCustomLayout([
    {
      sliceType: sliceMap[primary],
      position: [0, 0, left, 1],
    },
    {
      sliceType: sliceMap[others[0]],
      position: [left, 0, right, 0.5],
    },
    {
      sliceType: sliceMap[others[1]],
      position: [left, 0.5, right, 0.5],
    },
  ]);
}

const SLICE_OPTIONS: { value: PrimarySlice; label: string }[] = [
  { value: "axial", label: "Axial" },
  { value: "coronal", label: "Coronal" },
  { value: "sagittal", label: "Sagital" },
];

export type NiivueVolumeViewerProps = {
  // Base anatomical volume (e.g. orig.mgz). Painted as the bottom layer.
  baseVolumeUrl: string;
  // Filename hint for the base. Niivue normally infers format from the URL
  // extension; our backend proxy URLs (e.g. /estudios/42/orig) have none, so
  // this name is what tells Niivue to parse it as .mgz / .nii.gz.
  baseVolumeName?: string;
  // Optional overlay volume (e.g. heatmap.nii.gz, normalized to [0, 1]).
  // Niivue aligns by affine, so as long as both volumes share the same affine
  // (already the case since save_gradcam_volume copies orig's affine) no
  // resampling is needed on the frontend.
  overlayVolumeUrl?: string;
  overlayVolumeName?: string;
  // Headers attached to every volume fetch — typically { Authorization: ... }.
  // Niivue passes these through to the underlying fetch call.
  authHeaders?: Record<string, string>;
  // Initial overlay rendering options.
  initialOpacity?: number; // 0..1, 0.4-0.7 gives good contrast without hiding T1
  initialThreshold?: number; // cal_min, 0..1; values below are hidden when heatmap is active
  className?: string;
  // Called when a volume load fails so the parent can show a retry UI or
  // surface the error. The viewer also displays its own inline retry button.
  onLoadError?: (err: unknown) => void;
};

export default function NiivueVolumeViewer({
  baseVolumeUrl,
  baseVolumeName,
  overlayVolumeUrl,
  overlayVolumeName,
  authHeaders,
  initialOpacity = 0.6,
  initialThreshold = 0.2,
  className = "",
  onLoadError,
}: NiivueVolumeViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nvRef = useRef<Niivue | null>(null);
  const loadGenerationRef = useRef(0);

  const [primary, setPrimary] = useState<PrimarySlice>("axial");
  const [opacity, setOpacity] = useState<number>(initialOpacity);
  const [heatmapActive, setHeatmapActive] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const effectiveThreshold = heatmapActive
    ? initialThreshold
    : HEATMAP_OFF_THRESHOLD;

  const updateLayout = useCallback((slice: PrimarySlice) => {
    setPrimary(slice);
    if (nvRef.current) {
      applyMprLayout(nvRef.current, slice);
    }
  }, []);

  // Stable string key so changes to header values invalidate the load effect
  // without re-running on every re-render of the parent.
  const authHeadersKey = authHeaders
    ? Object.entries(authHeaders)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join("|")
    : "";

  // Load volumes when URLs change. Re-running this effect rebuilds the volume
  // list; the secondary parameter effects below only mutate the overlay.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    const generation = ++loadGenerationRef.current;
    setLoading(true);
    setLoadError(null);

    async function run() {
      let nv = nvRef.current;
      if (!nv) {
        nv = new Niivue();
        nvRef.current = nv;
        if (canvas) {
          await nv.attachToCanvas(canvas);
        } else {
          return;
        }
      }

      if (cancelled || generation !== loadGenerationRef.current) return;

      const headers = authHeaders;

      type VolumeOpts = {
        url: string;
        name?: string;
        headers?: Record<string, string>;
        colormap?: string;
        opacity?: number;
        cal_min?: number;
        cal_max?: number;
      };

      const volumeList: VolumeOpts[] = [
        {
          url: baseVolumeUrl,
          name: baseVolumeName,
          headers,
        },
      ];

      if (overlayVolumeUrl) {
        volumeList.push({
          url: overlayVolumeUrl,
          name: overlayVolumeName,
          headers,
          colormap: HEATMAP_COLORMAP,
          opacity,
          cal_min: effectiveThreshold,
          cal_max: 1.0,
        });
      }

      await nv.loadVolumes(volumeList);

      if (cancelled || generation !== loadGenerationRef.current) return;

      applyMprLayout(nv, primary);
    }

    run()
      .then(() => {
        if (cancelled || generation !== loadGenerationRef.current) return;
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled || generation !== loadGenerationRef.current) return;
        setLoading(false);
        setLoadError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar el volumen.",
        );
        onLoadError?.(err);
      });

    return () => {
      cancelled = true;
    };
    // We intentionally do NOT depend on colormap/opacity/threshold here:
    // those are applied incrementally below to avoid re-downloading volumes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    baseVolumeUrl,
    baseVolumeName,
    overlayVolumeUrl,
    overlayVolumeName,
    authHeadersKey,
    retryNonce,
  ]);

  // React to overlay parameter changes without reloading the volume.
  useEffect(() => {
    const nv = nvRef.current;
    if (!nv || !overlayVolumeUrl) return;
    if (!nv.volumes?.[1]) return;
    nv.setOpacity(1, opacity);
  }, [opacity, overlayVolumeUrl]);

  useEffect(() => {
    const nv = nvRef.current;
    if (!nv || !overlayVolumeUrl) return;
    const overlay = nv.volumes?.[1];
    if (!overlay) return;
    overlay.cal_min = effectiveThreshold;
    overlay.cal_max = 1.0;
    nv.updateGLVolume();
  }, [effectiveThreshold, overlayVolumeUrl]);

  // Release WebGL context and any pending fetches on unmount so navigating
  // away from the study doesn't leak a context or keep the volume request
  // in flight.
  useEffect(() => {
    return () => {
      try {
        nvRef.current?.cleanup();
      } catch {
        // ignore
      } finally {
        nvRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {SLICE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateLayout(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                primary === opt.value
                  ? "bg-[#5D5FEF] text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {overlayVolumeUrl && (
          <>
            <div className="h-6 w-px bg-zinc-200" />

            <button
              type="button"
              onClick={() => setHeatmapActive((v) => !v)}
              aria-pressed={heatmapActive}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                heatmapActive
                  ? "bg-[#5D5FEF] text-white shadow-sm hover:bg-[#4f51d9]"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {heatmapActive ? "Desactivar heatmap" : "Activar heatmap"}
            </button>

            <label
              className={`flex items-center gap-2 text-xs text-zinc-600 ${
                heatmapActive ? "" : "opacity-50"
              }`}
            >
              <span className="font-medium">Opacity</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                disabled={!heatmapActive}
                className="accent-[#5D5FEF] disabled:cursor-not-allowed"
              />
              <span className="w-8 tabular-nums text-zinc-500">
                {opacity.toFixed(2)}
              </span>
            </label>
          </>
        )}
      </div>

      <div
        className={`relative w-full overflow-hidden rounded-xl bg-black ${className}`.trim()}
      >
        <canvas ref={canvasRef} />

        {loading && !loadError && (
          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white"
            role="status"
            aria-live="polite"
          >
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white"
              aria-hidden
            />
            <span className="text-sm font-medium">Cargando volumen…</span>
            <span className="text-xs text-white/70">
              Las imágenes pueden pesar varias decenas de MB.
            </span>
          </div>
        )}

        {loadError && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 px-4 text-center text-white"
            role="alert"
          >
            <span className="text-sm font-medium">
              No se pudo cargar el volumen
            </span>
            <span className="max-w-md text-xs text-white/70">{loadError}</span>
            <button
              type="button"
              onClick={() => setRetryNonce((n) => n + 1)}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 transition hover:bg-zinc-100"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
