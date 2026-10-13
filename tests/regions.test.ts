import { test } from "node:test";
import assert from "node:assert/strict";
import { newPlan, planSchema, type Place } from "../lib/model";
import { assessRegion, hubIndex, recommendRegions, type RegionFacts } from "../lib/region-engine";
import { regionIntake, regionProfileKey, areaFromCandidate } from "../lib/region-contract";
import { portalLinks, frenchBrief } from "../lib/portals";
import regionFixtures from "./region-portal-fixtures.json";
const village: Place = { code: "01001", name: "Testdorp", postcode: "01000", department: "Ain", lon: 5, lat: 46, population: 800, density: 6, densityLabel: "Rural à habitat dispersé" };
const hub: Place = { ...village, code: "01002", name: "Voorzieningenkern", lat: 46.05, density: 3 };
const facts: RegionFacts = { entries: { "01001": [0, 0, 0, 0, 0, 0], "01002": [2, 1, 1, 2, 1, 1] }, periurban: { "01001": true, "01002": false } };
test("hybrid preference requires an actual rural commune and a source-backed amenities hub", () => {
  const wishes = regionIntake(newPlan().wishes), nearest = hubIndex([village, hub], facts)(village, 20);
  const candidate = assessRegion(village, wishes, facts, nearest);
  assert.ok(candidate.matches.length > 0); assert.equal(candidate.hub?.place.code, "01002");
  assert.equal(assessRegion(hub, wishes, facts, nearest).matches.length, 0);
  assert.equal(assessRegion(village, wishes, facts, null).matches.length, 0);
});
test("unknown hard care and fibre requirements never become verified matches", () => {
  const wishes = { ...regionIntake(newPlan().wishes), hospitalPriority: "eis" as const, fibrePriority: "eis" as const };
  const c = assessRegion(village, wishes, facts, hubIndex([village, hub], facts)(village, 20));
  assert.ok(c.unknowns.filter(t => t.includes("Harde eis nog onbekend")).length === 2);
  assert.ok(c.matches.every(t => !/ziekenhuis|glasvezel/i.test(t)));
});
test("winter opening and medical availability cannot be inferred from facility counts", () => {
  const c = assessRegion(hub, { ...regionIntake(newPlan().wishes), settlement: ["urban"] }, facts, null);
  assert.ok(c.unknowns.some(t => t.includes("Winterlevendigheid")));
  assert.ok(c.reasons.some(t => t.includes("nieuwe patiënten") && t.includes("niet vastgesteld")));
});
test("a zero radius cannot pass through rounding a nearby hub down to zero", () => {
  const close = { ...hub, lat: village.lat + .0001 };
  const nearest = hubIndex([village, close], facts)(village, 0);
  assert.ok(nearest && nearest.distanceKm > 0);
  assert.equal(assessRegion(village, { ...regionIntake(newPlan().wishes), radiusKm: 0 }, facts, nearest).matches.length, 0);
});
test("local exploration does not silently recommend places outside the chosen radius", () => {
  const distant = { ...village, code: "01003", lat: 49 };
  const localFacts = { ...facts, entries: { ...facts.entries, "01003": [1, 1, 1, 1, 0, 0] } };
  const result = recommendRegions([village, hub, distant], { ...regionIntake(newPlan().wishes), settlement: ["rural"] }, localFacts, village);
  assert.ok(result.candidates.every(c => c.place.code !== "01003")); assert.equal(result.examined, 2);
});
test("selected areas carry the real centre, radius, reasons and unknowns into the saved plan", () => {
  const w = regionIntake(newPlan().wishes), c = assessRegion(village, w, facts, hubIndex([village, hub], facts)(village, 20));
  const area = areaFromCandidate(c, regionProfileKey(w), "INSEE 2025");
  const p = planSchema.parse({ ...newPlan(), searchAreas: [area] });
  assert.equal(p.searchAreas[0].center.code, village.code); assert.equal(p.searchAreas[0].radiusKm, 20); assert.deepEqual(p.searchAreas[0].unknowns, c.unknowns);
  const legacy = newPlan(); const { searchAreas, ...old } = legacy;
  assert.deepEqual(planSchema.parse(old).searchAreas, []);
});
test("Leboncoin area links carry radius separately from locality metadata", () => {
  const w = newPlan().wishes, c = assessRegion(village, regionIntake(w), facts, null), area = areaFromCandidate(c, "test", "test");
  const links = portalLinks(village, w, area), lbc = links.find(l => l.id === "leboncoin")!;
  assert.equal(new URL(lbc.url).searchParams.get("locations"), "Testdorp_01000__46_5_5000_20000"); assert.equal(lbc.radiusPrepared, true);
  const unsupportedRadius = portalLinks(village, w, { ...area, radiusKm: 37 }).find(l => l.id === "leboncoin")!;
  assert.equal(unsupportedRadius.radiusPrepared, false); assert.ok(unsupportedRadius.note.includes("37 km"));
  assert.equal(links.find(l => l.id === "bienici")!.radiusPrepared, false);
  assert.ok(frenchBrief(village, w, { ...area, radiusKm: 37 }).includes("37 km"));
});
test("missing facility coverage is unknown, not a fabricated zero", () => {
  const c = assessRegion({ ...village, code: "01099" }, { ...regionIntake(newPlan().wishes), settlement: ["rural"] }, facts, null);
  assert.equal(c.amenities, null); assert.ok(c.unknowns.some(t => t.includes("Voorzieningengegevens")));
});
test("the new area handoff reproduces the independently browser-verified Tours links", () => {
  const tours = { ...hub, ...regionFixtures.place, department: "Indre-et-Loire" };
  const w = newPlan().wishes, candidate = assessRegion(tours, regionIntake(w), facts, null);
  const area = areaFromCandidate(candidate, "test", "2026-10-13");
  for (const f of regionFixtures.fixtures) assert.equal(portalLinks(tours, w, area).find(l => l.id === f.id)?.url, f.url);
});
