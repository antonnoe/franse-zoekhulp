import { z } from "zod";
import densityData from "@/data/density.json";
import { placeSchema, type Place } from "./model";
const geoRecord = z.object({ nom: z.string(), code: z.string(), codesPostaux: z.array(z.string()).optional(),
  population: z.number().nullable().optional(), centre: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
  departement: z.object({ nom: z.string() }).optional() });
export async function officialJson(url: URL, seconds = 3600) {
  const response = await fetch(url, { signal: AbortSignal.timeout(12000), next: { revalidate: seconds }, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("De officiële gegevensbron is tijdelijk niet beschikbaar.");
  return response.json();
}
export function normalizePlaces(data: unknown): Place[] {
  const rows = z.array(geoRecord).parse(data);
  const densities = densityData.entries as Record<string, number>;
  const labels = ("labels" in densityData ? densityData.labels : {}) as Record<string, string>;
  return rows.map(row => {
    const d = densities[row.code];
    return placeSchema.parse({ code: row.code, name: row.nom, postcode: row.codesPostaux?.[0] || "", department: row.departement?.nom || "",
      lon: row.centre.coordinates[0], lat: row.centre.coordinates[1], population: row.population ?? null,
      density: d ?? null, densityLabel: d ? labels[String(d)] ?? null : null });
  });
}
export const sourceInfo = { name: "API Géo / INSEE", url: "https://geo.api.gouv.fr/decoupage-administratif/communes", densityUrl: densityData.url, densityDate: densityData.updated, densityImported: densityData.imported };

// The national response exceeds Next.js's 2 MB fetch cache limit. Cache the
// parsed reference per warm instance, share concurrent requests, and expire it.
let national: { at: number; places: Place[] } | null = null;
let loading: Promise<Place[]> | null = null;
export async function nationalPlaces(): Promise<Place[]> {
  if (national && Date.now() - national.at < 86400000) return national.places;
  if (loading) return loading;
  loading = (async () => {
    const response = await fetch("https://geo.api.gouv.fr/communes?fields=nom,code,codesPostaux,centre,population,departement", { cache: "no-store", signal: AbortSignal.timeout(18000) });
    if (!response.ok) throw new Error("Gemeentereferentie niet beschikbaar.");
    const places = normalizePlaces(await response.json());
    national = { at: Date.now(), places };
    return places;
  })();
  try { return await loading; } finally { loading = null; }
}
