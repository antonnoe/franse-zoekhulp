import { propertyBudget, type Place, type SearchArea, type Wishes } from "./model";
export const portals = [
  { id: "leboncoin", name: "Leboncoin", home: "https://www.leboncoin.fr/recherche?category=9" },
  { id: "seloger", name: "SeLoger", home: "https://www.seloger.com/" },
  { id: "bienici", name: "Bien’ici", home: "https://www.bienici.com/" },
  { id: "pap", name: "PAP", home: "https://www.pap.fr/annonce/vente-immobiliere" },
  { id: "figaro", name: "Figaro Immobilier", home: "https://immobilier.lefigaro.fr/" },
  { id: "ouest", name: "Ouest-France Immo", home: "https://www.ouestfrance-immo.com/" }
] as const;
export function portalLinks(place: Place | undefined, wishes: Wishes, searchArea?: SearchArea) {
  const supported = place?.code === "66049" && wishes.propertyType === "Huis";
  const price = Math.floor(propertyBudget(wishes)), area = Math.ceil(wishes.minArea);
  if (!place || price <= 0) return portals.map(p => ({ ...p, url: p.home, prepared: false, radiusPrepared: false, note: "Stel plaats, type, budget, oppervlakte en straal zelf in." }));
  const links = {
    leboncoin: `https://www.leboncoin.fr/recherche?category=9&locations=C%C3%A9ret_66400__42.4851_2.74987_5000&square=${area}-max&price=min-${price}&real_estate_type=1`,
    seloger: `https://www.seloger.com/classified-search?distributionTypes=Buy&estateTypes=House&locations=AD08FR27591&method=form&priceMax=${price}&spaceMin=${area}`,
    bienici: `https://www.bienici.com/recherche/achat/ceret-66400/maisonvilla?prix-max=${price}&surface-min=${area}`,
    pap: `https://www.pap.fr/annonce/vente-maisons-ceret-66400-g34362-jusqu-a-${price}-euros-a-partir-de-${area}-m2`,
    figaro: `https://immobilier.lefigaro.fr/annonces/immobilier-vente-maison-ceret+66400.html?priceMax=${price}&areaMin=${area}`,
    ouest: `https://www.ouestfrance-immo.com/acheter/maison/ceret-66-66400/?prix=0_${price}&surface=${area}_0`
  };
  const family = wishes.propertyType === "Appartement" ? "apartment" : wishes.propertyType === "Anders" ? null : "house";
  const radius = searchArea?.radiusKm ?? wishes.radiusKm;
  const slug = place.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const canPrepare = !!family && /^\d{5}$/.test(place.postcode) && !!slug;
  return portals.map(p => {
    // Preserve the original six tested Céret links for the original manual route.
    if (supported && !searchArea) return { ...p, url: links[p.id], prepared: true, radiusPrepared: false,
      note: "Oorspronkelijke Céret-testlink. De geselecteerde verkenningsstraal gaat niet mee; controleer de portalstraal." };
    if (canPrepare && p.id === "leboncoin") {
      // Portal UI confirmed 0, 1 and 20 km. Never imply support for an unverified radius.
      const radiusPrepared = [0, 1, 20].includes(radius);
      const location = `${place.name}_${place.postcode}__${place.lat}_${place.lon}_5000${radiusPrepared ? `_${radius * 1000}` : ""}`;
      const url = new URL("https://www.leboncoin.fr/recherche");
      for (const [k, v] of Object.entries({ category: "9", locations: location, square: `${area}-max`, price: `min-${price}`, real_estate_type: family === "house" ? "1" : "2" })) url.searchParams.set(k, v);
      return { ...p, url: url.href, prepared: true, radiusPrepared,
        note: `${radiusPrepared ? `Plaats en straal ${radius} km voorbereid.` : `Plaats voorbereid; stel de gewenste ${radius} km zelf in.`} ${family === "house" && wishes.propertyType !== "Huis" ? `Zoekt breed op huizen; stijl ${wishes.propertyType} zelf controleren.` : "Controleer de actieve filters."}` };
    }
    if (canPrepare && p.id === "bienici") return { ...p,
      url: `https://www.bienici.com/recherche/achat/${slug}-${place.postcode}/${family === "house" ? "maisonvilla" : "appartement"}?prix-max=${price}&surface-min=${area}`,
      prepared: true, radiusPrepared: false,
      note: `Plaats, ${family === "house" ? "huis" : "appartement"}, prijs en oppervlakte voorbereid. Straal ${radius} km en eventuele woningstijl zelf instellen.` };
    if (supported) return { ...p, url: links[p.id], prepared: true, radiusPrepared: false, note: `Céret, huis, prijs en oppervlakte voorbereid. Straal ${radius} km zelf instellen.` };
    return { ...p, url: p.home, prepared: false, radiusPrepared: false, note: `Gebruik de Franse zoekomschrijving en stel de filters zelf in op de site. Gewenste straal: ${radius} km.` };
  });
}
const frenchTypes: Record<Wishes["propertyType"], string> = { Huis: "maison", Appartement: "appartement", Ferme: "ferme", "Maison de maître": "maison de maître", Longère: "longère", Mas: "mas", Dorpshuis: "maison de village", Anders: "logement" };
export function frenchBrief(place: Place | undefined, w: Wishes, searchArea?: SearchArea) {
  const radius = searchArea?.radiusKm ?? w.radiusKm;
  return `Je recherche à acheter ${frenchTypes[w.propertyType]}${place ? ` à ${place.name} (${place.postcode})` : " en France"}. Budget maximum pour le bien : ${propertyBudget(w).toLocaleString("fr-FR")} €. Surface habitable minimum : ${w.minArea} m².${w.minLand ? ` Terrain minimum : ${w.minLand} m².` : ""} Secteur souhaité : ${radius === 0 ? "uniquement dans cette commune" : `dans un rayon de ${radius} km`} (à vérifier sur le portail).${w.accessibility ? " Accessibilité sans escalier souhaitée." : ""}`;
}
