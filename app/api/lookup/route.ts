import { NextRequest, NextResponse } from "next/server";
import { isValidRtn } from "@/lib/detect";
import { lookup } from "@/lib/search";
import type { LookupMode } from "@/lib/types";

const modes = new Set<LookupMode>(["auto", "bic", "rtn", "name"]);

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const rawMode = request.nextUrl.searchParams.get("mode") ?? "auto";
  const mode = modes.has(rawMode as LookupMode) ? (rawMode as LookupMode) : "auto";

  if (!q) {
    return NextResponse.json({ error: "Enter a BIC, routing number, or bank name." }, { status: 400 });
  }
  if (q.length > 100) {
    return NextResponse.json({ error: "Searches are limited to 100 characters." }, { status: 400 });
  }
  if (mode === "rtn" && !isValidRtn(q)) {
    return NextResponse.json({ error: "That is not a valid 9-digit ABA routing number." }, { status: 400 });
  }

  return NextResponse.json(lookup(q, mode), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
