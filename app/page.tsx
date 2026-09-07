import { SearchPanel } from "@/components/search-panel";
import { ArrowLeftRight, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[540px] bg-[radial-gradient(circle_at_50%_-10%,#c7d2fe_0%,#eef2ff_34%,transparent_72%)]" />
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold tracking-tight text-slate-950">
            <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white"><ArrowLeftRight className="size-4" /></span>
            Routebridge
          </div>
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500"><ShieldCheck className="size-4 text-emerald-600" />No data leaves your server</span>
        </nav>
        <header className="mx-auto max-w-3xl pb-9 pt-16 text-center sm:pt-24">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">US bank identifier lookup</p>
          <h1 className="text-balance text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-6xl">
            SWIFT/BIC <span className="text-indigo-500">↔</span> ABA/ACH
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-slate-600 sm:text-lg">
            One search for international bank codes, domestic routing numbers, and institution names. Fast, bidirectional, and fully offline.
          </p>
        </header>
        <SearchPanel />
        <footer className="mx-auto mt-16 max-w-3xl border-t border-slate-200 pt-6 text-center text-xs leading-5 text-slate-400">
          Routing data: Federal Reserve snapshot, December 2018. BIC reference data is independently sourced. Always verify settlement instructions directly with the receiving institution.
        </footer>
      </div>
    </main>
  );
}
