import { NextResponse } from "next/server";
import { z } from "zod";
import { officialJson } from "@/lib/public-data";
const coordinate = z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) });
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length")) > 4096) return NextResponse.json({ error: "Te veel gegevens." }, { status: 413 });
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "Ongeldige invoer." }, { status: 400 }); }
  const parsed = z.object({ start: coordinate, end: coordinate }).strict().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Kies twee geldige locaties." }, { status: 400 });
  const { start, end } = parsed.data;
  const url = new URL("https://data.geopf.fr/navigation/itineraire");
  for (const [key, value] of Object.entries({ resource: "bdtopo-osrm", start: `${start.lon},${start.lat}`, end: `${end.lon},${end.lat}`, profile: "car", optimization: "fastest", timeUnit: "minute", distanceUnit: "kilometer", getSteps: "false" })) url.searchParams.set(key, value);
  try {
    const raw = z.object({ duration: z.number().nonnegative(), distance: z.number().nonnegative() }).parse(await officialJson(url, 3600));
    return NextResponse.json({ minutes: Math.ceil(raw.duration), kilometers: raw.distance, source: "IGN Géoplateforme", sourceUrl: "https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/calcul-itineraire/", sourceDate: "2026-09-14", checkedAt: new Date().toISOString(), note: "Berekende autoroute in Frankrijk; geen actuele verkeersdrukte, grensoverschrijdende reis of bewijs van zorgtoegang." });
  } catch { return NextResponse.json({ error: "Geen betrouwbare reistijd beschikbaar. De uitkomst blijft onbekend." }, { status: 502 }); }
}
