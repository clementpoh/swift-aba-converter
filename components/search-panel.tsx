"use client";

import { AlertCircle, Database, LoaderCircle, Search } from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InstitutionCard } from "@/components/institution-card";
import { ModeTabs } from "@/components/mode-tabs";
import { isRoutingDataReady, loadRoutingData } from "@/lib/data";
import { isValidRtn } from "@/lib/detect";
import { lookup } from "@/lib/search";
import type { LookupMode, LookupResponse } from "@/lib/types";

const DEBOUNCE_MS = 280;

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [mode, setMode] = useState<LookupMode>("auto");
  const [response, setResponse] = useState<LookupResponse>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    void loadRoutingData().catch(() => {
      // Lookup surfaces load failures when a query is entered.
    });
  }, []);

  const runLookup = useCallback(async (raw: string, requestedMode: LookupMode, submitted = false) => {
    const value = raw.trim();
    const id = ++requestId.current;

    if (!value) {
      setSearched("");
      setResponse(undefined);
      setError("");
      setLoading(false);
      return;
    }

    if (value.length > 100) {
      setSearched(value);
      setResponse(undefined);
      setError("Searches are limited to 100 characters.");
      setLoading(false);
      return;
    }

    if (!submitted && shouldWaitForMoreInput(value, requestedMode)) {
      setSearched("");
      setResponse(undefined);
      setError("");
      setLoading(false);
      return;
    }

    if (requestedMode === "rtn" && !isValidRtn(value)) {
      setSearched(value);
      setResponse(undefined);
      setError("That is not a valid 9-digit ABA routing number.");
      setLoading(false);
      return;
    }

    if (!isRoutingDataReady()) setLoading(true);
    setError("");
    setSearched(value);

    try {
      const body = await lookup(value, requestedMode);
      if (id !== requestId.current) return;
      setResponse(body);
    } catch (reason) {
      if (id !== requestId.current) return;
      setResponse(undefined);
      setError(reason instanceof Error ? reason.message : "Lookup failed.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      void runLookup("", mode);
      return;
    }
    const handle = window.setTimeout(() => {
      void runLookup(query, mode);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [query, mode, runLookup]);

  function submit(event: FormEvent) {
    event.preventDefault();
    void runLookup(query, mode, true);
  }

  return (
    <div>
      <Card className="relative z-10 mx-auto max-w-3xl shadow-xl shadow-slate-900/5">
        <CardContent>
          <div className="mb-4 flex items-center justify-between gap-3">
            <ModeTabs value={mode} onChange={setMode} />
            <span className="hidden items-center gap-1.5 text-xs font-medium text-slate-400 sm:flex"><Database className="size-3.5" />Offline data</span>
          </div>
          <form onSubmit={submit}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 size-5 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="CHASUS33, 021000021, or Chase…"
                className="pl-12 pr-12"
                maxLength={100}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="search"
                aria-label="BIC, routing number, or bank name"
              />
              {loading && <LoaderCircle className="pointer-events-none absolute right-4 top-3.5 size-5 animate-spin text-indigo-500" aria-hidden />}
            </div>
          </form>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">Paste an 8–11 character SWIFT/BIC, a 9-digit ABA routing number, or search by institution name. Results update as you type.</p>
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

function shouldWaitForMoreInput(value: string, mode: LookupMode) {
  if (mode === "rtn") return /^\d{1,8}$/.test(value);
  if (mode === "bic") return value.length < 8;
  if (mode === "name") return value.length < 2;
  if (/^\d{1,8}$/.test(value)) return true;
  return value.length < 2;
}

function Notice({ text }: { text: string }) {
  return <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><AlertCircle className="mt-0.5 size-5 shrink-0" /><p>{text}</p></div>;
}
