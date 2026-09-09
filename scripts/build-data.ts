import { gzipSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import type { Institution, RoutingEntry, Service } from "../lib/types";

const RAW = "data/raw";
const OUTPUT = "data";
const ROUTING_AS_OF = "2018-12";

type BicSource = {
  bicAsOf?: string;
  opensanctions?: { lastExport?: string; version?: string };
  gleif?: { uploadedAt?: string; fileName?: string };
  stats?: { bic8s?: number; gleifConfirmed?: number };
  institutions: Array<{
    name: string;
    aliases?: string[];
    bics: string[];
    gleifConfirmed?: boolean;
  }>;
};

function titleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (letter) => letter.toUpperCase())
    .replace(/\b(Na|N A)\b/g, "N.A.")
    .replace(/\bUs\b/g, "US");
}

function normalized(value: string) {
  return value
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/\b(THE|NATIONAL|ASSOCIATION|NA|N A|BANKING|COMPANY|CO|CORPORATION|CORP|INC|LLC|TRUST)\b/g, " ")
    .replace(/[^A-Z0-9]/g, "")
    .replace(/^JPMORGANCHASE/, "JPMORGANCHASE")
    .trim();
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function validRtn(rtn: string) {
  if (!/^\d{9}$/.test(rtn)) return false;
  const digits = [...rtn].map(Number);
  return (
    (3 * (digits[0] + digits[3] + digits[6]) +
      7 * (digits[1] + digits[4] + digits[7]) +
      digits[2] +
      digits[5] +
      digits[8]) %
      10 ===
    0
  );
}

function yearMonth(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  const match = value.match(/^(\d{4}-\d{2})/);
  return match ? match[1] : fallback;
}

const routings = new Map<string, RoutingEntry>();

for (const line of readFileSync(`${RAW}/FedACHdir.txt`, "utf8").split(/\r?\n/)) {
  const rtn = line.slice(0, 9);
  if (!validRtn(rtn) || line.length < 149) continue;
  routings.set(rtn, {
    rtn,
    name: titleCase(line.slice(35, 71).trim()),
    city: titleCase(line.slice(107, 127).trim()),
    state: line.slice(127, 129).trim(),
    services: ["ACH"],
    officeCode: line.slice(9, 10) === "B" ? "B" : "O",
    supersededBy: line.slice(19, 20) === "2" ? line.slice(26, 35).trim() : undefined,
  });
}

for (const line of readFileSync(`${RAW}/fpddir.txt`, "utf8").split(/\r?\n/)) {
  const rtn = line.slice(0, 9);
  if (!validRtn(rtn) || line.length < 93) continue;
  const services: Service[] = [];
  if (line.slice(90, 91) === "Y") services.push("WIRE");
  if (line.slice(91, 92) === "S") services.push("SETTLEMENT_ONLY");
  if (line.slice(92, 93) === "Y") services.push("BOOK_ENTRY");
  const existing = routings.get(rtn);
  if (existing) {
    existing.services = [...new Set([...existing.services, ...services])];
  } else {
    routings.set(rtn, {
      rtn,
      name: titleCase(line.slice(27, 63).trim()),
      city: titleCase(line.slice(65, 90).trim()),
      state: line.slice(63, 65).trim(),
      services,
    });
  }
}

const groups = new Map<string, Institution>();
for (const routing of routings.values()) {
  const key = normalized(routing.name) || routing.rtn;
  const current = groups.get(key);
  if (current) {
    current.routings.push(routing);
    if (!current.aliases.includes(routing.name)) current.aliases.push(routing.name);
  } else {
    groups.set(key, {
      slug: `${slugify(routing.name)}-${routing.rtn}`,
      displayName: routing.name,
      aliases: [routing.name],
      bics: [],
      routings: [routing],
    });
  }
}

const bics = JSON.parse(readFileSync(`${RAW}/bic-us.json`, "utf8")) as BicSource;
const groupList = [...groups.entries()];
const gleifConfirmedBic8s = new Set<string>();

function attachBics(bankName: string, codes: string[], gleifConfirmed = false) {
  const key = normalized(bankName);
  if (key.length < 4) return;
  const candidates = groupList.filter(([candidate]) =>
    candidate === key || candidate.includes(key) || key.includes(candidate),
  );
  if (!candidates.length) return;
  const normalizedCodes = [...new Set(codes.map((code) => code.toUpperCase()).filter(Boolean))];
  for (const [, candidate] of candidates) {
    candidate.bics = [...new Set([...candidate.bics, ...normalizedCodes])].sort();
    if (!candidate.aliases.includes(bankName)) candidate.aliases.push(bankName);
  }
  if (gleifConfirmed) {
    for (const code of normalizedCodes) gleifConfirmedBic8s.add(code.slice(0, 8));
  }
}

for (const bank of bics.institutions) {
  const names = [bank.name, ...(bank.aliases ?? [])];
  for (const name of names) attachBics(name, bank.bics, bank.gleifConfirmed);
}

const curated = JSON.parse(
  readFileSync(`${RAW}/curated-bics.json`, "utf8"),
) as Array<{ bank_name: string; bics: string[] }>;
for (const bank of curated) attachBics(bank.bank_name, bank.bics);

const institutions = [...groups.values()]
  .map((institution) => ({
    ...institution,
    routings: institution.routings.sort((a, b) => a.rtn.localeCompare(b.rtn)),
  }))
  .sort((a, b) => a.displayName.localeCompare(b.displayName));

const bicIndex: Record<string, number> = {};
institutions.forEach((institution, index) => {
  for (const bic of institution.bics) {
    bicIndex[bic] = index;
    bicIndex[bic.slice(0, 8)] = index;
    bicIndex[`${bic.slice(0, 8)}XXX`] = index;
  }
});

// Curated head-office codes should resolve to the broadest matching legal-name
// group when the public branch directory contains duplicate or ambiguous BICs.
for (const bank of curated) {
  const key = normalized(bank.bank_name);
  const preferred = institutions
    .map((institution, index) => ({ institution, index, key: normalized(institution.displayName) }))
    .filter((item) => item.key === key || item.key.includes(key) || key.includes(item.key))
    .sort((a, b) => b.institution.routings.length - a.institution.routings.length)[0];
  if (!preferred) continue;
  for (const bic of bank.bics) {
    bicIndex[bic] = preferred.index;
    bicIndex[bic.slice(0, 8)] = preferred.index;
    bicIndex[`${bic.slice(0, 8)}XXX`] = preferred.index;
  }
}

const matchedBics = new Set(institutions.flatMap((institution) => institution.bics));
const bicAsOf = bics.bicAsOf ?? yearMonth(bics.opensanctions?.lastExport, "2026-09");
const output = {
  dataAsOf: ROUTING_AS_OF,
  routingAsOf: ROUTING_AS_OF,
  bicAsOf,
  generatedAt: new Date().toISOString(),
  sources: {
    routing: { asOf: ROUTING_AS_OF, files: ["FedACHdir.txt", "fpddir.txt"] },
    bic: {
      asOf: bicAsOf,
      opensanctionsVersion: bics.opensanctions?.version,
      gleifFile: bics.gleif?.fileName,
    },
  },
  stats: {
    institutions: institutions.length,
    routings: routings.size,
    bics: matchedBics.size,
    bic8s: new Set([...matchedBics].map((bic) => bic.slice(0, 8))).size,
    sourceBic8s: bics.stats?.bic8s,
    gleifConfirmedBic8s: gleifConfirmedBic8s.size,
  },
  institutions,
};

writeFileSync(`${OUTPUT}/routing.json`, JSON.stringify(output));
writeFileSync(
  `${OUTPUT}/routing.json.gz`,
  gzipSync(readFileSync(`${OUTPUT}/routing.json`), { level: 9 }),
);

const index = {
  dataAsOf: output.dataAsOf,
  routingAsOf: output.routingAsOf,
  bicAsOf: output.bicAsOf,
  stats: output.stats,
  rtn: Object.fromEntries(
    institutions.flatMap((institution, index) =>
      institution.routings.map((routing) => [routing.rtn, index]),
    ),
  ),
  bic: bicIndex,
};
writeFileSync(`${OUTPUT}/index.json`, JSON.stringify(index));

function requireLookup(label: string, institution: Institution | undefined, needle: string) {
  if (!institution) throw new Error(`Expected ${label} to resolve`);
  if (!institution.displayName.toLowerCase().includes(needle) && !institution.aliases.some((alias) => alias.toLowerCase().includes(needle))) {
    throw new Error(`Expected ${label} to resolve to a ${needle} institution, got ${institution.displayName}`);
  }
}

requireLookup("CHASUS33", institutions[bicIndex.CHASUS33], "chase");
requireLookup("BOFAUS3N", institutions[bicIndex.BOFAUS3N], "america");
requireLookup("CITIUS33", institutions[bicIndex.CITIUS33], "citi");
requireLookup("021000021", institutions[index.rtn["021000021"]], "chase");
const wells = institutions.find((institution) => institution.displayName.toLowerCase().includes("wells fargo") && institution.bics.some((bic) => bic.startsWith("WFBI")));
if (!wells) throw new Error("Expected a Wells Fargo institution with WFBI BICs");

console.log(
  `Built ${output.stats.institutions} institutions, ${output.stats.routings} RTNs, ${output.stats.bics} BICs (${output.stats.bic8s} unique BIC8s; routing ${output.routingAsOf}, BIC ${output.bicAsOf})`,
);
