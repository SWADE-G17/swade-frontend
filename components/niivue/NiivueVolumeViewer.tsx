"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Niivue } from "@niivue/niivue";

type PrimarySlice = "axial" | "coronal" | "sagittal";

type HeatmapColormap = "warm" | "hot" | "jet" | "redyell";

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

const COLORMAP_OPTIONS: { value: HeatmapColormap; label: string }[] = [
  { value: "warm", label: "Warm" },
  { value: "hot", label: "Hot" },
  { value: "jet", label: "Jet" },
  { value: "redyell", label: "Red-Yellow" },
];

export type NiivueVolumeViewerProps = {
  // Base anatomical volume (e.g. orig.mgz). Painted as the bottom layer.
  baseVolumeUrl: string;
  // Optional overlay volume (e.g. heatmap.nii.gz, normalized to [0, 1]).
  // Niivue aligns by affine, so as long as both volumes share the same affine
  // (already the case since save_gradcam_volume copies orig's affine) no
  // resampling is needed on the frontend.
  overlayVolumeUrl?: string;
  // Initial overlay rendering options. All are tweakable from the UI.
  initialColormap?: HeatmapColormap;
  initialOpacity?: number; // 0..1, 0.4-0.7 gives good contrast without hiding T1
  initialThreshold?: number; // cal_min, 0..1; values below are hidden
  className?: string;
};

export default function NiivueVolumeViewer({
  baseVolumeUrl,
  overlayVolumeUrl,
  initialColormap = "warm",
  initialOpacity = 0.6,
  initialThreshold = 0.2,
  className = "",
}: NiivueVolumeViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nvRef = useRef<Niivue | null>(null);
  const loadGenerationRef = useRef(0);

  const [primary, setPrimary] = useState<PrimarySlice>("axial");
  const [colormap, setColormap] = useState<HeatmapColormap>(initialColormap);
  const [opacity, setOpacity] = useState<number>(initialOpacity);
  const [threshold, setThreshold] = useState<number>(initialThreshold);

  const updateLayout = useCallback((slice: PrimarySlice) => {
    setPrimary(slice);
    if (nvRef.current) {
      applyMprLayout(nvRef.current, slice);
    }
  }, []);

  // Load volumes when URLs change. Re-running this effect rebuilds the volume
  // list; the secondary parameter effects below only mutate the overlay.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    const generation = ++loadGenerationRef.current;

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

      const volumeList: { url: string; colormap?: string; opacity?: number; cal_min?: number; cal_max?: number }[] = [
        { url: baseVolumeUrl },
      ];

      if (overlayVolumeUrl) {
        volumeList.push({
          url: overlayVolumeUrl,
          colormap,
          opacity,
          cal_min: threshold,
          cal_max: 1.0,
        });
      }

      await nv.loadVolumes(volumeList);

      if (cancelled || generation !== loadGenerationRef.current) return;

      applyMprLayout(nv, primary);
    }

    run().catch(() => {});

    return () => {
      cancelled = true;
    };
    // We intentionally do NOT depend on colormap/opacity/threshold here:
    // those are applied incrementally below to avoid re-downloading volumes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseVolumeUrl, overlayVolumeUrl]);

  // React to overlay parameter changes without reloading the volume.
  useEffect(() => {
    const nv = nvRef.current;
    if (!nv || !overlayVolumeUrl) return;
    const overlay = nv.volumes?.[1];
    if (!overlay) return;
    nv.setColormap(overlay.id, colormap);
  }, [colormap, overlayVolumeUrl]);

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
    overlay.cal_min = threshold;
    overlay.cal_max = 1.0;
    nv.updateGLVolume();
  }, [threshold, overlayVolumeUrl]);

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

            <label className="flex items-center gap-2 text-xs text-zinc-600">
              <span className="font-medium">Colormap</span>
              <select
                value={colormap}
                onChange={(e) => setColormap(e.target.value as HeatmapColormap)}
                className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 focus:border-[#5D5FEF] focus:outline-none"
              >
                {COLORMAP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-xs text-zinc-600">
              <span className="font-medium">Opacity</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="accent-[#5D5FEF]"
              />
              <span className="w-8 tabular-nums text-zinc-500">
                {opacity.toFixed(2)}
              </span>
            </label>

            <label className="flex items-center gap-2 text-xs text-zinc-600">
              <span className="font-medium">Threshold</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="accent-[#5D5FEF]"
              />
              <span className="w-8 tabular-nums text-zinc-500">
                {threshold.toFixed(2)}
              </span>
            </label>
          </>
        )}
      </div>

      <div
        className={`w-full overflow-hidden rounded-xl bg-black ${className}`.trim()}
      >
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
