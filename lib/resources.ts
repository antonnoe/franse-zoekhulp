import { safeUrl } from "./model";
const base = "https://infofrankrijk.com";
export const resources = {
  internet: "https://internetverbinding.vercel.app/",
  internetArticle: `${base}/internet-internetverbinding/`,
  risks: "https://www.georisques.gouv.fr/",
  dvf: "https://app.dvf.etalab.gouv.fr/",
  purchase: safeUrl(process.env.NEXT_PUBLIC_IF_AANKOOP_URL || "") || `${base}/gids-huis-kopen-frankrijk/`,
  checklist: safeUrl(process.env.NEXT_PUBLIC_IF_CHECKLIST_URL || "") || `${base}/?s=bezichtigingschecklist`,
  checklistConfigured: !!safeUrl(process.env.NEXT_PUBLIC_IF_CHECKLIST_URL || ""),
  renovation: `${base}/klussen/`,
  hub: `${base}/la-maison/`,
  health: "https://www.sante.fr/"
};
export const purchaseSteps = ["Voorbereiding", "Zoeken en verkennen", "Bezichtigingen", "Bod en compromis", "Tot de akte", "Overdracht", "Na de aankoop"];
