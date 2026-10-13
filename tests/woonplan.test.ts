import { test } from "node:test";
import assert from "node:assert/strict";
import { newPlan, newHouse, wishesSchema, planSchema, propertyBudget, safeUrl, type Place } from "../lib/model";
import { assessHouse, summary, visitQuestions } from "../lib/assessment";
import { portalLinks } from "../lib/portals";
import { distanceKm, densityFits } from "../lib/geography";
import fixtures from "./live-fixtures.json";
const ceret: Place = { code: "66049", name: "Céret", postcode: "66400", department: "Pyrénées-Orientales", lon: 2.7565, lat: 42.473, population: 7521, density: null, densityLabel: null };

test("unknown criteria never count as a positive match", () => {
  const plan = newPlan(), h = newHouse();
  const checks = assessHouse(h, plan.wishes), result = summary(checks);
  assert.equal(result.fits, 0); assert.equal(result.unknown, checks.length); assert.equal(result.hardUnknown, true); assert.equal(result.hardFail, false);
});
test("a failed hard requirement remains visible even if other known fields fit", () => {
  const w = { ...newPlan().wishes, hospitalPriority: "eis" as const };
  const h = { ...newHouse(), price: 200000, area: 140, propertyType: "Huis" as const, hospitalMinutes: 45 };
  const result = summary(assessHouse(h, w));
  assert.equal(result.hardFail, true); assert.equal(result.fits, 3);
});
test("an executed risk check is never treated as evidence of a safe match", () => {
  const h = { ...newHouse(), riskCheck: "gecontroleerd" as const };
  assert.equal(assessHouse(h, newPlan().wishes).find(c => c.key === "risks")?.status, "onbekend");
});
test("property budget reserves are subtracted and an impossible budget is rejected", () => {
  const w = newPlan().wishes; assert.equal(propertyBudget(w), 300000);
  assert.equal(wishesSchema.safeParse({ ...w, budget: 40000 }).success, false);
  assert.equal(wishesSchema.safeParse({ ...w, budget: -1 }).success, false);
});
test("all six portal links preserve the independently observed baseline", () => {
  const w = { ...newPlan().wishes, budget: 250000, purchaseReserve: 0, renovationReserve: 0, minArea: 100 };
  const links = portalLinks(ceret, w);
  for (const observed of fixtures.fixtures) {
    const link = links.find(l => l.id === observed.id); assert.equal(link?.url, observed.url); assert.equal(link?.prepared, true);
  }
});
test("portals requiring internal location IDs never receive invented IDs outside Céret", () => {
  const links = portalLinks({ ...ceret, code: "37261", name: "Tours", postcode: "37000" }, newPlan().wishes);
  for (const link of links.filter(l => !["leboncoin", "bienici"].includes(l.id))) { assert.equal(link.prepared, false); assert.equal(link.url, link.home); }
  assert.equal(links.find(l => l.id === "leboncoin")?.prepared, true);
  assert.equal(links.find(l => l.id === "bienici")?.prepared, true);
  for (const link of portalLinks(ceret, { ...newPlan().wishes, propertyType: "Anders" })) assert.equal(link.prepared, false);
});
test("changed budget and area retain provider-specific place identifiers", () => {
  const links = portalLinks(ceret, { ...newPlan().wishes, budget: 500000, purchaseReserve: 30000, renovationReserve: 70000, minArea: 150 });
  const seloger = new URL(links.find(l => l.id === "seloger")!.url);
  assert.equal(seloger.searchParams.get("locations"), "AD08FR27591"); assert.equal(seloger.searchParams.get("priceMax"), "400000"); assert.equal(seloger.searchParams.get("spaceMin"), "150");
});
test("import schema rejects unsafe links and unrecognized versions", () => {
  const p = newPlan(); assert.equal(planSchema.safeParse(p).success, true);
  assert.equal(planSchema.safeParse({ ...p, version: 2 }).success, false);
  assert.equal(planSchema.safeParse({ ...p, houses: [{ ...newHouse(), url: "javascript:alert(1)" }] }).success, false);
  assert.equal(safeUrl("https://example.com/a"), "https://example.com/a"); assert.equal(safeUrl("https://user:secret@example.com"), null);
});
test("specific accessibility, fee and unknown DPE questions are included", () => {
  const questions = visitQuestions(newHouse(), { ...newPlan().wishes, accessibility: true });
  for (const key of ["access", "dpe", "fees", "tax", "internet", "health"]) assert.ok(questions.some(q => q.id === key));
});
test("settlement density alone cannot certify hybrid suitability", () => {
  const rural = { ...ceret, density: 6 };
  assert.equal(densityFits(rural, ["rural"]), true); assert.equal(densityFits(rural, ["urban"]), false);
  assert.equal(densityFits(rural, ["hybrid"]), null); assert.equal(densityFits(ceret, ["rural"]), null);
});
test("radius is geographic distance, not drive time", () => {
  assert.equal(distanceKm(ceret, ceret), 0);
  assert.ok(Math.abs(distanceKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }) - 111.195) < .01);
});
