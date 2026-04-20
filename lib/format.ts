/** Display name without extension segments, e.g. `022_S_4444.nii.gz` → `022_S_4444`. */
export function stripFilenameExtensions(filename: string): string {
  const base = filename.replace(/\\/g, "/").split("/").pop() ?? filename;
  let result = base;
  for (let i = 0; i < 32; i++) {
    const stripped = result.replace(/\.[^.]+$/, "");
    if (stripped === result || stripped === "") break;
    result = stripped;
  }
  return result;
}

export function formatDateUtc(iso: string) {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = d.toLocaleString("en-GB", {
    month: "short",
    timeZone: "UTC",
  });
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

