import { propertyBudget, type Place, type Wishes } from "./model";
export const portals = [
  { id: "leboncoin", name: "Leboncoin", home: "https://www.leboncoin.fr/recherche?category=9" },
  { id: "seloger", name: "SeLoger", home: "https://www.seloger.com/" },
  { id: "bienici", name: "Bien’ici", home: "https://www.bienici.com/" },
  { id: "pap", name: "PAP", home: "https://www.pap.fr/annonce/vente-immobiliere" },
  { id: "figaro", name: "Figaro Immobilier", home: "https://immobilier.lefigaro.fr/" },
  { id: "ouest", name: "Ouest-France Immo", home: "https://www.ouestfrance-immo.com/" }
] as const;
export function portalLinks(place: Place | undefined, wishes: Wishes) {
  const supported = place?.code === "66049" && wishes.propertyType === "Huis";
  const price = Math.floor(propertyBudget(wishes)), area = Math.ceil(wishes.minArea);
  if (!supported || price <= 0) return portals.map(p => ({ ...p, url: p.home, prepared: false }));
  const links = {
    leboncoin: `https://www.leboncoin.fr/recherche?category=9&locations=C%C3%A9ret_66400__42.4851_2.74987_5000&square=${area}-max&price=min-${price}&real_estate_type=1`,
    seloger: `https://www.seloger.com/classified-search?distributionTypes=Buy&estateTypes=House&locations=AD08FR27591&method=form&priceMax=${price}&spaceMin=${area}`,
    bienici: `https://www.bienici.com/recherche/achat/ceret-66400/maisonvilla?prix-max=${price}&surface-min=${area}`,
    pap: `https://www.pap.fr/annonce/vente-maisons-ceret-66400-g34362-jusqu-a-${price}-euros-a-partir-de-${area}-m2`,
    figaro: `https://immobilier.lefigaro.fr/annonces/immobilier-vente-maison-ceret+66400.html?priceMax=${price}&areaMin=${area}`,
    ouest: `https://www.ouestfrance-immo.com/acheter/maison/ceret-66-66400/?prix=0_${price}&surface=${area}_0`
  };
  return portals.map(p => ({ ...p, url: links[p.id], prepared: true }));
}
const frenchTypes: Record<Wishes["propertyType"], string> = { Huis: "maison", Appartement: "appartement", Ferme: "ferme", "Maison de maître": "maison de maître", Longère: "longère", Mas: "mas", Dorpshuis: "maison de village", Anders: "logement" };
export function frenchBrief(place: Place | undefined, w: Wishes) {
  return `Je recherche à acheter ${frenchTypes[w.propertyType]}${place ? ` à ${place.name} (${place.postcode})` : " en France"}. Budget maximum pour le bien : ${propertyBudget(w).toLocaleString("fr-FR")} €. Surface habitable minimum : ${w.minArea} m².${w.minLand ? ` Terrain minimum : ${w.minLand} m².` : ""} Secteur souhaité : dans un rayon de ${w.radiusKm} km (à définir sur le portail).${w.accessibility ? " Accessibilité sans escalier souhaitée." : ""}`;
}
