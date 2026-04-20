"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Niivue } from "@niivue/niivue";

type PrimarySlice = "axial" | "coronal" | "sagittal";

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

export default function NiivueVolumeViewer({
  volumeUrl,
  className = "",
}: {
  volumeUrl: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nvRef = useRef<Niivue | null>(null);
  const loadGenerationRef = useRef(0);

  const [primary, setPrimary] = useState<PrimarySlice>("axial");

  const updateLayout = useCallback((slice: PrimarySlice) => {
    setPrimary(slice);
    if (nvRef.current) {
      applyMprLayout(nvRef.current, slice);
    }
  }, []);

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

      await nv.loadVolumes([{ url: volumeUrl }]);

      if (cancelled || generation !== loadGenerationRef.current) return;

      applyMprLayout(nv, primary);
    }

    run().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [volumeUrl, primary]);

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
    <div className="flex flex-col gap-2">
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

      <div
        className={`w-full overflow-hidden rounded-xl bg-black ${className}`.trim()}
      >
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
