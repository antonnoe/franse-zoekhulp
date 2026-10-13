import { NextResponse } from "next/server";
import { z } from "zod";
import { regionIntakeSchema, regionProfileKey } from "@/lib/region-contract";
import { recommendRegions, type RegionFacts } from "@/lib/region-engine";
import { nationalPlaces } from "@/lib/public-data";
import facts from "@/data/region-data.json";
export const maxDuration = 60;
const inputSchema = z.object({ intake: regionIntakeSchema, centerCode: z.string().regex(/^(?:\d{5}|2[AB]\d{3})$/).optional() }).strict();
export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > 12000) return NextResponse.json({ error: "Te veel invoer." }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(text); } catch { return NextResponse.json({ error: "Ongeldige invoer." }, { status: 400 }); }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Kies een woonomgeving en controleer uw reistijd en straal." }, { status: 400 });
  if (!Object.keys(facts.entries).length) return NextResponse.json({ error: "De officiële voorzieningengegevens zijn nog niet beschikbaar. Er worden geen kandidaten verzonnen." }, { status: 503 });
  try {
    const places = await nationalPlaces();
    const center = parsed.data.centerCode ? places.find(p => p.code === parsed.data.centerCode) : undefined;
    if (parsed.data.centerCode && !center) return NextResponse.json({ error: "De gekozen plaats is niet gevonden." }, { status: 400 });
    const result = recommendRegions(places, parsed.data.intake, facts as RegionFacts, center);
    return NextResponse.json({ ...result, profileKey: regionProfileKey(parsed.data.intake),
      scopeLabel: center ? `Binnen ${Math.max(1, parsed.data.intake.radiusKm)} km van ${center.name}` : "Voorbeelden verspreid over Europees Frankrijk",
      sourceDate: `BPE 2025: ${facts.updated}; dichtheid: ${facts.densityUpdated}`, checkedAt: new Date().toISOString(),
      method: "Woonomgeving en nabijheid van geregistreerde boodschappenwinkels, bakker en apotheek. Afstanden tussen gemeentecentra zijn hemelsbreed. Landelijke voorbeelden zijn geografisch gespreid; dit is geen ranglijst van de beste regio’s.",
      sources: [{ name: "INSEE BPE 2025", url: facts.url, updated: facts.updated }, { name: "INSEE-dichtheidsindeling", url: facts.densityUrl, updated: facts.densityUpdated }, { name: "API Géo", url: "https://geo.api.gouv.fr/decoupage-administratif/communes", updated: "Actualisatiedatum niet vermeld" }]
    });
  } catch { return NextResponse.json({ error: "Kandidaatgebieden kunnen nu niet betrouwbaar worden berekend. Probeer opnieuw." }, { status: 502 }); }
}
