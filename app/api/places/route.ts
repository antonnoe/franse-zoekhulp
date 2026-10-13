import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizePlaces, officialJson, sourceInfo } from "@/lib/public-data";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") || "";
  const parsed = z.string().trim().min(2).max(80).regex(/^[\p{L}\p{N}\s'’.-]+$/u).safeParse(query);
  if (!parsed.success) return NextResponse.json({ error: "Vul minimaal twee letters of een postcode in." }, { status: 400 });
  const url = new URL("https://geo.api.gouv.fr/communes");
  url.searchParams.set(/^\d{5}$/.test(parsed.data) ? "codePostal" : "nom", parsed.data);
  url.searchParams.set("fields", "nom,code,codesPostaux,centre,population,departement");
  url.searchParams.set("limit", "12"); url.searchParams.set("boost", "population");
  try {
    const places = normalizePlaces(await officialJson(url));
    return NextResponse.json({ places, source: sourceInfo, checkedAt: new Date().toISOString() });
  } catch { return NextResponse.json({ error: "Plaatsgegevens zijn tijdelijk niet beschikbaar. Probeer opnieuw." }, { status: 502 }); }
}
