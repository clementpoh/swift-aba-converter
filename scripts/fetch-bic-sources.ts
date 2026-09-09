import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const RAW = "data/raw";
const CACHE = `${RAW}/.cache`;
const OPENSANCTIONS_INDEX = "https://data.opensanctions.org/datasets/latest/iso9362_bic/index.json";
const GLEIF_LIST = "https://mapping.gleif.org/api/v2/bic-lei?page%5Bsize%5D=1";
const USER_AGENT = "Routebridge/0.1 (+https://github.com/clementpoh/swift-aba-converter)";

type FtmEntity = {
  caption?: string;
  properties?: {
    name?: string[];
    alias?: string[];
    previousName?: string[];
    weakAlias?: string[];
    swiftBic?: string[];
    country?: string[];
  };
};

type OpensanctionsIndex = {
  version: string;
  last_export: string;
  last_change?: string;
  title?: string;
  resources: Array<{ name: string; url: string; size?: number }>;
};

type GleifList = {
  data: Array<{
    id: string;
    attributes: {
      fileName: string;
      uploadedAt: string;
      downloadLink: string;
    };
  }>;
};

type BicInstitution = {
  name: string;
  aliases: string[];
  bics: string[];
  lei?: string;
  gleifConfirmed: boolean;
};

function isUsBic(bic: string) {
  return bic.length >= 6 && bic.slice(4, 6) === "US";
}

function normalizeBic(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function uniqueSorted(values: Iterable<string>) {
  return [...new Set(values)].sort();
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (letter) => letter.toUpperCase())
    .replace(/\b(Na|N A)\b/g, "N.A.")
    .replace(/\bUs\b/g, "US");
}

async function fetchJson<T>(url: string, accept = "application/json, application/vnd.api+json"): Promise<T> {
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT, accept } });
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
}

async function downloadFile(url: string, destination: string) {
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT }, redirect: "follow" });
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status} ${response.statusText}`);
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(destination, Buffer.from(await response.arrayBuffer()));
}

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",").map((column) => column.trim().toUpperCase());
  const leiIndex = header.indexOf("LEI");
  const bicIndex = header.indexOf("BIC");
  if (leiIndex < 0 || bicIndex < 0) {
    throw new Error(`GLEIF CSV is missing LEI/BIC columns: ${header.join(",")}`);
  }
  const rows: Array<{ lei: string; bic: string }> = [];
  for (const line of lines.slice(1)) {
    const columns = line.split(",");
    const lei = columns[leiIndex]?.trim().toUpperCase();
    const bic = normalizeBic(columns[bicIndex] ?? "");
    if (lei && bic) rows.push({ lei, bic });
  }
  return rows;
}

function extractZip(zipPath: string, destination: string) {
  mkdirSync(destination, { recursive: true });
  execFileSync("unzip", ["-o", "-q", zipPath, "-d", destination]);
  const csv = readdirSync(destination).find((name) => name.toLowerCase().endsWith(".csv"));
  if (!csv) throw new Error(`No CSV found in ${zipPath}`);
  return join(destination, csv);
}

async function main() {
  mkdirSync(CACHE, { recursive: true });
  mkdirSync(RAW, { recursive: true });

  console.log("Fetching OpenSanctions ISO 9362 BIC index…");
  const osIndex = await fetchJson<OpensanctionsIndex>(OPENSANCTIONS_INDEX);
  const ftm = osIndex.resources.find((resource) => resource.name === "entities.ftm.json");
  if (!ftm) throw new Error("OpenSanctions index has no entities.ftm.json resource");
  const ftmPath = join(CACHE, "entities.ftm.json");
  console.log(`Downloading ${ftm.url}`);
  await downloadFile(ftm.url, ftmPath);

  console.log("Fetching latest GLEIF BIC-to-LEI relationship file…");
  const gleifList = await fetchJson<GleifList>(GLEIF_LIST, "application/vnd.api+json");
  const gleifFile = gleifList.data[0];
  if (!gleifFile) throw new Error("GLEIF mapping API returned no BIC-to-LEI files");
  const zipPath = join(CACHE, gleifFile.attributes.fileName);
  console.log(`Downloading ${gleifFile.attributes.downloadLink}`);
  await downloadFile(gleifFile.attributes.downloadLink, zipPath);
  const extractDir = join(tmpdir(), `routebridge-gleif-${gleifFile.id}`);
  const csvPath = extractZip(zipPath, extractDir);
  const gleifRows = parseCsv(readFileSync(csvPath, "utf8"));

  const gleifByBic8 = new Map<string, { leis: Set<string>; bics: Set<string> }>();
  for (const row of gleifRows) {
    if (!isUsBic(row.bic)) continue;
    const bic8 = row.bic.slice(0, 8);
    const current = gleifByBic8.get(bic8) ?? { leis: new Set<string>(), bics: new Set<string>() };
    current.leis.add(row.lei);
    current.bics.add(row.bic);
    current.bics.add(bic8);
    gleifByBic8.set(bic8, current);
  }

  const institutions: BicInstitution[] = [];
  const seenBics = new Set<string>();
  let usEntities = 0;

  for (const line of readFileSync(ftmPath, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const entity = JSON.parse(line) as FtmEntity;
    const properties = entity.properties ?? {};
    const bics = uniqueSorted((properties.swiftBic ?? []).map(normalizeBic).filter((bic) => bic.length >= 8 && isUsBic(bic)));
    if (!bics.length) continue;
    usEntities += 1;
    const names = uniqueSorted(
      [entity.caption, ...(properties.name ?? []), ...(properties.alias ?? []), ...(properties.previousName ?? []), ...(properties.weakAlias ?? [])]
        .filter((name): name is string => Boolean(name && name.trim()))
        .map((name) => titleCase(name.trim())),
    );
    const displayName = names[0] ?? bics[0];
    const aliases = names.filter((name) => name !== displayName);
    const expanded = new Set<string>();
    const leis = new Set<string>();
    let gleifConfirmed = false;
    for (const bic of bics) {
      const bic8 = bic.slice(0, 8);
      expanded.add(bic8);
      const gleif = gleifByBic8.get(bic8);
      if (gleif) {
        gleifConfirmed = true;
        for (const extra of gleif.bics) expanded.add(extra);
        for (const lei of gleif.leis) leis.add(lei);
      } else {
        expanded.add(`${bic8}XXX`);
      }
    }
    const record: BicInstitution = {
      name: displayName,
      aliases,
      bics: uniqueSorted(expanded),
      gleifConfirmed,
    };
    if (leis.size === 1) record.lei = [...leis][0];
    institutions.push(record);
    for (const bic of record.bics) seenBics.add(bic);
  }

  institutions.sort((a, b) => a.name.localeCompare(b.name));

  const bicAsOf = osIndex.last_export.slice(0, 10);
  const output = {
    bicAsOf,
    generatedAt: new Date().toISOString(),
    opensanctions: {
      dataset: "iso9362_bic",
      title: osIndex.title ?? "Business Identifier Code (BIC) Reference Data",
      version: osIndex.version,
      lastExport: osIndex.last_export,
      lastChange: osIndex.last_change,
      url: "https://www.opensanctions.org/datasets/iso9362_bic/",
      downloadUrl: ftm.url,
    },
    gleif: {
      fileName: gleifFile.attributes.fileName,
      uploadedAt: gleifFile.attributes.uploadedAt,
      url: "https://www.gleif.org/en/lei-data/lei-mapping/download-bic-to-lei-relationship-files",
      downloadUrl: gleifFile.attributes.downloadLink,
      usBic8s: gleifByBic8.size,
    },
    stats: {
      usEntities,
      bics: seenBics.size,
      bic8s: new Set([...seenBics].map((bic) => bic.slice(0, 8))).size,
      gleifConfirmed: institutions.filter((institution) => institution.gleifConfirmed).length,
    },
    institutions,
  };

  writeFileSync(`${RAW}/bic-us.json`, `${JSON.stringify(output, null, 2)}\n`);
  console.log(
    `Wrote ${RAW}/bic-us.json with ${usEntities} US BIC institutions, ${output.stats.bic8s} unique BIC8s (${output.stats.gleifConfirmed} GLEIF-confirmed)`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
