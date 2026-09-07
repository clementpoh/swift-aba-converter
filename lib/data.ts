import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Institution } from "./types";

type RoutingData = {
  dataAsOf: string;
  generatedAt: string;
  stats: { institutions: number; routings: number; bics: number };
  institutions: Institution[];
};

type SearchIndex = {
  dataAsOf: string;
  stats: RoutingData["stats"];
  rtn: Record<string, number>;
  bic: Record<string, number>;
};

let data: RoutingData | undefined;
let index: SearchIndex | undefined;

export function getRoutingData() {
  if (!data) {
    const compressed = readFileSync(path.join(process.cwd(), "data/routing.json.gz"));
    data = JSON.parse(gunzipSync(compressed).toString("utf8")) as RoutingData;
  }
  return data;
}

export function getSearchIndex() {
  if (!index) {
    index = JSON.parse(
      readFileSync(path.join(process.cwd(), "data/index.json"), "utf8"),
    ) as SearchIndex;
  }
  return index;
}
