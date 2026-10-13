import { z } from "zod";
import { placeSchema, type Place, type SearchArea, type Wishes } from "./model";
export const regionIntakeSchema = z.object({
  settlement: z.array(z.enum(["urban", "suburban", "rural", "hybrid"])).min(1).max(4),
  radiusKm: z.number().min(0).max(100), hospitalMinutes: z.number().min(5).max(180),
  hospitalPriority: z.enum(["voorkeur", "eis"]), fibrePriority: z.enum(["niet-nodig", "voorkeur", "eis"]),
  winterLife: z.boolean(), climate: z.enum(["geen", "matig", "weinig"]),
  riskTolerance: z.enum(["onderzoeken", "vermijd-hoog"]), travelMode: z.enum(["auto", "trein-vliegtuig", "flexibel"]),
  maxTravelHours: z.number().min(1).max(48)
}).strict();
export type RegionIntake = z.infer<typeof regionIntakeSchema>;
export function regionIntake(w: Wishes): RegionIntake {
  return { settlement: w.settlement, radiusKm: w.radiusKm, hospitalMinutes: w.hospitalMinutes, hospitalPriority: w.hospitalPriority,
    fibrePriority: w.fibrePriority, winterLife: w.winterLife, climate: w.climate, riskTolerance: w.riskTolerance,
    travelMode: w.travelMode, maxTravelHours: w.maxTravelHours };
}
export function regionProfileKey(w: RegionIntake) { return JSON.stringify({ ...w, settlement: [...w.settlement].sort() }); }
export const candidateSchema = z.object({
  place: placeSchema, radiusKm: z.number().min(0).max(100),
  reasons: z.array(z.string()), warnings: z.array(z.string()), unknowns: z.array(z.string()),
  matches: z.array(z.string()), score: z.number(),
  amenities: z.object({ food: z.number(), bakery: z.number(), pharmacy: z.number(), gp: z.number(), shortStay: z.number(), emergency: z.number() }).nullable(),
  hub: z.object({ place: placeSchema, distanceKm: z.number(), typesPresent: z.number() }).nullable()
});
export type RegionCandidate = z.infer<typeof candidateSchema>;
export const regionResponseSchema = z.object({ candidates: z.array(candidateSchema), examined: z.number(), totalEligible: z.number(),
  profileKey: z.string(), scopeLabel: z.string(), sourceDate: z.string(), checkedAt: z.string(),
  method: z.string(), sources: z.array(z.object({ name: z.string(), url: z.string(), updated: z.string() })) });
export type RegionResponse = z.infer<typeof regionResponseSchema>;
export function areaFromCandidate(c: RegionCandidate, profileKey: string, sourceDate: string): SearchArea {
  return { id: `${c.place.code}-${c.radiusKm}`, center: c.place, radiusKm: c.radiusKm, reasons: c.reasons,
    warnings: c.warnings, unknowns: c.unknowns, profileKey, sourcesDate: sourceDate, createdAt: new Date().toISOString() };
}
export const densityDutch: Record<number, string> = { 1: "Grote stedelijke kern", 2: "Middelgrote stedelijke kern", 3: "Kleine stad", 4: "Stedelijke randzone", 5: "Landelijke kern", 6: "Landelijk met verspreide bebouwing", 7: "Landelijk met zeer verspreide bebouwing" };
export function placeCharacter(place: Place) { return place.density ? densityDutch[place.density] : "Woonomgeving onbekend"; }
