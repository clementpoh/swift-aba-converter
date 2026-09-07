"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { RoutingEntry, Service } from "@/lib/types";

const labels: Record<Service, string> = {
  ACH: "ACH",
  WIRE: "Wire",
  SETTLEMENT_ONLY: "Settlement only",
  BOOK_ENTRY: "Book-entry",
};

export function RtnTable({ routings }: { routings: RoutingEntry[] }) {
  const [copied, setCopied] = useState<string>();
  async function copy(rtn: string) {
    await navigator.clipboard.writeText(rtn);
    setCopied(rtn);
    window.setTimeout(() => setCopied(undefined), 1200);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[580px] text-left text-sm">
        <thead className="border-y border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
          <tr><th className="px-5 py-3">Routing number</th><th className="px-3 py-3">Location</th><th className="px-3 py-3">Services</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {routings.map((routing) => (
            <tr key={routing.rtn} className="align-top hover:bg-slate-50/60">
              <td className="px-5 py-4">
                <button onClick={() => copy(routing.rtn)} className="group inline-flex items-center gap-2 font-mono font-semibold text-slate-900" aria-label={`Copy ${routing.rtn}`}>
                  {routing.rtn}
                  {copied === routing.rtn ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5 text-slate-300 group-hover:text-indigo-500" />}
                </button>
                {routing.supersededBy && <p className="mt-1 text-xs text-amber-700">Superseded by {routing.supersededBy}</p>}
              </td>
              <td className="px-3 py-4 text-slate-600">{routing.city}{routing.state ? `, ${routing.state}` : ""}</td>
              <td className="px-3 py-4">
                <div className="flex flex-wrap gap-1.5">
                  {routing.services.map((service) => <Badge key={service} tone={service === "ACH" ? "emerald" : service === "WIRE" ? "indigo" : "amber"}>{labels[service]}</Badge>)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
