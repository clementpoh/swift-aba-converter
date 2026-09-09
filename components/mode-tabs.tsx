"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LookupMode } from "@/lib/types";

export const MODE_LABELS: Record<LookupMode, string> = {
  auto: "All",
  bic: "BIC",
  rtn: "ABA/RTN",
  name: "Name",
};

const modes: LookupMode[] = ["auto", "bic", "rtn", "name"];

export function ModeTabs({ value, onChange }: { value: LookupMode; onChange: (value: LookupMode) => void }) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as LookupMode)}>
      <TabsList aria-label="Search type">
        {modes.map((mode) => <TabsTrigger key={mode} value={mode}>{MODE_LABELS[mode]}</TabsTrigger>)}
      </TabsList>
    </Tabs>
  );
}
