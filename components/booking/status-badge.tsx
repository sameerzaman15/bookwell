import { STATUS_LABEL } from "@/lib/format";
import { cn } from "cn";

const tones: Record<string, string> = {
  confirmed: "bg-[#e7efea] text-[#2d5648] dark:bg-[#24382f] dark:text-[#8fbfa9]",
  pending: "bg-[#f8efd6] text-[#7a5a12] dark:bg-[#3a3018] dark:text-[#e0b85a]",
  completed: "bg-[#eef1f4] text-[#475569] dark:bg-[#243038] dark:text-[#94a3b8]",
  cancelled: "bg-[#f8e6e9] text-[#9a3140] dark:bg-[#3a2228] dark:text-[#e07a86]",
  no_show: "bg-[#eeeae4] text-[#5c564e] dark:bg-[#2a2824] dark:text-[#c8c0b4]",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tones[status] ?? tones.completed,
        className,
      )}
    >
      {status === "pending" ? "Awaiting confirmation" : (STATUS_LABEL[status] ?? status)}
    </span>
  );
}
