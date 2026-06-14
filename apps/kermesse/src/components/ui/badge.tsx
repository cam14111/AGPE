import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
export function Badge(
  p: HTMLAttributes<HTMLSpanElement> & { variant?: "destructive" },
) {
  return (
    <span
      {...p}
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
        p.variant === "destructive"
          ? "border-red-200 bg-red-100 text-red-700"
          : "border-slate-200 bg-slate-100 text-slate-700",
        p.className,
      )}
    />
  );
}
