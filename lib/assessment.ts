import { propertyBudget, type House, type Wishes } from "./model";
export type Check = { key: string; label: string; status: "past" | "wijkt-af" | "onbekend"; note: string; hard: boolean };
export function assessHouse(h: House, w: Wishes): Check[] {
  const numeric = (key: string, label: string, value: number | null, pass: (n: number) => boolean, note: string, hard = false): Check =>
    ({ key, label, status: value === null ? "onbekend" : pass(value) ? "past" : "wijkt-af", note, hard });
  const checks: Check[] = [
    numeric("price", "Vraagprijs", h.price, n => n <= propertyBudget(w), "Getoetst aan uw woningbudget na de opgegeven reserves.", true),
    numeric("area", "Woonoppervlakte", h.area, n => n >= w.minArea, "Op basis van de door u ingevulde oppervlakte.", true),
    { key: "type", label: "Woningtype", status: h.propertyType === null ? "onbekend" : h.propertyType === w.propertyType ? "past" : "wijkt-af", note: "Uw eigen invoer; controleer de omschrijving bij de verkoper.", hard: false }
  ];
  if (w.minLand > 0) checks.push(numeric("land", "Perceel", h.land, n => n >= w.minLand, "Door u ingevulde perceeloppervlakte.", true));
  checks.push(numeric("hospital", "Reistijd ziekenhuis", h.hospitalMinutes, n => n <= w.hospitalMinutes, "Door u gecontroleerde reistijd; geen bewijs van beschikbare zorg.", w.hospitalPriority === "eis"));
  if (w.fibrePriority !== "niet-nodig") checks.push({ key: "internet", label: "Internet", status: h.internet === "onbekend" ? "onbekend" : h.internet === "gecontroleerd" ? "past" : "wijkt-af", note: "Uw handmatige adrescontrole. Vermeld controledatum en details in de notities.", hard: w.fibrePriority === "eis" });
  checks.push({ key: "risks", label: "Risicocontrole", status: h.riskCheck === "onbekend" ? "onbekend" : h.riskCheck === "aandacht" ? "wijkt-af" : "past", note: "Gecontroleerd betekent dat u de controle heeft uitgevoerd; het betekent niet risicovrij.", hard: false });
  return checks;
}
export function summary(checks: Check[]) {
  return { fits: checks.filter(c => c.status === "past").length, unknown: checks.filter(c => c.status === "onbekend").length,
    differences: checks.filter(c => c.status === "wijkt-af").length,
    hardFail: checks.some(c => c.hard && c.status === "wijkt-af"), hardUnknown: checks.some(c => c.hard && c.status === "onbekend") };
}
export function visitQuestions(h: House, w: Wishes): { id: string; text: string; group: string }[] {
  const questions = [
    { id: "ddt", text: "Vraag de beschikbare diagnoses en hun data op; noteer wat ontbreekt.", group: "Documenten" },
    { id: "roof", text: "Welke werkzaamheden zijn aan dak en constructie uitgevoerd? Vraag bewijs en facturen.", group: "Woning" },
    { id: "moisture", text: "Zijn er vochtplekken, scheuren of eerdere schades? Vraag naar oorzaak en herstel.", group: "Woning" },
    { id: "drainage", text: "Is er rioolaansluiting of individuele afvalwaterzuivering? Vraag het bijbehorende controlerapport.", group: "Woning" },
    { id: "servitudes", text: "Welke erfdienstbaarheden, toegangsrechten en gebruiksbeperkingen gelden er?", group: "Documenten" },
    { id: "winter", text: "Bezoek de omgeving op andere momenten en vraag naar voorzieningen en activiteit in de winter.", group: "Omgeving" },
    { id: "risks", text: "Controleer het juiste adres of perceel bij Géorisques; bespreek eventuele aandachtspunten.", group: "Omgeving" }
  ];
  if (h.dpe === null) questions.push({ id: "dpe", text: "Wat is het DPE-label? Vraag het volledige rapport en de datum.", group: "Documenten" });
  if (h.feesIncluded !== "ja") questions.push({ id: "fees", text: "Welke makelaarskosten zijn inbegrepen en wie betaalt ze?", group: "Budget" });
  if (h.annualTax === null) questions.push({ id: "tax", text: "Vraag het laatste aanslagbiljet taxe foncière op.", group: "Budget" });
  if (w.fibrePriority !== "niet-nodig") questions.push({ id: "internet", text: "Controleer internet op het exacte adres via de bestaande IF-internettool.", group: "Omgeving" });
  if (w.accessibility) questions.push({ id: "access", text: "Zijn entree, slaapkamer, badkamer en dagelijkse voorzieningen toegankelijk zonder trap?", group: "Woning" });
  questions.push({ id: "health", text: `Controleer de reistijd naar passende ziekenhuiszorg (uw wens: maximaal ${w.hospitalMinutes} minuten).`, group: "Omgeving" });
  return [...questions, ...h.questions.map((text, i) => ({ id: `own-${i}`, text, group: "Eigen vragen" }))];
}
