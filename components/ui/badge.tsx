import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  slate: "bg-slate-100 text-slate-700",
  indigo: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
};

export function Badge({
  className,
  tone = "slate",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold", tones[tone], className)}
      {...props}
    />
  );
}
