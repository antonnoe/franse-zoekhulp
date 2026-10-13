import { z } from "zod";

export const settlementOptions = [
  { value: "urban", label: "Stedelijk", text: "Wonen in een stad, met voorzieningen dichtbij." },
  { value: "suburban", label: "Stadsrand", text: "Buiten de stad, met verbinding naar een stedelijke kern." },
  { value: "rural", label: "Landelijk", text: "Een dorp of buitengebied; afstand tot voorzieningen telt mee." },
  { value: "hybrid", label: "Rust nabij voorzieningen", text: "Een combinatie van een rustige woonplek en een bereikbare levendige kern." }
] as const;
export const propertyTypes = ["Huis", "Appartement", "Ferme", "Maison de maître", "Longère", "Mas", "Dorpshuis", "Anders"] as const;
export const statuses = ["Nog bekijken", "Bezichtiging", "In overweging", "Afgevallen", "Gekocht"] as const;
const amount = z.number().finite().min(0).max(100000000);
const choice = z.enum(["voorkeur", "eis"]);
export const wishesSchema = z.object({
  settlement: z.array(z.enum(["urban", "suburban", "rural", "hybrid"])).max(4),
  origin: z.string().max(160), travelMode: z.enum(["auto", "trein-vliegtuig", "flexibel"]),
  maxTravelHours: z.number().min(1).max(48), hospitalMinutes: z.number().min(5).max(180), hospitalPriority: choice,
  fibrePriority: z.enum(["niet-nodig", "voorkeur", "eis"]), winterLife: z.boolean(),
  climate: z.enum(["geen", "matig", "weinig"]), riskTolerance: z.enum(["onderzoeken", "vermijd-hoog"]),
  notes: z.string().max(5000), propertyType: z.enum(propertyTypes), budget: amount,
  purchaseReserve: amount, renovationReserve: amount, minArea: z.number().min(1).max(10000),
  minLand: z.number().min(0).max(10000000), accessibility: z.boolean(), renovation: z.enum(["instapklaar", "beperkt", "veel"]),
  radiusKm: z.number().min(0).max(100)
}).strict().refine(w => w.purchaseReserve + w.renovationReserve < w.budget, {
  message: "Het totaalbudget moet hoger zijn dan de reserves voor aankoopkosten en renovatie.", path: ["budget"]
});
export type Wishes = z.infer<typeof wishesSchema>;
export const initialWishes: Wishes = {
  settlement: ["hybrid"], origin: "", travelMode: "flexibel", maxTravelHours: 9,
  hospitalMinutes: 20, hospitalPriority: "voorkeur", fibrePriority: "voorkeur", winterLife: true,
  climate: "matig", riskTolerance: "onderzoeken", notes: "", propertyType: "Huis", budget: 350000,
  purchaseReserve: 25000, renovationReserve: 25000, minArea: 120, minLand: 0,
  accessibility: false, renovation: "beperkt", radiusKm: 20
};
export const placeSchema = z.object({
  code: z.string().regex(/^(?:\d{5}|2[AB]\d{3})$/), name: z.string().min(1).max(160),
  postcode: z.string().max(5), department: z.string().max(160),
  lon: z.number().min(-180).max(180), lat: z.number().min(-90).max(90),
  population: z.number().nonnegative().nullable(), density: z.number().int().min(1).max(7).nullable(),
  densityLabel: z.string().max(200).nullable()
});
export type Place = z.infer<typeof placeSchema>;
export const houseSchema = z.object({
  id: z.string().uuid(), title: z.string().max(200), url: z.string().max(2000).refine(s => !s || safeUrl(s) !== null, "Gebruik een volledige http(s)-link."),
  placeCode: z.string().max(5), address: z.string().max(300), propertyType: z.enum(propertyTypes).nullable(),
  price: amount.nullable(), area: z.number().min(1).max(10000).nullable(), land: amount.nullable(),
  dpe: z.enum(["A", "B", "C", "D", "E", "F", "G"]).nullable(), feesIncluded: z.enum(["ja", "nee", "onbekend"]),
  annualTax: amount.nullable(), hospitalMinutes: z.number().min(0).max(600).nullable(),
  internet: z.enum(["onbekend", "gecontroleerd", "niet-passend"]), internetDate: z.string().max(10),
  riskCheck: z.enum(["onbekend", "gecontroleerd", "aandacht"]), riskDate: z.string().max(10),
  advert: z.string().max(30000), notes: z.string().max(10000), status: z.enum(statuses),
  questions: z.array(z.string().max(200)).max(50), completed: z.array(z.string().max(200)).max(100),
  purchaseDone: z.array(z.string().max(100)).max(20), createdAt: z.string().datetime()
});
export type House = z.infer<typeof houseSchema>;
export const planSchema = z.object({ version: z.literal(1), wishes: wishesSchema, places: z.array(placeSchema).max(20), houses: z.array(houseSchema).max(50) }).strict();
export type Plan = z.infer<typeof planSchema>;
export function newPlan(): Plan { return { version: 1, wishes: { ...initialWishes, settlement: [...initialWishes.settlement] }, places: [], houses: [] }; }
export function newHouse(): House {
  return { id: crypto.randomUUID(), title: "", url: "", placeCode: "", address: "", propertyType: null, price: null, area: null, land: null,
    dpe: null, feesIncluded: "onbekend", annualTax: null, hospitalMinutes: null, internet: "onbekend", internetDate: "",
    riskCheck: "onbekend", riskDate: "", advert: "", notes: "", status: "Nog bekijken", questions: [], completed: [], purchaseDone: [], createdAt: new Date().toISOString() };
}
export function safeUrl(value: string): string | null {
  try { const u = new URL(value); return ["http:", "https:"].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; }
}
export function propertyBudget(w: Wishes): number { return Math.max(0, w.budget - w.purchaseReserve - w.renovationReserve); }
export function euro(n: number | null): string { return n === null ? "Onbekend" : new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n); }
