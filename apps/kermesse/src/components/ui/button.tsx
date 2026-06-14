import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
type Variant = "default" | "outline" | "destructive" | "ghost";
export function Button({
  className,
  variant = "default",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none",
        variant === "default" && "bg-indigo-600 text-white hover:bg-indigo-700",
        variant === "outline" &&
          "border border-slate-300 bg-white hover:bg-slate-50",
        variant === "destructive" && "bg-red-600 text-white hover:bg-red-700",
        variant === "ghost" && "hover:bg-slate-100",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
