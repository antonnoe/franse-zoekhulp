# V1.0: beoordelingsmatrix

V1 bevat geen AI, scraping of aankoopadvies. Wensen zijn aanpasbaar. Geen percentagematch die onbekende data als nul of passend verwerkt. Een expliciete harde eis blijft zichtbaar wanneer zij afwijkt of onbekend is.

| Wens | Meetwijze | Bron | Status in deze versie |
| --- | --- | --- | --- |
| Plaats en omgeving | Gemeente, postcode, coördinaten; straal tussen gemeentecentra | API Géo | API aangesloten; uitval geeft foutmelding |
| Stedelijk / landelijk | Officiële 7-delige gemeentelijke dichtheid | INSEE, werkboek 15-05-2026; geografie 01-01-2026 | 34.875 officiële indelingen geïmporteerd; geen afleiding uitsluitend uit inwoners of inwoners/km² |
| Stadsrand / hybride | Periurbane indeling + geregistreerde voorzieningen binnen hemelsbrede straal tussen gemeentecentra | INSEE BPE + dichtheidsindeling | Aangesloten als verklaarbare eerste voorselectie; geen bewezen woonkwaliteit of rijtijd |
| Ziekenhuis | Gewenste type zorg + reistijd naar een concrete instelling | FINESS Structures en Activités + IGN | FINESS-import nog niet aangesloten; handmatige woningcontrole. Instelling ≠ zorgtoegang |
| Lokale reistijd | Autoroute tussen de gekozen gemeentecentra | IGN, documentatie 14-09-2026 | API aangesloten; zonder verkeersdrukte |
| NL/BE bereikbaarheid | Reis vanaf exact vertrekpunt, gekozen vervoerswijze | Grensoverschrijdend route-/reissysteem | Voorkeur opgeslagen; integratie nog te kiezen |
| Winterleven | Voorzieningen plus opening/activiteit buiten seizoen | INSEE BPE + verkenning ter plekke | BPE-tellingen geïmporteerd; winteropening blijft onbekend |
| Hitte | Frequentie hete dagen/nachten, periode en toekomsthorizon | DRIAS/Météo-France | Voorkeur opgeslagen; klimaatimport nog niet aangesloten |
| Internet | Exact adres en gewenste technologie, controle met datum | Bestaande IF-internettool / ARCEP | Uitgaande link en handmatige registratie; geen automatische resultaatuitwisseling |
| Natuurlijke risico's | Afzonderlijke typen blootstelling op adres/perceel | Géorisques | Uitgaande link en handmatige controle; API v2 niet aangesloten |
| Prijsniveau regio | Woningtype, verkochte woningen, periode, steekproef en beperkingen | DVF / DGFiP, 07-04-2026 | Uitgaande bronlink; automatische regioaggregatie nog niet aangesloten |
| Woningbudget | Totaal min door gebruiker opgegeven reserves | Eigen invoer | Berekening aangesloten; geen schatting van daadwerkelijke aankoopkosten |
| Woningvergelijking | Vraagprijs, oppervlakte, type, perceel, eigen controles | Eigen advertentie-invoer | Functioneel; onbekend telt niet als passend |

## Bronprincipes

Elke latere databron-adapter levert meetwaarde, eenheid, bron-URL, actualisatiedatum, controledatum, geografisch niveau en ontbrekende gegevens. Gemeentecentra mogen nooit ongemerkt woningadressen worden. Geen generieke regio-uitsluitingen op één departementgemiddelde. Risicocontrole uitgevoerd betekent niet risicovrij.

FINESS: gebruik de nieuwe dagelijkse JSON-fluxen; de oude extractie is sinds mei 2026 niet meer bijgewerkt. Controleer actieve structuren en koppel activiteiten. DRIAS vereist gekozen horizon/scenario en een downloadaccount. DVF bevat niet alle gebieden en elke transactie vertegenwoordigt niet automatisch één woning: splitsingen en meervoudige percelen vragen opschoning.

V1.0 is de werkende woonroute met plaatsverkenning en handmatige controles. De uitgebreide datagedreven kandidaatregioselectie wordt pas als actief aangeboden nadat imports en meetmethoden zijn aangesloten en getest.
