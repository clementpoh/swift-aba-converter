"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LookupMode } from "@/lib/types";

const modes: Array<{ value: LookupMode; label: string }> = [
  { value: "auto", label: "All" },
  { value: "bic", label: "BIC" },
  { value: "rtn", label: "RTN" },
  { value: "name", label: "Name" },
];

export function ModeTabs({ value, onChange }: { value: LookupMode; onChange: (value: LookupMode) => void }) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as LookupMode)}>
      <TabsList aria-label="Search type">
        {modes.map((mode) => <TabsTrigger key={mode.value} value={mode.value}>{mode.label}</TabsTrigger>)}
      </TabsList>
    </Tabs>
  );
}
