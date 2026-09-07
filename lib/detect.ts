import type { LookupMode } from "./types";

const RTN_PATTERN = /^\d{9}$/;
const BIC_PATTERN = /^[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/i;

export function detectMode(query: string): Exclude<LookupMode, "auto"> {
  const value = query.trim();
  if (RTN_PATTERN.test(value)) return "rtn";
  if (BIC_PATTERN.test(value)) return "bic";
  return "name";
}

export function normalizeQuery(query: string, mode: Exclude<LookupMode, "auto">) {
  const value = query.trim();
  return mode === "bic" ? value.toUpperCase() : value;
}

export function isValidRtn(rtn: string) {
  if (!RTN_PATTERN.test(rtn)) return false;
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
