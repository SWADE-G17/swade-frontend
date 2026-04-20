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

  // Mock por ahora: el volumen real vendrá de:
  //   GET ${API_BASE_URL}/estudios/{id}/resultado/heatmap
  // y lo conectaremos cuando exista el id/endpoint en el flujo.
  const volumeUrl = "/orig_nu.mgz";

  return (
    <div className="min-h-screen px-6 py-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Heatmap Visualization
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Study ID: <span className="font-mono">{id}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 w-full">
          <NiivueVolumeViewer
            volumeUrl={volumeUrl}
            className="h-[min(78vh,840px)]"
          />
        </div>
      </div>
    </div>
  );
}

