import Fuse from "fuse.js";
import { detectMode, normalizeQuery } from "./detect";
import { getRoutingData, getSearchIndex } from "./data";
import type { Institution, LookupMode, LookupResponse } from "./types";

let fuse: Fuse<Institution> | undefined;

function getFuse() {
  if (!fuse) {
    fuse = new Fuse(getRoutingData().institutions, {
      keys: [
        { name: "displayName", weight: 0.7 },
        { name: "aliases", weight: 0.25 },
        { name: "routings.city", weight: 0.05 },
      ],
      threshold: 0.3,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
  }
  return fuse;
}

export function lookup(query: string, requestedMode: LookupMode = "auto"): LookupResponse {
  const detectedMode = requestedMode === "auto" ? detectMode(query) : requestedMode;
  const value = normalizeQuery(query, detectedMode);
  const data = getRoutingData();
  const index = getSearchIndex();
  let results: Institution[] = [];

  if (detectedMode === "rtn") {
    const match = index.rtn[value];
    if (match !== undefined) results = [data.institutions[match]];
  } else if (detectedMode === "bic") {
    const match = index.bic[value] ?? index.bic[value.slice(0, 8)];
    if (match !== undefined) results = [data.institutions[match]];
  } else {
    results = getFuse()
      .search(value, { limit: 20 })
      .map((result) => result.item);
  }

  return {
    query: value,
    detectedMode,
    results,
    total: results.length,
    dataAsOf: data.dataAsOf,
  };
}
