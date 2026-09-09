"use client";

import { useEffect, useState } from "react";
import { dataAttribution, directoryAsOf } from "@/lib/as-of";
import { loadRoutingData } from "@/lib/data";

export function DataFooter() {
  const [asOf, setAsOf] = useState<{ routingAsOf?: string; bicAsOf?: string }>({});

  useEffect(() => {
    void loadRoutingData()
      .then((data) => setAsOf(directoryAsOf(data)))
      .catch(() => {
        // Keep attribution without snapshot dates if the directory fails to load.
      });
  }, []);

  return (
    <footer className="mx-auto mt-16 max-w-3xl border-t border-slate-200 pt-6 text-center text-xs leading-5 text-slate-400">
      {dataAttribution(asOf)}
    </footer>
  );
}
