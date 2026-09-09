export type Service = "ACH" | "WIRE" | "SETTLEMENT_ONLY" | "BOOK_ENTRY";

export type RoutingEntry = {
  rtn: string;
  name: string;
  city: string;
  state: string;
  services: Service[];
  officeCode?: "O" | "B";
  supersededBy?: string;
};

export type Institution = {
  slug: string;
  displayName: string;
  aliases: string[];
  bics: string[];
  routings: RoutingEntry[];
};

export type LookupMode = "auto" | "bic" | "rtn" | "name";

export type LookupResponse = {
  query: string;
  detectedMode: Exclude<LookupMode, "auto">;
  results: Institution[];
  total: number;
  dataAsOf: string;
  routingAsOf?: string;
  bicAsOf?: string;
};
