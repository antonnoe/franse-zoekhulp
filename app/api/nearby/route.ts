import { NextResponse } from "next/server";
import { z } from "zod";
import { nationalPlaces, sourceInfo } from "@/lib/public-data";
import { distanceKm } from "@/lib/geography";
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const parsed = z.object({ lat: z.coerce.number().min(-90).max(90), lon: z.coerce.number().min(-180).max(180), radius: z.coerce.number().min(1).max(100) })
    .safeParse({ lat: q.get("lat"), lon: q.get("lon"), radius: q.get("radius") });
  if (!parsed.success || !q.has("lat") || !q.has("lon") || !q.has("radius")) return NextResponse.json({ error: "Ongeldig zoekgebied." }, { status: 400 });
  try {
    const places = (await nationalPlaces()).map(p => ({ ...p, distance: distanceKm(parsed.data, p) }))
      .filter(p => p.distance <= parsed.data.radius).sort((a, b) => a.distance - b.distance).slice(0, 60);
    return NextResponse.json({ places, source: sourceInfo, checkedAt: new Date().toISOString(), measure: "Hemelsbreed tussen gemeentecentra; geen rijtijd." });
  } catch { return NextResponse.json({ error: "De omgeving kan nu niet worden opgehaald. Probeer opnieuw." }, { status: 502 }); }
}
