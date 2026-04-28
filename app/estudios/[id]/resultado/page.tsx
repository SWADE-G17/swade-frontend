"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const NiivueVolumeViewer = dynamic(
  () => import("@/components/niivue/NiivueVolumeViewer"),
  { ssr: false },
);

export default function StudyResultadoPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "mock-id";

  // Mock por ahora: los volúmenes reales vendrán del backend.
  // - Base anatómica: orig.mgz (T1)
  // - Overlay heatmap (Grad-CAM normalizado a [0,1]) que comparte el affine
  //   de orig (save_gradcam_volume copia reference_img=orig_image), por lo que
  //   Niivue alinea ambos volúmenes sin resampleo extra.
  const baseVolumeUrl = "/24_orig.mgz";
  const overlayVolumeUrl = "/24_heatmap.nii.gz";

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

        <div className="mt-4 w-full">
          <NiivueVolumeViewer
            baseVolumeUrl={baseVolumeUrl}
            overlayVolumeUrl={overlayVolumeUrl}
            className="h-[min(78vh,840px)]"
          />
        </div>
      </div>
    </div>
  );
}

