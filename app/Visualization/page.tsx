import NiivueVolumeViewer from "@/components/niivue/NiivueVolumeViewer";

export default function VisualizationPage() {
  return (
    <div className="min-h-screen px-6 py-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Visualización
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
          Demostración con volumen de prueba desde la carpeta pública.
        </p>

        <div className="mt-4 w-full">
          <NiivueVolumeViewer
            volumeUrl="/orig_nu.mgz"
            className="h-[min(78vh,840px)]"
          />
        </div>
      </div>
    </div>
  );
}