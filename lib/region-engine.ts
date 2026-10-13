import type { Place } from "./model";
import { distanceKm } from "./geography";
import { placeCharacter, type RegionCandidate, type RegionIntake } from "./region-contract";

export type Amenities = NonNullable<RegionCandidate["amenities"]>;
export type RegionFacts = { entries: Record<string, (number | null)[]>; periurban: Record<string, boolean> };
const columns = ["food", "bakery", "pharmacy", "gp", "shortStay", "emergency"] as const;
export function amenitiesFor(code: string, facts: RegionFacts): Amenities | null {
  const row = facts.entries[code];
  if (!row || row.length !== columns.length || row.some(n => n === null || !Number.isFinite(n) || n < 0)) return null;
  return Object.fromEntries(columns.map((key, i) => [key, row[i]])) as Amenities;
}
export function amenityTypes(a: Amenities) { return [a.food, a.bakery, a.pharmacy].filter(n => n > 0).length; }
type Hub = { place: Place; typesPresent: number };
export function hubIndex(places: Place[], facts: RegionFacts) {
  const index = new Map<string, Hub[]>(), cell = .25;
  for (const place of places) {
    const a = amenitiesFor(place.code, facts);
    if (!a || amenityTypes(a) !== 3) continue;
    const key = `${Math.floor(place.lat / cell)},${Math.floor(place.lon / cell)}`;
    const list = index.get(key) || []; list.push({ place, typesPresent: 3 }); index.set(key, list);
  }
  return (p: Place, radius: number): RegionCandidate["hub"] => {
    const maxKm = Math.max(1, radius), latRange = maxKm / 110, lonRange = maxKm / (110 * Math.cos(p.lat * Math.PI / 180));
    let best: RegionCandidate["hub"] = null;
    for (let y = Math.floor((p.lat - latRange) / cell); y <= Math.floor((p.lat + latRange) / cell); y++) {
      for (let x = Math.floor((p.lon - lonRange) / cell); x <= Math.floor((p.lon + lonRange) / cell); x++) {
        for (const h of index.get(`${y},${x}`) || []) {
          const km = distanceKm(p, h.place);
          if (km <= maxKm && (!best || km < best.distanceKm)) best = { ...h, distanceKm: km };
        }
      }
    }
    return best;
  };
}
export function assessRegion(p: Place, wishes: RegionIntake, facts: RegionFacts, hub: RegionCandidate["hub"]): RegionCandidate {
  const amenities = amenitiesFor(p.code, facts), reasons: string[] = [], warnings: string[] = [], unknowns: string[] = [], matches: string[] = [];
  const periurban = facts.periurban[p.code];
  const checks: Record<string, boolean | null> = {
    urban: p.density === null ? null : p.density <= 3,
    suburban: p.density === 4 || periurban === true ? true : p.density === null || periurban === undefined ? null : false,
    rural: p.density === null ? null : p.density >= 5,
    hybrid: p.density === null || amenities === null ? null : p.density >= 5 && !!hub && hub.distanceKm <= wishes.radiusKm
  };
  const names: Record<string, string> = { urban: "Stedelijk", suburban: "Stadsrand / landelijk nabij stedelijk gebied", rural: "Landelijk", hybrid: "Rust nabij geregistreerde voorzieningen" };
  for (const preference of wishes.settlement) if (checks[preference] === true) matches.push(names[preference]);
  if (p.density !== null) reasons.push(`${placeCharacter(p)} volgens de INSEE-dichtheidsindeling.`);
  else unknowns.push("De officiële woonomgeving is niet beschikbaar voor deze gemeente.");
  if (periurban && wishes.settlement.includes("suburban")) reasons.push("INSEE classificeert deze landelijke gemeente als periurbaan; dit is geen gemeten reistijd.");
  if (hub) reasons.push(`${hub.place.name} heeft geregistreerde boodschappenwinkels, een bakker en een apotheek; ${hub.place.code === p.code ? "in deze gemeente" : `circa ${hub.distanceKm.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km tussen gemeentecentra`}.`);
  else if (wishes.settlement.includes("hybrid")) warnings.push(`Geen kern met alle drie dagelijkse voorzieningen gevonden binnen ${wishes.radiusKm} km. Dit betekent niet dat alle voorzieningen ontbreken.`);
  if (amenities) {
    if (amenities.gp > 0) reasons.push(`${amenities.gp} geregistreerde huisartspraktijklocatie${amenities.gp === 1 ? "" : "s"} in de gemeente; nieuwe patiënten en actuele beschikbaarheid niet vastgesteld.`);
    else warnings.push("Geen huisartspraktijklocatie geregistreerd in deze gemeente in BPE 2025; controleer de omgeving en actualiteit.");
  } else unknowns.push("Voorzieningengegevens voor deze gemeente zijn onbekend.");
  unknowns.push(`${wishes.hospitalPriority === "eis" ? "Harde eis nog onbekend" : "Nog onderzoeken"}: passende ziekenhuiszorg binnen ${wishes.hospitalMinutes} minuten. Registraties zijn geen bewijs van zorgtoegang.`);
  if (wishes.fibrePriority !== "niet-nodig") unknowns.push(`${wishes.fibrePriority === "eis" ? "Harde eis nog onbekend" : "Adrescontrole nodig"}: glasvezel bij de concrete woning.`);
  if (wishes.winterLife) unknowns.push("Winterlevendigheid: geregistreerde voorzieningen bewijzen geen openingstijden, activiteit of sociaal contact in de winter.");
  if (wishes.climate !== "geen") unknowns.push("Hittevoorkeur: klimaatindicatoren en gekozen toekomsthorizon zijn nog niet getoetst.");
  unknowns.push(`Bereikbaarheid vanaf NL/BE: de gewenste ${wishes.maxTravelHours} uur is nog niet getoetst voor uw vervoerswijze.`);
  unknowns.push("Overstroming, bosbrand en kleikrimp: controle op de concrete locatie of het perceel is nog nodig.");
  unknowns.push("Regionale betaalbaarheid is niet vastgesteld. Het woningbudget gaat wel mee naar de Zoekhulp.");
  warnings.push("De gemeentelijke indeling bewijst geen stilte op een specifiek terrein. Bezoek de plek op verschillende momenten.");
  // Internal ordering only: no AI score and no invented total lifestyle match.
  const score = matches.length ? 100 + (hub ? 10 : 0) + (amenities ? amenityTypes(amenities) : 0) : 0;
  return { place: { ...p, periurban: periurban ?? null }, radiusKm: wishes.radiusKm, reasons, warnings, unknowns, matches, score, amenities, hub };
}
export function recommendRegions(places: Place[], wishes: RegionIntake, facts: RegionFacts, center?: Place) {
  // This first explorer covers mainland France and Corsica. Overseas territories need separate travel logic.
  const metropolitan = places.filter(p => p.lat > 41 && p.lat < 52 && p.lon > -6 && p.lon < 10);
  const scope = center ? metropolitan.filter(p => distanceKm(center, p) <= Math.max(1, wishes.radiusKm)) : metropolitan;
  const findHub = hubIndex(metropolitan, facts);
  const assessed = scope.map(p => assessRegion(p, wishes, facts, findHub(p, wishes.radiusKm)));
  const eligible = assessed.filter(c => c.matches.length > 0).sort((a, b) => b.score - a.score || (a.hub?.distanceKm ?? Infinity) - (b.hub?.distanceKm ?? Infinity) || a.place.name.localeCompare(b.place.name, "fr"));
  const chosen: RegionCandidate[] = [];
  const perDepartment = new Map<string, number>();
  for (const candidate of eligible) {
    if (!center && ((perDepartment.get(candidate.place.department) || 0) >= 1 || chosen.some(c => distanceKm(c.place, candidate.place) < 60))) continue;
    if (center && chosen.some(c => distanceKm(c.place, candidate.place) < 1)) continue;
    chosen.push(candidate); perDepartment.set(candidate.place.department, (perDepartment.get(candidate.place.department) || 0) + 1);
    if (chosen.length === 8) break;
  }
  return { candidates: chosen, examined: scope.length, totalEligible: eligible.length };
}
