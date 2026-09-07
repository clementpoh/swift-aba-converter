"use client";

import { Building2, Check, Copy, MapPin } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RtnTable } from "@/components/rtn-table";
import type { Institution } from "@/lib/types";

export function InstitutionCard({ institution }: { institution: Institution }) {
  const [copied, setCopied] = useState<string>();
  const locations = new Set(institution.routings.map((routing) => `${routing.city}, ${routing.state}`));

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(value);
    window.setTimeout(() => setCopied(undefined), 1200);
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Building2 className="size-5" /></div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold tracking-tight text-slate-950">{institution.displayName}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="size-3.5" />{locations.size} location{locations.size === 1 ? "" : "s"} · {institution.routings.length} routing number{institution.routings.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Known SWIFT / BIC</p>
          {institution.bics.length ? (
            <div className="flex flex-wrap gap-2">
              {institution.bics.slice(0, 20).map((bic) => (
                <button key={bic} onClick={() => copy(bic)} aria-label={`Copy ${bic}`}>
                  <Badge tone="indigo" className="gap-1.5 font-mono">{bic}{copied === bic ? <Check className="size-3" /> : <Copy className="size-3 opacity-50" />}</Badge>
                </button>
              ))}
              {institution.bics.length > 20 && <Badge>+{institution.bics.length - 20} more</Badge>}
            </div>
          ) : <p className="text-sm text-slate-500">No BIC mapped in this offline dataset.</p>}
        </div>
      </div>
      <RtnTable routings={institution.routings} />
    </Card>
  );
}
