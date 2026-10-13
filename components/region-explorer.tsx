"use client";
import { useRef, useState } from "react";
import type { Place, SearchArea, Wishes } from "@/lib/model";
import { regionIntake, regionProfileKey, regionResponseSchema, placeCharacter, areaFromCandidate, type RegionResponse } from "@/lib/region-contract";
export default function RegionExplorer({ wishes, places, areas, onChoose, onRemove }: {
  wishes: Wishes; places: Place[]; areas: SearchArea[]; onChoose: (area: SearchArea) => void; onRemove: (id: string) => void;
}) {
  const [scope, setScope] = useState("france"), [data, setData] = useState<RegionResponse | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const request = useRef(0);
  const signature = regionProfileKey(regionIntake(wishes));
  const stale = data && data.profileKey !== signature;
  async function discover() {
    const id = ++request.current; setBusy(true); setError("");
    try {
      const response = await fetch("/api/regions", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intake: regionIntake(wishes), ...(scope === "france" ? {} : { centerCode: scope }) }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Verkennen lukt nu niet.");
      const result = regionResponseSchema.parse(json);
      if (id === request.current) setData(result);
    } catch (e) { if (id === request.current) { setData(null); setError(e instanceof Error ? e.message : "Verkennen lukt nu niet."); } }
    finally { if (id === request.current) setBusy(false); }
  }
  return <section className="region-explorer" aria-label="Van leefwens naar zoekgebied">
    <div className="divider"/><p className="eyebrow">VAN UW WENSEN NAAR EEN ZOEKGEBIED</p><h3>Welke woonomgevingen passen bij uw voorkeur?</h3>
    <p>Bekijk concrete plaatsen en hun omgeving. De eerste selectie gebruikt uw gewenste woonomgeving en de nabijheid van geregistreerde dagelijkse voorzieningen. Uw andere wensen blijven zichtbaar als onderzoekspunten.</p>
    <div className="searchbar"><label className="field"><span>Waar wilt u verkennen?</span><select value={scope} onChange={e => { ++request.current; setBusy(false); setData(null); setScope(e.target.value); }}><option value="france">Voorbeelden uit Europees Frankrijk</option>{places.map(p => <option key={p.code} value={p.code}>Rond {p.name}</option>)}</select><small>Een lokale zoektocht gebruikt de opgegeven straal van {wishes.radiusKm} km. Bewaar een plaats hieronder om lokaal te verkennen.</small></label><button className="button" onClick={discover} disabled={busy || !wishes.settlement.length}>{busy ? "Gebieden vergelijken…" : "Verken kandidaatgebieden"}</button></div>
    {!wishes.settlement.length && <p className="notice">Kies bovenaan minimaal één woonomgeving.</p>}
    {error && <p className="notice" role="alert">{error}</p>}
    {stale && <p className="notice" role="status">Uw leefwensen zijn gewijzigd. Bereken de kandidaatgebieden opnieuw voordat u een gebied kiest.</p>}
    {data && <>
      <div className="region-result-head"><strong>{data.scopeLabel}</strong><small>{data.examined.toLocaleString("nl-NL")} gemeenten onderzocht · {data.totalEligible.toLocaleString("nl-NL")} met aanknopingspunten bij de gekozen woonomgeving. Maximaal acht voorbeelden getoond.</small></div>
      {!data.candidates.length && <p className="notice">Geen onderbouwde kandidaten in dit zoekgebied. Vergroot de straal, kies een andere woonomgeving of verken een andere plaats. Uw harde eisen zijn niet versoepeld.</p>}
      <div className="region-candidates">{data.candidates.map(c => <article key={c.place.code} className="region-candidate">
        <div className="region-card-head"><div><h3>{c.place.name} <small>{c.place.postcode}</small></h3><p>{c.place.department}</p></div><span className="version">{placeCharacter(c.place)}</span></div>
        <div className="region-tags">{c.matches.map(m => <span key={m}>{m}</span>)}</div>
        <h4>Waarom verkennen?</h4><ul>{c.reasons.map(t => <li key={t}>{t}</li>)}</ul>
        {c.amenities && <dl className="amenity-counts"><div><dt>Boodschappenwinkels</dt><dd>{c.amenities.food}</dd></div><div><dt>Bakkers</dt><dd>{c.amenities.bakery}</dd></div><div><dt>Apotheken</dt><dd>{c.amenities.pharmacy}</dd></div><div><dt>Huisartspraktijklocaties</dt><dd>{c.amenities.gp}</dd></div></dl>}
        <h4>Welke concessies of aandachtspunten?</h4><ul>{c.warnings.map(t => <li key={t}>{t}</li>)}</ul>
        <details className="details"><summary>Wat moet u nog onderzoeken? ({c.unknowns.length})</summary><ul>{c.unknowns.map(t => <li key={t}>{t}</li>)}</ul></details>
        {(wishes.hospitalPriority === "eis" || wishes.fibrePriority === "eis") && <p className="notice">Deze kandidaat is voorlopig: uw harde zorg- of interneteis is nog niet bevestigd.</p>}
        <p className="source">INSEE BPE 2025 (09-07-2026), dichtheid (15-05-2026). Geregistreerde voorzieningen zijn geen bewijs van actuele opening, beschikbaarheid van zorg of stilte.</p>
        <button className="button full" disabled={!!stale || busy} onClick={() => onChoose(areaFromCandidate(c, data.profileKey, data.sourceDate))}>Zoek woningen rond {c.place.name} →</button>
      </article>)}</div>
      <details className="details"><summary>Hoe komt deze selectie tot stand?</summary><p>{data.method}</p><p>Stedelijk: INSEE-categorieën 1–3. Stadsrand: stedelijke randzone of landelijk periurbaan. Landelijk: categorieën 5–7. Rust nabij voorzieningen: een landelijke gemeente met een kern met boodschappenwinkels, bakker en apotheek binnen uw straal. Dit zijn redactionele selectieregels, geen officiële leefkwaliteitsscore.</p><ul>{data.sources.map(s => <li key={s.name}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a> ({s.updated})</li>)}</ul><small>Uw notities en woningdossier gaan niet mee in deze vergelijking.</small></details>
    </>}
    {areas.length > 0 && <div className="chosen-areas"><h3>Uw gekozen zoekgebieden</h3>{areas.map(a => <div className="chosen-area" key={a.id}><div><strong>{a.center.name}</strong><small>{a.radiusKm === 0 ? "Alleen de gemeente" : `Straal ${a.radiusKm} km`} · {a.profileKey === signature ? "Gekozen bij uw huidige profiel" : "Wensen veranderd; beoordeel opnieuw"}</small></div><button className="plain" onClick={() => onChoose(a)}>Open Zoekhulp →</button><button className="remove" aria-label={`Zoekgebied ${a.center.name} verwijderen`} onClick={() => onRemove(a.id)}>×</button></div>)}</div>}
  </section>;
}
