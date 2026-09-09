import Fuse from "fuse.js";
import { detectMode, normalizeQuery } from "./detect";
import { getRoutingData, getSearchIndex, loadRoutingData } from "./data";
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

export async function lookup(query: string, requestedMode: LookupMode = "auto"): Promise<LookupResponse> {
  await loadRoutingData();
  const detectedMode = requestedMode === "auto" ? detectMode(query) : requestedMode;
  const value = normalizeQuery(query, detectedMode);
  const routing = getRoutingData();
  const searchIndex = getSearchIndex();
  let results: Institution[] = [];

  if (detectedMode === "rtn") {
    const match = searchIndex.rtn[value];
    if (match !== undefined) results = [routing.institutions[match]];
  } else if (detectedMode === "bic") {
    const match = searchIndex.bic[value] ?? searchIndex.bic[value.slice(0, 8)];
    if (match !== undefined) results = [routing.institutions[match]];
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
    dataAsOf: routing.dataAsOf,
    routingAsOf: routing.routingAsOf,
    bicAsOf: routing.bicAsOf,
  };
}
