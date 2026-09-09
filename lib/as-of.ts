export function formatAsOfDate(value: string): string {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value);
  if (!match) return value;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = match[3] ? Number(match[3]) : undefined;
  if (month < 1 || month > 12 || (day !== undefined && (day < 1 || day > 31))) return value;

  const date = new Date(Date.UTC(year, month - 1, day ?? 1));
  if (Number.isNaN(date.getTime()) || date.getUTCMonth() !== month - 1) return value;

  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    ...(day ? { day: "numeric" } : {}),
    timeZone: "UTC",
  });
}

export type DirectoryAsOf = {
  routingAsOf?: string;
  bicAsOf?: string;
};

export function directoryAsOf(data: { dataAsOf: string; routingAsOf?: string; bicAsOf?: string }): DirectoryAsOf {
  return {
    routingAsOf: data.routingAsOf ?? data.dataAsOf,
    bicAsOf: data.bicAsOf,
  };
}

export function dataAttribution(data: { routingAsOf?: string; bicAsOf?: string }) {
  const routing = data.routingAsOf
    ? `Routing data: Federal Reserve ACH/Fedwire snapshot, ${formatAsOfDate(data.routingAsOf)}.`
    : "Routing data: Federal Reserve ACH/Fedwire snapshot.";
  const bic = data.bicAsOf
    ? `BIC names as of ${formatAsOfDate(data.bicAsOf)}: OpenSanctions ISO 9362 reference data (free for non-commercial use; businesses need an OpenSanctions license), confirmed where possible with the GLEIF/SWIFT BIC-to-LEI mapping.`
    : "BIC names: OpenSanctions ISO 9362 reference data (free for non-commercial use; businesses need an OpenSanctions license), confirmed where possible with the GLEIF/SWIFT BIC-to-LEI mapping.";
  return `${routing} ${bic} Always verify settlement instructions directly with the receiving institution.`;
}
