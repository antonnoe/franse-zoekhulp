"use client";

import { useEffect, useRef, useState } from "react";
import { newPlan, newHouse, planSchema, placeSchema, wishesSchema, propertyTypes, settlementOptions, statuses, propertyBudget, euro, safeUrl, type Plan, type House, type Place, type Wishes } from "@/lib/model";
import { assessHouse, summary, visitQuestions } from "@/lib/assessment";
import { densityFits } from "@/lib/geography";
import { portalLinks, frenchBrief } from "@/lib/portals";
import { resources, purchaseSteps } from "@/lib/resources";
import { cloudClient, saveCloud, loadCloud } from "@/lib/cloud";

const steps = ["Waar wil ik wonen?", "Hoe wil ik wonen?", "Slimme Zoekhulp", "Woningen vergelijken", "Bezichtiging", "Aankoopproces", "Klussen & aanpassen"];
const KEY = "if-woonplan-v1";
const date = (value: string) => value ? new Date(value).toLocaleDateString("nl-NL") : "Nog niet gecontroleerd";
const external = { target: "_blank", rel: "noopener noreferrer" };
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
function Link({ href, children, primary = false }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return <a className={primary ? "button" : "textlink"} href={href} {...external}>{children}<span aria-hidden="true"> ↗</span></a>;
}
function NumberField({ label, value, onChange, min = 0, max = 100000000, hint }: { label: string; value: number | null; onChange: (n: number | null) => void; min?: number; max?: number; hint?: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  return <Field label={label} hint={hint}><input type="number" min={min} max={max} value={draft ?? value ?? ""}
    onFocus={() => setDraft(value === null ? "" : String(value))}
    onChange={e => {
      const text = e.target.value;
      setDraft(text);
      if (text !== "" && Number.isFinite(e.target.valueAsNumber)) onChange(e.target.valueAsNumber);
    }}
    onBlur={() => {
      if (draft === "") onChange(null);
      setDraft(null);
    }} /></Field>;
}

export default function Woonplan() {
  const [plan, setPlan] = useState<Plan>(newPlan);
  const [step, setStep] = useState(0), [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]), [busy, setBusy] = useState(false), [cloudBusy, setCloudBusy] = useState(false);
  const [message, setMessage] = useState(""), [searchMessage, setSearchMessage] = useState("");
  const [activePlace, setActivePlace] = useState(""), [selectedHouse, setSelectedHouse] = useState("");
  const [email, setEmail] = useState(""), [signedIn, setSignedIn] = useState(false), [emailSent, setEmailSent] = useState(false);
  const [question, setQuestion] = useState(""), [routeStart, setRouteStart] = useState(""), [routeEnd, setRouteEnd] = useState(""), [routeMessage, setRouteMessage] = useState("");
  const [deletePending, setDeletePending] = useState<string | null>(null), [resetPending, setResetPending] = useState(false);
  const [importPending, setImportPending] = useState<Plan | null>(null);
  const fileInput = useRef<HTMLInputElement>(null), requestId = useRef(0), section = useRef<HTMLElement>(null);
  const w = plan.wishes, place = plan.places.find(p => p.code === activePlace) || plan.places[0];
  const house = plan.houses.find(h => h.id === selectedHouse) || plan.houses[0];
  const valid = wishesSchema.safeParse(w);
  const cloud = cloudClient();
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) { const p = planSchema.safeParse(JSON.parse(saved)); if (p.success) { setPlan(p.data); setMessage("Uw op dit apparaat bewaarde woonplan is geladen."); } else setMessage("Het oude dossier heeft een onbekend formaat. Importeer een geldige export."); }
    } catch { setMessage("Bewaren op dit apparaat is niet beschikbaar. U kunt wel een dossier downloaden."); }
    const client = cloudClient();
    if (!client) return;
    const { data } = client.auth.onAuthStateChange((_event, session) => setSignedIn(!!session));
    client.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    return () => data.subscription.unsubscribe();
  }, []);
  const updateW = <K extends keyof Wishes>(key: K, value: Wishes[K]) => setPlan(p => ({ ...p, wishes: { ...p.wishes, [key]: value } }));
  const updateH = <K extends keyof House>(key: K, value: House[K]) => { if (house) setPlan(p => ({ ...p, houses: p.houses.map(h => h.id === house.id ? { ...h, [key]: value } : h) })); };
  function go(index: number) { setStep(index); setDeletePending(null); setTimeout(() => section.current?.focus(), 0); }
  function addPlace(p: Place) {
    if (plan.places.length >= 20 && !plan.places.some(a => a.code === p.code)) { setMessage("Bewaar maximaal twintig kandidaatplaatsen."); return; }
    setPlan(current => ({ ...current, places: current.places.some(a => a.code === p.code) ? current.places : [...current.places, p] }));
    setActivePlace(p.code); setMessage(`${p.name} toegevoegd aan uw woonplan.`);
  }
  async function search(nearby?: Place) {
    const id = ++requestId.current; setBusy(true); setSearchMessage("");
    try {
      const url = nearby ? `/api/nearby?lat=${nearby.lat}&lon=${nearby.lon}&radius=${Math.max(1, w.radiusKm)}` : `/api/places?q=${encodeURIComponent(query)}`;
      const response = await fetch(url); const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Zoeken lukt nu niet.");
      const places = data.places.map((p: unknown) => placeSchema.parse(p));
      if (id !== requestId.current) return;
      setResults(places); setSearchMessage(nearby ? `Gemeentecentra binnen ${Math.max(1, w.radiusKm)} km van ${nearby.name}; hemelsbreed, geen reistijd.` : places.length ? "Kies een plaats om te bewaren of de omgeving te verkennen." : "Geen plaats gevonden. Probeer een andere naam of postcode.");
    } catch (e) { if (id === requestId.current) { setResults([]); setSearchMessage(e instanceof Error ? e.message : "Zoeken lukt nu niet."); } }
    finally { if (id === requestId.current) setBusy(false); }
  }
  function validatePlan(): Plan | null {
    const result = planSchema.safeParse(plan);
    if (!result.success) { setMessage(result.error.issues[0]?.message || "Controleer uw invoer."); return null; }
    return result.data;
  }
  function saveDevice() { const p = validatePlan(); if (!p) return; try { localStorage.setItem(KEY, JSON.stringify(p)); setMessage("Woonplan bewaard op dit apparaat. Gebruik Download dossier voor een reservekopie."); } catch { setMessage("Bewaren lukt niet. Download uw dossier om het te behouden."); } }
  function exportPlan() {
    const p = validatePlan(); if (!p) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `mijn-woonplan-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
  }
  async function importPlan(file: File | undefined) {
    if (!file) return;
    if (file.size > 2500000) { setMessage("Het dossier is te groot (maximaal 2,5 MB)."); return; }
    try { setImportPending(planSchema.parse(JSON.parse(await file.text()))); } catch { setMessage("Dit bestand is geen geldig V1-woonplan. Uw huidige dossier blijft behouden."); }
    if (fileInput.current) fileInput.current.value = "";
  }
  async function copyBrief() {
    if (!valid.success) { setMessage("Controleer eerst uw budget en woningwensen."); return; }
    try { await navigator.clipboard.writeText(frenchBrief(place, w)); setMessage("Franse zoekomschrijving gekopieerd."); } catch { setMessage("Kopiëren lukt niet. Selecteer de Franse tekst en kopieer deze handmatig."); }
  }
  async function cloudAction(action: "save" | "load" | "delete" | "login" | "logout") {
    if (!cloud) return;
    setCloudBusy(true);
    try {
      if (action === "login") {
        const { error } = await cloud.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
        if (error) throw new Error("De inloglink kon niet worden verstuurd. Controleer uw e-mailadres en probeer opnieuw.");
        setEmailSent(true); setMessage("Open de inloglink in uw e-mail op dit apparaat.");
      } else if (action === "logout") { await cloud.auth.signOut(); setMessage("Uitgelogd. Uw huidige dossier blijft op dit scherm staan."); }
      else if (action === "save") { const p = validatePlan(); if (!p) return; await saveCloud(p); setMessage("Woonplan online bewaard in uw eigen account."); }
      else if (action === "load") { const p = await loadCloud(); if (p) setImportPending(p); else setMessage("Er is nog geen online dossier bewaard."); }
      else { const { data: auth } = await cloud.auth.getUser(); if (!auth.user) throw new Error("Log eerst in."); const { error } = await cloud.from("woonplannen").delete().eq("user_id", auth.user.id); if (error) throw error; setMessage("Uw online dossier is verwijderd. De versie op dit scherm blijft behouden."); }
    } catch (e) { setMessage(e instanceof Error ? e.message : "De online handeling is niet gelukt."); }
    finally { setCloudBusy(false); }
  }
  async function calculateRoute() {
    const start = plan.places.find(p => p.code === routeStart), end = plan.places.find(p => p.code === routeEnd);
    if (!start || !end) { setRouteMessage("Kies twee bewaarde plaatsen."); return; }
    setRouteMessage("Reistijd wordt berekend…");
    try {
      const response = await fetch("/api/travel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ start: { lat: start.lat, lon: start.lon }, end: { lat: end.lat, lon: end.lon } }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setRouteMessage(`${start.name} → ${end.name}: circa ${data.minutes} minuten, ${Math.round(data.kilometers)} km. IGN, geraadpleegd ${date(data.checkedAt)}. Gemeentecentra; geen actuele verkeersdrukte.`);
    } catch (e) { setRouteMessage(e instanceof Error ? e.message : "Reistijd onbekend."); }
  }
  const selectedPlace = <Field label="Gekozen kandidaatplaats"><select value={place?.code || ""} onChange={e => setActivePlace(e.target.value)}><option value="">Kies een plaats</option>{plan.places.map(p => <option key={p.code} value={p.code}>{p.name} ({p.postcode})</option>)}</select></Field>;
  const selectedHouseField = <Field label="Woning in uw dossier"><select value={house?.id || ""} onChange={e => setSelectedHouse(e.target.value)}><option value="">Kies een woning</option>{plan.houses.map((h, i) => <option key={h.id} value={h.id}>{h.title || `Woning ${i + 1}`}</option>)}</select></Field>;
  const needHouse = <div className="empty"><h3>Uw woningen komen hier samen</h3><p>Voeg eerst een woning toe. Daarna kunt u de vergelijking, vragen en aankoopvoortgang bijhouden.</p><button className="button" onClick={() => go(3)}>Woning toevoegen →</button></div>;

  return <>
    <a className="skip" href="#content">Naar de inhoud</a>
    <header className="topbar"><a className="brand" href="https://infofrankrijk.com">infofrankrijk<span>KENNIS • ERVARING • HOUVAST</span></a><div className="toplinks"><span className="version">V1.0 · zonder AI</span><Link href={resources.hub}>La Maison</Link></div></header>
    <main className="shell">
      <div className="hero"><div><p className="eyebrow">VAN LEEFWENS NAAR WOONPLEK</p><h1>Mijn woonplan<br/><em>Frankrijk.</em></h1><p className="intro">Verken waar u wilt leven. Ontdek welke woning daarbij past. Houd uw keuzes en vragen bij, van de eerste zoektocht tot de sleutel.</p></div><div className="hero-note"><span className="route-line">UW ROUTE</span><p>Een passende plek.<br/>Een doordachte woning.<br/><strong>Een eigen woonplan.</strong></p><small>U kunt bij iedere stap beginnen en altijd terug.</small></div></div>
      <nav className="steps" aria-label="Stappen van uw woonplan">{steps.map((name, i) => <button key={name} className={step === i ? "active" : ""} aria-current={step === i ? "step" : undefined} onClick={() => go(i)}><span>{String(i + 1).padStart(2, "0")}</span>{name}</button>)}</nav>
      <div className="workspace"><section id="content" className="panel" ref={section} tabIndex={-1}>
        <div className="section-head"><p className="eyebrow">STAP {step + 1} VAN 7</p><h2>{steps[step]}</h2></div>
        {step === 0 && <>
          <p>Begin bij het dagelijks leven dat u zoekt. Bewaar verschillende kandidaatplaatsen; uw keuzes blijven aanpasbaar.</p>
          <h3>Wat voor omgeving spreekt u aan?</h3>
          <div className="choices">{settlementOptions.map(option => <label key={option.value} className={w.settlement.includes(option.value) ? "choice selected" : "choice"}><input type="checkbox" checked={w.settlement.includes(option.value)} onChange={e => updateW("settlement", e.target.checked ? [...w.settlement, option.value] : w.settlement.filter(v => v !== option.value))}/><strong>{option.label}</strong><small>{option.text}</small></label>)}</div>
          <div className="fields two"><Field label="Vertrekplaats in Nederland of België"><input value={w.origin} placeholder="Bijvoorbeeld Utrecht of Antwerpen" onChange={e => updateW("origin", e.target.value)}/></Field><Field label="Hoe wilt u reizen?"><select value={w.travelMode} onChange={e => updateW("travelMode", e.target.value as Wishes["travelMode"])}><option value="auto">Met de auto</option><option value="trein-vliegtuig">Trein of vliegtuig</option><option value="flexibel">Flexibel</option></select></Field><NumberField label="Gewenste maximale reistijd vanaf vertrekplaats (uur)" value={w.maxTravelHours} onChange={v => updateW("maxTravelHours", v ?? 1)} min={1} max={48} hint="Deze wens wordt bewaard; grensoverschrijdende reistijden worden nog niet automatisch getoetst."/><NumberField label="Gewenste reistijd ziekenhuis (minuten)" value={w.hospitalMinutes} min={5} max={180} onChange={v => updateW("hospitalMinutes", v ?? 5)}/><Field label="Hoe noodzakelijk is ziekenhuisbereikbaarheid?"><select value={w.hospitalPriority} onChange={e => updateW("hospitalPriority", e.target.value as Wishes["hospitalPriority"])}><option value="voorkeur">Voorkeur</option><option value="eis">Harde eis</option></select></Field><Field label="Glasvezel op het woningadres"><select value={w.fibrePriority} onChange={e => updateW("fibrePriority", e.target.value as Wishes["fibrePriority"])}><option value="niet-nodig">Geen eis; alternatieven onderzoeken</option><option value="voorkeur">Voorkeur</option><option value="eis">Harde eis</option></select></Field><Field label="Voorkeur bij hitte"><select value={w.climate} onChange={e => updateW("climate", e.target.value as Wishes["climate"])}><option value="geen">Nog geen voorkeur</option><option value="matig">Langdurige hitte liever beperken</option><option value="weinig">Weinig hete dagen is belangrijk</option></select></Field><Field label="Omgaan met natuurlijke risico’s"><select value={w.riskTolerance} onChange={e => updateW("riskTolerance", e.target.value as Wishes["riskTolerance"])}><option value="onderzoeken">Per locatie zorgvuldig onderzoeken</option><option value="vermijd-hoog">Hoge blootstelling liever vermijden</option></select></Field></div>
          <label className="checkline"><input type="checkbox" checked={w.winterLife} onChange={e => updateW("winterLife", e.target.checked)}/>Voorzieningen en activiteit in de winter zijn belangrijk</label>
          <Field label="Wat is verder belangrijk in uw dagelijks leven?"><textarea value={w.notes} maxLength={5000} rows={3} placeholder="Sociaal contact, stilte, wandelen, winkels, werken, familie…" onChange={e => updateW("notes", e.target.value)}/></Field>
          <div className="divider"/><h3>Verken een plaats en de omgeving</h3>
          <form className="searchbar" onSubmit={e => { e.preventDefault(); search(); }}><Field label="Gemeente of postcode"><input value={query} minLength={2} maxLength={80} placeholder="Céret, Tours, 66400…" onChange={e => setQuery(e.target.value)}/></Field><button className="button" disabled={busy || query.trim().length < 2}>{busy ? "Zoeken…" : "Zoek plaatsen"}</button></form>
          <div className="fields two"><NumberField label="Straal voor de regioverkenning (km)" value={w.radiusKm} min={0} max={100} onChange={v => updateW("radiusKm", v ?? 0)} hint="Hemelsbreed vanaf het gemeentecentrum; deze straal gaat nog niet automatisch mee naar huizensites."/></div>
          <p className="notice">Woonomgeving kan met INSEE worden beschreven. Zorgtoegang, winterleven, klimaat, prijsniveau en risico’s vormen nog geen automatische regioselectie. Ontbrekende gegevens blijven onbekend.</p>
          <p role="status">{searchMessage}</p>
          <div className="place-list">{results.map(p => <article className="place-card" key={p.code}><div><h3>{p.name} <small>{p.postcode}</small></h3><p>{p.department}{p.population !== null && ` · ${p.population.toLocaleString("nl-NL")} inwoners`}</p><small>{p.densityLabel || "Woonomgeving: nog niet beschikbaar"}{densityFits(p, w.settlement) === false ? " · andere dichtheid dan uw voorkeur" : ""}</small></div><div className="actions"><button className="button secondary" onClick={() => addPlace(p)} disabled={plan.places.some(a => a.code === p.code)}>{plan.places.some(a => a.code === p.code) ? "Bewaard ✓" : "Bewaar plaats"}</button><button className="plain" onClick={() => search(p)} disabled={busy || w.radiusKm === 0}>Verken omgeving →</button></div></article>)}</div>
          {(results.length > 0 || plan.places.length > 0) && <p className="source">Bronnen: <Link href="https://geo.api.gouv.fr/decoupage-administratif/communes">API Géo</Link> (actualisatiedatum niet vermeld); <Link href="https://www.insee.fr/fr/information/8571524">INSEE-dichtheidsindeling</Link> (werkboek 15-05-2026, geografie 01-01-2026). Dichtheid zegt niet of voorzieningen beschikbaar zijn. Stadsrand en rust nabij voorzieningen vragen nadere controle.</p>}
          {plan.places.length >= 2 && <details className="details"><summary>Bereken een lokale autoroute tussen twee plaatsen</summary><div className="fields two"><Field label="Van"><select value={routeStart} onChange={e => setRouteStart(e.target.value)}><option value="">Kies</option>{plan.places.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}</select></Field><Field label="Naar"><select value={routeEnd} onChange={e => setRouteEnd(e.target.value)}><option value="">Kies</option>{plan.places.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}</select></Field></div><button className="button secondary" onClick={calculateRoute}>Bereken reistijd</button><p role="status">{routeMessage}</p></details>}
        </>}
        {step === 1 && <>
          <p>Maak onderscheid tussen de aankoopprijs van de woning en uw totale beschikbare budget. Reserves vult u zelf in; dit is geen berekening van notariskosten.</p>
          <div className="fields two"><Field label="Gewenst woningtype"><select value={w.propertyType} onChange={e => updateW("propertyType", e.target.value as Wishes["propertyType"])}>{propertyTypes.map(t => <option key={t}>{t}</option>)}</select></Field><Field label="Hoeveel wilt u verbouwen?"><select value={w.renovation} onChange={e => updateW("renovation", e.target.value as Wishes["renovation"])}><option value="instapklaar">Liefst instapklaar</option><option value="beperkt">Beperkte werkzaamheden</option><option value="veel">Een groter renovatieproject</option></select></Field><NumberField label="Totaalbudget (€)" value={w.budget} min={1} onChange={v => updateW("budget", v ?? 0)}/><NumberField label="Eigen reserve aankoopkosten (€)" value={w.purchaseReserve} onChange={v => updateW("purchaseReserve", v ?? 0)}/><NumberField label="Eigen reserve renovatie (€)" value={w.renovationReserve} onChange={v => updateW("renovationReserve", v ?? 0)}/><NumberField label="Minimale woonoppervlakte (m²)" value={w.minArea} min={1} max={10000} onChange={v => updateW("minArea", v ?? 0)}/><NumberField label="Minimale perceeloppervlakte (m²)" value={w.minLand} max={10000000} onChange={v => updateW("minLand", v ?? 0)} hint="0 betekent: geen minimum."/></div>
          <label className="checkline"><input type="checkbox" checked={w.accessibility} onChange={e => updateW("accessibility", e.target.checked)}/>Dagelijks wonen zonder trappen is belangrijk</label>
          <div className="budget"><span>Beschikbaar voor de vraagprijs</span><strong>{euro(propertyBudget(w))}</strong><small>Totaalbudget minus uw opgegeven reserves. Geen taxatie of gegarandeerde haalbaarheid.</small></div>
          {!valid.success && <p className="notice" role="alert">{valid.error.issues[0].message}</p>}
        </>}
        {step === 2 && <>
          <p>Open huizensites vanuit uw woonplan. Het aanbod blijft op de betreffende site; deze tool verzamelt geen advertenties.</p>
          {selectedPlace}
          {!place && <p className="notice">Bewaar eerst een kandidaatplaats bij stap 1. U kunt hieronder ook direct de huizensites openen.</p>}
          <div className="brief"><h3>Uw zoekopdracht in het Frans</h3><p>{frenchBrief(place, w)}</p><button className="button secondary" onClick={copyBrief} disabled={!valid.success}>Kopieer zoekomschrijving</button></div>
          <p className="notice">De zes vooraf ingevulde links zijn getest voor <strong>huizen in Céret</strong> (12-10-2026). Voor andere plaatsen en woningtypes opent de portal zonder ingevulde filters. Stel daar de plaats, het type en de straal zelf in. Ook zorg, klimaat en risico’s worden niet als portalfilters meegestuurd.</p>
          <div className="portal-grid">{portalLinks(place, w).map((p, i) => <article key={p.id} className="portal"><span className={`portal-mark tone-${i}`}>{p.name.slice(0, 1)}</span><h3>{p.name}</h3><small>{p.prepared ? "Plaats, huis, prijs en oppervlakte voorbereid" : "Filters zelf instellen op de site"}</small>{valid.success ? <Link primary href={p.url}>{p.prepared ? "Open zoekopdracht" : "Open huizensite"}</Link> : <p>Controleer uw woningbudget bij stap 2.</p>}</article>)}</div>
          <p className="source">Portals kunnen ook ruimer aanbod tonen. Ouest-France verruimde bij de oorspronkelijke test automatisch naar 20 km. Controleer de actieve filters op iedere site.</p>
        </>}
        {step === 3 && <>
          <p>Voeg een advertentie zelf toe en vul de bekende gegevens in. Lege velden blijven onbekend. De originele tekst wordt niet automatisch opgehaald of door AI verwerkt.</p>
          <div className="actions">{selectedHouseField}<button className="button" disabled={plan.houses.length >= 50} onClick={() => { const h = newHouse(); h.placeCode = place?.code || ""; setPlan(p => ({ ...p, houses: [...p.houses, h] })); setSelectedHouse(h.id); }}>+ Woning toevoegen</button></div>
          {house && <>
            <div className="fields two"><Field label="Naam voor deze woning"><input value={house.title} maxLength={200} placeholder="Bijvoorbeeld Huis aan de dorpsrand" onChange={e => updateH("title", e.target.value)}/></Field><Field label="Link naar de advertentie"><input type="url" value={house.url} maxLength={2000} placeholder="https://…" onChange={e => updateH("url", e.target.value)}/></Field><Field label="Kandidaatplaats"><select value={house.placeCode} onChange={e => updateH("placeCode", e.target.value)}><option value="">Nog onbekend</option>{plan.places.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}</select></Field><Field label="Exact adres, indien bekend"><input value={house.address} maxLength={300} onChange={e => updateH("address", e.target.value)}/></Field><Field label="Werkelijk woningtype"><select value={house.propertyType || ""} onChange={e => updateH("propertyType", e.target.value ? e.target.value as House["propertyType"] : null)}><option value="">Onbekend</option>{propertyTypes.map(t => <option key={t}>{t}</option>)}</select></Field><Field label="Status"><select value={house.status} onChange={e => updateH("status", e.target.value as House["status"])}>{statuses.map(t => <option key={t}>{t}</option>)}</select></Field><NumberField label="Vraagprijs (€)" value={house.price} onChange={v => updateH("price", v)}/><NumberField label="Woonoppervlakte (m²)" value={house.area} min={1} max={10000} onChange={v => updateH("area", v)}/><NumberField label="Perceel (m²)" value={house.land} onChange={v => updateH("land", v)}/><Field label="DPE-label"><select value={house.dpe || ""} onChange={e => updateH("dpe", e.target.value ? e.target.value as House["dpe"] : null)}><option value="">Onbekend</option>{["A", "B", "C", "D", "E", "F", "G"].map(t => <option key={t}>{t}</option>)}</select></Field><Field label="Makelaarskosten inbegrepen?"><select value={house.feesIncluded} onChange={e => updateH("feesIncluded", e.target.value as House["feesIncluded"])}><option value="onbekend">Onbekend</option><option value="ja">Ja</option><option value="nee">Nee</option></select></Field><NumberField label="Taxe foncière per jaar (€)" value={house.annualTax} onChange={v => updateH("annualTax", v)}/><NumberField label="Door u gecontroleerde reistijd ziekenhuis (minuten)" value={house.hospitalMinutes} max={600} onChange={v => updateH("hospitalMinutes", v)}/></div>
            <Field label="Advertentietekst voor uw eigen dossier"><textarea rows={5} maxLength={30000} value={house.advert} onChange={e => updateH("advert", e.target.value)}/></Field>
            <Field label="Notities, bron en datum van controles"><textarea rows={3} maxLength={10000} value={house.notes} onChange={e => updateH("notes", e.target.value)}/></Field>
            <div className="verification"><div><h3>Internet op dit adres</h3><Link href={resources.internet}>Open bestaande internetcheck</Link><p className="source">Voer het exacte adres daar in. Geen automatische overdracht van het adres of resultaat.</p><Field label="Uitkomst van uw controle"><select value={house.internet} onChange={e => updateH("internet", e.target.value as House["internet"])}><option value="onbekend">Nog onbekend</option><option value="gecontroleerd">Voldoet aan mijn interneteis</option><option value="niet-passend">Voldoet niet aan mijn interneteis</option></select></Field><Field label="Datum internetcontrole"><input type="date" value={house.internetDate} onChange={e => updateH("internetDate", e.target.value)}/></Field></div><div><h3>Risico’s en werkelijke prijzen</h3><div className="actions"><Link href={resources.risks}>Controleer bij Géorisques</Link><Link href={resources.dvf}>Raadpleeg DVF</Link></div><p className="source">Controleer het juiste adres of perceel. Een uitgevoerd onderzoek betekent niet dat er geen risico bestaat.</p><Field label="Status risicocontrole"><select value={house.riskCheck} onChange={e => updateH("riskCheck", e.target.value as House["riskCheck"])}><option value="onbekend">Nog onbekend</option><option value="gecontroleerd">Controle uitgevoerd; bevindingen genoteerd</option><option value="aandacht">Aandachtspunten gevonden</option></select></Field><Field label="Datum risicocontrole"><input type="date" value={house.riskDate} onChange={e => updateH("riskDate", e.target.value)}/></Field></div></div>
            <div className="actions"><button className="plain danger" onClick={() => setDeletePending(house.id)}>Verwijder deze woning</button>{house.url && safeUrl(house.url) && <Link href={safeUrl(house.url)!}>Open advertentie</Link>}</div>
            {deletePending === house.id && <div className="notice">Deze woning en de bijbehorende notities verwijderen?<div className="actions"><button className="button" onClick={() => { setPlan(p => ({ ...p, houses: p.houses.filter(h => h.id !== house.id) })); setSelectedHouse(""); setDeletePending(null); }}>Verwijder woning</button><button className="plain" onClick={() => setDeletePending(null)}>Annuleren</button></div></div>}
          </>}
          {plan.houses.length > 0 && <><div className="divider"/><h3>Vergelijk met uw wensen</h3><p className="source">Op basis van uw eigen invoer. Geen totaalscore voor leefkwaliteit; onbekende gegevens worden niet als passend meegeteld.</p><div className="table-scroll"><table><thead><tr><th>Woning</th><th>Vraagprijs</th><th>m²</th><th>Past</th><th>Afwijkend</th><th>Onbekend</th><th>Harde eisen</th></tr></thead><tbody>{plan.houses.map((h, i) => { const s = summary(assessHouse(h, w)); return <tr key={h.id}><td><button className="plain" onClick={() => setSelectedHouse(h.id)}>{h.title || `Woning ${i + 1}`}</button></td><td>{euro(h.price)}</td><td>{h.area ?? "?"}</td><td>{s.fits}</td><td>{s.differences}</td><td>{s.unknown}</td><td>{s.hardFail ? "Wijkt af" : s.hardUnknown ? "Nog onbekend" : "Ingevoerde gegevens passen"}</td></tr>; })}</tbody></table></div>{house && <div className="checks">{assessHouse(house, w).map(c => <div key={c.key}><span className={`status ${c.status}`}>{c.status === "past" ? "Past volgens invoer" : c.status === "wijkt-af" ? "Wijkt af" : "Onbekend"}</span><strong>{c.label}{c.hard ? " · harde eis" : ""}</strong><small>{c.note}</small></div>)}</div>}</>}
        </>}
        {step === 4 && <>
          <p>Deze werkvragen sluiten aan op uw dossier. Gebruik daarnaast de bestaande IF-checklist en bespreek aandachtspunten met de juiste deskundige.</p><Link href={resources.checklist}>{resources.checklistConfigured ? "Open IF-bezichtigingschecklist" : "Zoek de bestaande checklist op Infofrankrijk"}</Link>
          {house ? <>{selectedHouseField}<h3>{house.title || "Uw woning"}</h3><div className="checklist">{visitQuestions(house, w).map(q => <label key={q.id}><input type="checkbox" checked={house.completed.includes(q.id)} onChange={e => updateH("completed", e.target.checked ? [...house.completed, q.id] : house.completed.filter(id => id !== q.id))}/><span><small>{q.group}</small>{q.text}</span></label>)}</div><form className="searchbar" onSubmit={e => { e.preventDefault(); if (question.trim() && house.questions.length < 50) { updateH("questions", [...house.questions, question.trim()]); setQuestion(""); } }}><Field label="Eigen vraag toevoegen"><input value={question} maxLength={200} onChange={e => setQuestion(e.target.value)}/></Field><button className="button secondary" disabled={!question.trim() || house.questions.length >= 50}>Voeg toe</button></form><button className="button secondary no-print" onClick={() => window.print()}>Print checklist</button></> : needHouse}
        </>}
        {step === 5 && <>
          <p>Houd uw voortgang bij. De inhoudelijke uitleg en juridische aandachtspunten blijven in de aankoopgids op Infofrankrijk.</p><Link primary href={resources.purchase}>Open de IF-aankoopgids</Link>
          {house ? <>{selectedHouseField}<div className="purchase-timeline">{purchaseSteps.map((s, i) => <label key={s}><input type="checkbox" checked={house.purchaseDone.includes(s)} onChange={e => updateH("purchaseDone", e.target.checked ? [...house.purchaseDone, s] : house.purchaseDone.filter(v => v !== s))}/><span className="step-number">{i + 1}</span><span><strong>{s}</strong><small>Markeer zelf als afgerond. Raadpleeg de bijbehorende fase in de gids.</small></span></label>)}</div></> : needHouse}
        </>}
        {step === 6 && <>
          <p>Gebruik uw bevindingen uit de bezichtiging om werkzaamheden en vragen te ordenen. De technische dossiers blijven op Infofrankrijk.</p><Link primary href={resources.renovation}>Open Klussen in Frankrijk</Link>
          <div className="resource-cards">{["Dak & isolatie", "Muren & vocht", "Water & afvalwater", "Verwarming & elektra"].map(t => <article key={t}><h3>{t}</h3><p>Noteer wat u wilt laten onderzoeken, welke werkzaamheden nodig zijn en welke offertes nog ontbreken.</p><Link href={resources.renovation}>Naar de klussenonderwerpen</Link></article>)}</div>
          {house ? <>{selectedHouseField}<Field label="Werkzaamheden en aandachtspunten bij deze woning"><textarea rows={6} maxLength={10000} value={house.notes} onChange={e => updateH("notes", e.target.value)}/></Field></> : needHouse}
        </>}
        <div className="step-footer"><button className="plain" onClick={() => go(Math.max(0, step - 1))} disabled={step === 0}>← Vorige stap</button>{step < 6 && <button className="button" onClick={() => go(step + 1)}>Volgende stap →</button>}</div>
      </section>
      <aside className="sidebar"><div className="card"><p className="eyebrow">UW OVERZICHT</p><h2>Mijn woonplan</h2><dl><div><dt>Woningtype</dt><dd>{w.propertyType}</dd></div><div><dt>Woningbudget</dt><dd>{euro(propertyBudget(w))}</dd></div><div><dt>Woonoppervlakte</dt><dd>Vanaf {w.minArea} m²</dd></div><div><dt>Kandidaatplaatsen</dt><dd>{plan.places.length}</dd></div><div><dt>Woningen</dt><dd>{plan.houses.length}</dd></div></dl>
        {plan.places.length > 0 && <div className="saved-places">{plan.places.map(p => <div key={p.code}><button className={place?.code === p.code ? "plain current" : "plain"} onClick={() => { setActivePlace(p.code); go(2); }}>{p.name}</button><button className="remove" aria-label={`${p.name} verwijderen uit kandidaatplaatsen`} onClick={() => { setPlan(current => ({ ...current, places: current.places.filter(a => a.code !== p.code) })); if (activePlace === p.code) setActivePlace(""); }}>×</button></div>)}</div>}
        <button className="button full" onClick={saveDevice}>Bewaar op dit apparaat</button><button className="button secondary full" onClick={exportPlan}>Download dossier</button><button className="plain" onClick={() => fileInput.current?.click()}>Importeer dossier</button><input ref={fileInput} type="file" accept="application/json,.json" className="file-input" onChange={e => importPlan(e.target.files?.[0])}/><small className="source">Bewaren gebeurt alleen als u op Bewaar klikt. Een download bevat ook uw adressen en notities.</small>
      </div>
      <div className="card"><h3>Online bewaren</h3>{!cloud ? <p>Bewaar voorlopig op dit apparaat of download uw dossier. Online bewaren wordt beschikbaar zodra de database is aangesloten.</p> : signedIn ? <><p>U bent ingelogd. Online en op dit apparaat bewaren zijn afzonderlijke handelingen.</p><div className="stack"><button className="button" disabled={cloudBusy} onClick={() => cloudAction("save")}>Bewaar online</button><button className="button secondary" disabled={cloudBusy} onClick={() => cloudAction("load")}>Laad online dossier</button><button className="plain" disabled={cloudBusy} onClick={() => cloudAction("logout")}>Uitloggen</button><details><summary>Online dossier verwijderen</summary><p>Dit verwijdert het online dossier definitief.</p><button className="plain danger" disabled={cloudBusy} onClick={() => cloudAction("delete")}>Verwijder online dossier</button></details></div></> : <form onSubmit={e => { e.preventDefault(); cloudAction("login"); }}><Field label="E-mailadres"><input type="email" value={email} required onChange={e => setEmail(e.target.value)}/></Field><button className="button secondary full" disabled={cloudBusy}>{emailSent ? "Stuur opnieuw een inloglink" : "Stuur inloglink"}</button></form>}</div>
      <div className="card quiet"><h3>Uw keuzes blijven van u</h3><p>Geen automatische uitsluiting van regio’s. Harde eisen, voorkeuren en onbekende gegevens blijven onderscheiden.</p><small>De AI-assistent komt in V2.0. IF-abonnementen zijn nog niet gekoppeld; dit is een testomgeving.</small><button className="plain danger" onClick={() => setResetPending(true)}>Wis dossier op dit apparaat</button></div>
      </aside></div>
      {message && <div className="message no-print" role="status"><span>{message}</span><button aria-label="Melding sluiten" onClick={() => setMessage("")}>×</button></div>}
      {importPending && <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="import-title"><h2 id="import-title">Dossier laden?</h2><p>Dit vervangt het dossier op dit scherm. Download eerst uw huidige dossier als u dat wilt behouden.</p><div className="actions"><button className="button" onClick={() => { setPlan(importPending); setActivePlace(""); setSelectedHouse(""); setImportPending(null); setMessage("Dossier geladen. Bewaar opnieuw om deze versie te behouden."); }}>Vervang huidig dossier</button><button className="plain" onClick={() => setImportPending(null)}>Annuleren</button><button className="plain" onClick={exportPlan}>Download huidig dossier</button></div></div></div>}
      {resetPending && <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="reset-title"><h2 id="reset-title">Dossier op dit apparaat wissen?</h2><p>Dit wist uw lokale opslag en begint een nieuw dossier. Een eventuele online versie blijft behouden.</p><div className="actions"><button className="button" onClick={() => { try { localStorage.removeItem(KEY); } catch {} setPlan(newPlan()); setActivePlace(""); setSelectedHouse(""); setResults([]); setResetPending(false); setMessage("Het dossier op dit apparaat is gewist."); }}>Wis lokaal dossier</button><button className="plain" onClick={() => setResetPending(false)}>Annuleren</button></div></div></div>}
      <footer><span>Infofrankrijk · Mijn woonplan Frankrijk</span><p>Een hulpmiddel voor verkenning en voorbereiding. Controleer uw bevindingen op de huizensite, bij de officiële bron en bij passende deskundigen.</p></footer>
    </main>
  </>;
}
