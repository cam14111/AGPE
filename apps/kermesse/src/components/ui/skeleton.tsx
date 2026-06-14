import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
export function Skeleton(p: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...p}
      className={cn("animate-pulse rounded-md bg-slate-200", p.className)}
    />
  );
}
