import { test } from "node:test";
import assert from "node:assert/strict";
import { GET as places } from "../app/api/places/route";
import { GET as nearby } from "../app/api/nearby/route";
import { POST as travel } from "../app/api/travel/route";
import { normalizePlaces } from "../lib/public-data";
test("invalid place queries are rejected before querying external services", async () => {
  for (const q of ["", "A", "http://internal/"]) assert.equal((await places(new Request(`https://test.local/api/places?q=${encodeURIComponent(q)}`))).status, 400);
});
test("missing radius coordinates cannot silently become zero", async () => {
  assert.equal((await nearby(new Request("https://test.local/api/nearby?radius=20"))).status, 400);
  assert.equal((await nearby(new Request("https://test.local/api/nearby?lat=42&lon=2&radius=200"))).status, 400);
});
test("travel endpoint rejects URLs and out-of-range coordinates", async () => {
  const req = new Request("https://test.local/api/travel", { method: "POST", body: JSON.stringify({ start: { lat: 200, lon: 2 }, end: { lat: 42, lon: 2 } }) });
  assert.equal((await travel(req)).status, 400);
});
test("upstream failure returns an error instead of a fabricated place", async () => {
  const original = global.fetch; global.fetch = async () => new Response("offline", { status: 503 });
  try { const response = await places(new Request("https://test.local/api/places?q=Ceret")); assert.equal(response.status, 502); assert.ok((await response.json()).error); }
  finally { global.fetch = original; }
});
test("official geodata and official INSEE data join on the commune code", () => {
  const found = normalizePlaces([{ nom: "Céret", code: "66049", codesPostaux: ["66400"], centre: { coordinates: [2.7565, 42.473] }, population: 7521, departement: { nom: "Pyrénées-Orientales" } }]);
  assert.equal(found[0].name, "Céret"); assert.equal(found[0].density, 3); assert.equal(found[0].densityLabel, "Petites villes");
});
