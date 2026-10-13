# Leefwensen → kandidaatgebieden → Zoekhulp

## Werkende keten

1. De gebruiker kiest stedelijk, stadsrand, landelijk en/of rust nabij voorzieningen.
2. De verkenner onderzoekt gemeenten in Europees Frankrijk of rond een bewaarde plaats. INSEE-dichtheid, periurbane indeling en officiële BPE-voorzieningentellingen vormen de eerste voorselectie.
3. Elke kandidaat bevat redenen, aandachtspunten, geregistreerde voorzieningen en expliciete onbekenden. Harde zorg- en interneteisen worden niet als voldaan weergegeven.
4. 'Zoek woningen rond …' bewaart het gemeentecentrum, de straal, de onderbouwing, de onbekenden en het selectieprofiel in Mijn woonplan. De knop opent stap 3.
5. De Zoekhulp combineert dat gebied met het woningtype, netto woningbudget en minimale oppervlakte uit stap 2. Het gekozen gebied en de straal zijn aanpasbaar. Een wijziging van profiel of straal toont dat herbeoordeling nodig is.
6. De Franse zoekomschrijving bevat dezelfde plaats, straal en woningwensen. Zij dient ook voor portals die niet alle filters kunnen overnemen.

## Selectieregels — geen totale leefkwaliteitsscore

- Stedelijk: INSEE-dichtheid 1, 2 of 3.
- Stadsrand: stedelijke randzone (4) of landelijk periurbaan in de kruisindeling met aires d'attraction des villes. De laatste classificatie betekent niet automatisch korte autoritten.
- Landelijk: INSEE-dichtheid 5, 6 of 7.
- Rust nabij voorzieningen: landelijk én een gemeente met geregistreerde boodschappenwinkels, bakker en apotheek binnen de gekozen straal. Dit is onze transparante redactionele proxy; het bewijst geen stilte of winteropening.

De afstand is hemelsbreed tussen gemeentecentra. Een kern telt pas mee als alle drie voorzieningencategorieën aantoonbaar geregistreerd zijn. De lokale zoektocht blijft binnen de gekozen straal. Landelijke voorbeelden worden gespreid over departementen en locaties; er worden maximaal acht getoond. Binnen vergelijkbare onderbouwing zijn naam en afstand ordeningscriteria, geen leefkwaliteitsoordeel. De verkenner biedt startpunten voor onderzoek, geen ranglijst van de ideale gebieden.

## Gegevens

- INSEE BPE 2025: publicatie 09-07-2026, geografie 01-01-2026, 34.873 gemeenten met bevestigde tellingendekking.
- Dichtheidswerkboek: publicatie in het werkboek 15-05-2026, geografie 01-01-2026; 34.875 classificaties.
- API Géo voor naam, postcode, bevolking en gemeentecentrum.
- INSEE-code is de join-sleutel. Ontbrekende gemeenten of niet-beschikbare observaties worden niet naar nul geconverteerd.
- Boodschappenwinkels: B105, B201, B202. Bakker: B207. Apotheek: D307. Huisartspraktijklocaties: D265. B101, B102, B203 en D201 zijn oudere codes en worden niet gebruikt.
- D101/D106 worden als historische registratietelling geïmporteerd, maar leveren geen reistijd, bewijs van beschikbare zorg of automatisch voldane medische eis.

Iedere snapshot bewaart bron-URL, publicatiedatum, geografiedatum, importdatum en SHA256 van het officiële archief. De handmatige GitHub-actie 'Regioverkenning - officiële gegevens vernieuwen' valideert schema en landelijke dekking voordat een snapshot wordt vervangen. Bij download- of schemafouten blijft de bestaande snapshot behouden.

## Portal-overdracht

Leboncoin: openbare locatie/coördinaten plus aparte straalcomponent. De vijfde numerieke locatiecomponent is niet de geselecteerde straal. De straal volgt als afzonderlijke zesde component; dit is via de portal-UI vastgesteld in Tours op 13-10-2026 (20 km). Alleen expliciet gecontroleerde straalwaarden 0, 1 en 20 km worden als overgenomen aangeduid; andere waarden vragen handmatige instelling. De portal kan advertenties en suggesties buiten filters tonen.

Bien'ici: plaats/postcode, algemene woningcategorie, prijs en minimale oppervlakte. Tours is op 13-10-2026 gecontroleerd. Straal niet automatisch overgenomen. Specifieke woningstijlen blijven een controlepunt bij een algemene huizenzoekopdracht.

SeLoger/PAP hebben portalspecifieke locatie-ID's. Daar worden geen INSEE-codes voor ingevuld. Buiten de oorspronkelijke Céret-configuratie openen zij zonder voorbereide filters, net als de andere nog niet uitgebreid geteste portals. De originele zes Céret-testlinks blijven behouden voor de bestaande handmatige route.

## Niet getoetst

Ziekenhuisreistijd en actuele zorgtoegang, glasvezel op woningadres, winteropening, klimaat/hitte, reis vanaf NL/BE, perceelrisico's en regionale betaalbaarheid. Zij blijven zichtbaar als onbekend of nader onderzoek. Wijziging van een ziekenhuisgrens kan dus onderzoekstekst wijzigen zonder de ruimtelijke voorbeelden te veranderen. Pas met de juiste volgende databronnen worden deze wensen selectiecriteria.

V1 bevat geen AI. Het bestaande versie-1 dossierformaat krijgt een optioneel searchAreas-veld met standaard lege lijst, zodat eerdere exports blijven laden.
