"use client";

import { useEffect, useRef } from "react";
import { Niivue } from "@niivue/niivue";

/**
 * MPR layout: axial grande a la izquierda; coronal (arriba) y sagital (abajo) a la derecha.
 * Posiciones normalizadas [left, top, width, height] en 0–1 (API Niivue `setCustomLayout`).
 */
const MPR_LAYOUT_LEFT_FRACTION = 0.62;

function applyMprLayout(nv: Niivue) {
  const left = MPR_LAYOUT_LEFT_FRACTION;
  const right = 1 - left;

  nv.setSliceType(nv.sliceTypeMultiplanar);
  nv.setMultiplanarPadPixels(3);
  nv.setCustomLayout([
    {
      sliceType: nv.sliceTypeAxial,
      position: [0, 0, left, 1],
    },
    {
      sliceType: nv.sliceTypeCoronal,
      position: [left, 0, right, 0.5],
    },
    {
      sliceType: nv.sliceTypeSagittal,
      position: [left, 0.5, right, 0.5],
    },
  ]);
}

export default function NiivueVolumeViewer({
  volumeUrl,
  className = "",
}: {
  volumeUrl: string;
  /** Contenedor del visor (altura/ancho recomendados con Tailwind, ej. `h-[min(78vh,840px)] w-full`) */
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nvRef = useRef<Niivue | null>(null);
  /** Evita que una carga async antigua pise una más nueva al cambiar `volumeUrl`. */
  const loadGenerationRef = useRef(0);

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

      applyMprLayout(nv);
    }

    run().catch(() => {
      // Errores de carga: se puede mostrar UI más adelante
    });

    return () => {
      cancelled = true;
    };
  }, [volumeUrl]);

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
    <div
      className={`w-full overflow-hidden rounded-xl bg-black ${className}`.trim()}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
