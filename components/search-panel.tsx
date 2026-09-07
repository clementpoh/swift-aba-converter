"use client";

import { AlertCircle, ArrowRight, Database, LoaderCircle, Search } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InstitutionCard } from "@/components/institution-card";
import { ModeTabs } from "@/components/mode-tabs";
import type { LookupMode, LookupResponse } from "@/lib/types";

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [mode, setMode] = useState<LookupMode>("auto");
  const [response, setResponse] = useState<LookupResponse>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    setLoading(true);
    setError("");
    setSearched(value);
    try {
      const result = await fetch(`/api/lookup?q=${encodeURIComponent(value)}&mode=${mode}`);
      const body = await result.json();
      if (!result.ok) throw new Error(body.error || "Lookup failed.");
      setResponse(body);
    } catch (reason) {
      setResponse(undefined);
      setError(reason instanceof Error ? reason.message : "Lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Card className="relative z-10 mx-auto max-w-3xl shadow-xl shadow-slate-900/5">
        <CardContent>
          <div className="mb-4 flex items-center justify-between gap-3">
            <ModeTabs value={mode} onChange={setMode} />
            <span className="hidden items-center gap-1.5 text-xs font-medium text-slate-400 sm:flex"><Database className="size-3.5" />Offline data</span>
          </div>
          <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-3.5 size-5 text-slate-400" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="CHASUS33, 021000021, or Chase…" className="pl-12" maxLength={100} autoFocus aria-label="BIC, routing number, or bank name" />
            </div>
            <Button type="submit" disabled={!query.trim() || loading} className="h-12 px-6">
              {loading ? <LoaderCircle className="size-4 animate-spin" /> : <>Convert <ArrowRight className="size-4" /></>}
            </Button>
          </form>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">Paste an 8–11 character SWIFT/BIC, a 9-digit ABA routing number, or search by institution name.</p>
        </CardContent>
      </Card>

      <div className="mx-auto mt-8 max-w-4xl space-y-4" aria-live="polite">
        {loading && [1, 2].map((item) => <div key={item} className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white/70" />)}
        {!loading && error && <Notice text={error} />}
        {!loading && response?.results.length === 0 && <Notice text={`No US bank matched “${searched}”.${response.detectedMode === "bic" ? " The offline BIC directory may not include this code." : ""}`} />}
        {!loading && response && response.results.length > 0 && (
          <>
            <p className="px-1 text-sm text-slate-500">Found {response.total} match{response.total === 1 ? "" : "es"} · detected as <span className="font-semibold uppercase text-slate-700">{response.detectedMode}</span></p>
            {response.results.map((institution) => <InstitutionCard key={institution.slug} institution={institution} />)}
          </>
        )}
      </div>
    </div>
  );
}

function Notice({ text }: { text: string }) {
  return <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><AlertCircle className="mt-0.5 size-5 shrink-0" /><p>{text}</p></div>;
}
