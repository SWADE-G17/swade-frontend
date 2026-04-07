import type { StudyStatus } from "@/types/study";

function getLabel(status: StudyStatus) {
  switch (status) {
    case "QUEUED":
      return "Processing";
    case "PROCESSING":
      return "Processing";
    case "COMPLETED":
      return "Completed";
    case "FAILED":
      return "Error";
    default:
      return status;
  }
}

function getStyles(status: StudyStatus) {
  switch (status) {
    case "QUEUED":
    case "PROCESSING":
      return "border-[#F59E0B]/60 bg-[#F59E0B]/10 text-[#B45309]";
    case "COMPLETED":
      return "border-[#10B981]/60 bg-[#10B981]/10 text-[#047857]";
    case "FAILED":
      return "border-[#F43F5E]/60 bg-[#F43F5E]/10 text-[#BE123C]";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-600";
  }
}

export default function StudyStatusBadge({ status }: { status: StudyStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${getStyles(
        status,
      )}`}
    >
      {getLabel(status)}
    </span>
  );
}

