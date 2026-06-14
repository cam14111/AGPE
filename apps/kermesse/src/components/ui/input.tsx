import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...p}
      className={cn(
        "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500",
        p.className,
      )}
    />
  );
}
