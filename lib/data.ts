import type { Institution } from "./types";

export type RoutingStats = {
  institutions: number;
  routings: number;
  bics: number;
  bic8s?: number;
  sourceBic8s?: number;
  gleifConfirmedBic8s?: number;
};

export type RoutingData = {
  dataAsOf: string;
  routingAsOf?: string;
  bicAsOf?: string;
  generatedAt: string;
  stats: RoutingStats;
  institutions: Institution[];
};

export type SearchIndex = {
  dataAsOf: string;
  routingAsOf?: string;
  bicAsOf?: string;
  stats: RoutingStats;
  rtn: Record<string, number>;
  bic: Record<string, number>;
};

let data: RoutingData | undefined;
let index: SearchIndex | undefined;
let loadPromise: Promise<RoutingData> | undefined;

function publicUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function fetchJson(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Could not load the offline routing directory.");
  }
  return response.json();
}

async function fetchGzipJson(url: string) {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error("Could not load the offline routing directory.");
  }
  const decompressed = response.body.pipeThrough(new DecompressionStream("gzip"));
  return new Response(decompressed).json();
}

export function isRoutingDataReady() {
  return data !== undefined && index !== undefined;
}

export async function loadRoutingData() {
  if (data && index) return data;
  if (!loadPromise) {
    loadPromise = (async () => {
      const [routing, searchIndex] = await Promise.all([
        fetchGzipJson(publicUrl("/data/routing.json.gz")) as Promise<RoutingData>,
        fetchJson(publicUrl("/data/index.json")) as Promise<SearchIndex>,
      ]);
      data = routing;
      index = searchIndex;
      return routing;
    })().catch((reason) => {
      loadPromise = undefined;
      throw reason;
    });
  }
  return loadPromise;
}

export function getRoutingData() {
  if (!data) throw new Error("Routing data not loaded");
  return data;
}

export function getSearchIndex() {
  if (!index) throw new Error("Routing data not loaded");
  return index;
}
