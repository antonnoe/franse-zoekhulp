# Koppelingen en bronnen

| Koppeling | Officiële bron / bestaande tool | Actualisatiedatum of controle |
| --- | --- | --- |
| API Géo | https://geo.api.gouv.fr/decoupage-administratif/communes | Documentatie geraadpleegd 13-10-2026 |
| IGN routes | https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/calcul-itineraire/ | 14-09-2026 |
| INSEE-dichtheid | https://www.insee.fr/fr/information/8571524 | 06-05-2026; bestand geografie 01-01-2026 |
| Voorzieningen | https://www.insee.fr/fr/metadonnees/source/operation/s2278/bases-donnees-ligne | 12-10-2026 |
| FINESS Structures | https://www.data.gouv.fr/datasets/finess-structures-1 | Dagelijks; geraadpleegd 13-10-2026 |
| FINESS Activités | https://www.data.gouv.fr/datasets/finess-activites-1 | Dagelijks; geraadpleegd 13-10-2026 |
| DVF | https://www.data.gouv.fr/datasets/demandes-de-valeurs-foncieres | 07-04-2026 |
| Géorisques-token | https://www.georisques.gouv.fr/inscription | Geraadpleegd 13-10-2026; v2-token vereist |
| Klimaat | https://www.drias-climat.fr/accompagnement/section/401 | Geraadpleegd 13-10-2026 |
| Internet | https://internetverbinding.vercel.app/ | Bestaande app; adres en resultaat niet automatisch overgedragen |
| Aankoopgids | https://infofrankrijk.com/gids-huis-kopen-frankrijk/ | Gevonden in IF-zoekresultaat 13-10-2026; directe pagina-opvraging niet bevestigd |
| Klussen | https://infofrankrijk.com/klussen/ | Pagina geraadpleegd 13-10-2026 |

## Checklist

Exacte URL nog niet vastgesteld. Stel NEXT_PUBLIC_IF_CHECKLIST_URL in op Vercel als de juiste link bekend is. Zonder configuratie heet de knop expliciet 'Zoek de bestaande checklist op Infofrankrijk' en opent zij de IF-zoekpagina. Er wordt geen bestaand artikel herschreven.

## Portal-links

De ongewijzigde live-fixtures van 12-10-2026 staan in tests/live-fixtures.json. De oorspronkelijke zes Céret-links blijven beschikbaar. De regio-overdracht is uitgebreid met locatie/coördinaten en een afzonderlijke straal bij Leboncoin, en plaats/type/prijs/oppervlakte bij Bien'ici. Tours is op 13-10-2026 gecontroleerd. Per portal is aangegeven wat is voorbereid en wat handmatig nodig is. Specifieke woningstijlen krijgen een duidelijk gemarkeerde brede huizenzoekopdracht. Zie docs/regioverkenning.md voor de grenzen van straal- en locatiemapping.

## Supabase en IF-abonnement

Online dossiers gebruiken Supabase Auth en RLS per gebruiker. Deze login is nog geen IF-abonnementscontrole. V1 is voorlopig vrij toegankelijk. Bouw pas een betaalde toegang nadat de IF-membershipplugin en server-side verificatie zijn bepaald; een verborgen knop of lokaal premiumveld is geen beveiliging.

## V2.0: AI zonder leveranciersafhankelijkheid

V1 bevat geen AI-SDK, agentmodel, API-sleutel of betaalde aanroep. In V2 komt een adapter met een intern gegevenscontract; prompts, bronnen, woonplannen en geschiedenis blijven eigendom van deze toepassing. Beoordeling blijft in vaste regels; leveranciersspecifieke code blijft buiten schermen en dossiermodel.
