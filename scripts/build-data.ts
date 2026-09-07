import { gzipSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import type { Institution, RoutingEntry, Service } from "../lib/types";

const RAW = "data/raw";
const OUTPUT = "data";

type BicSource = {
  banks: Array<{
    bank_name: string;
    branches: Array<{ swift_code: string }>;
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

const bics = JSON.parse(readFileSync(`${RAW}/bic-crosswalk.json`, "utf8")) as BicSource;
const groupList = [...groups.entries()];
function attachBics(bankName: string, codes: string[]) {
  const key = normalized(bankName);
  if (key.length < 4) return;
  const candidates = groupList.filter(([candidate]) =>
    candidate === key || candidate.includes(key) || key.includes(candidate),
  );
  if (!candidates.length) return;
  for (const [, candidate] of candidates) {
    candidate.bics = [...new Set([...candidate.bics, ...codes])].sort();
    if (!candidate.aliases.includes(bankName)) candidate.aliases.push(bankName);
  }
}

for (const bank of bics.banks) {
  attachBics(
    bank.bank_name,
    [...new Set(bank.branches.map((branch) => branch.swift_code.toUpperCase()))],
  );
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

const output = {
  dataAsOf: "2018-12",
  generatedAt: new Date().toISOString(),
  stats: {
    institutions: institutions.length,
    routings: routings.size,
    bics: new Set(institutions.flatMap((institution) => institution.bics)).size,
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
  stats: output.stats,
  rtn: Object.fromEntries(
    institutions.flatMap((institution, index) =>
      institution.routings.map((routing) => [routing.rtn, index]),
    ),
  ),
  bic: bicIndex,
};
writeFileSync(`${OUTPUT}/index.json`, JSON.stringify(index));

console.log(
  `Built ${output.stats.institutions} institutions, ${output.stats.routings} RTNs, ${output.stats.bics} BICs`,
);
