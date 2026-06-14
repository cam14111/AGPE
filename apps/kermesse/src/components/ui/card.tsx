import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
export function Card(p: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...p}
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-sm",
        p.className,
      )}
    />
  );
}
export function CardHeader(p: HTMLAttributes<HTMLDivElement>) {
  return <div {...p} className={cn("p-4 pb-2", p.className)} />;
}
export function CardContent(p: HTMLAttributes<HTMLDivElement>) {
  return <div {...p} className={cn("p-4 pt-2", p.className)} />;
}
export function CardFooter(p: HTMLAttributes<HTMLDivElement>) {
  return <div {...p} className={cn("p-4 pt-0", p.className)} />;
}
export function CardTitle(p: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 {...p} className={cn("font-semibold text-slate-900", p.className)} />
  );
}
