# CLAUDE.md

Repo: franse-zoekhulp

## Wat dit is

Franse Zoekhulp, "Mijn woonplan Frankrijk", voor Infofrankrijk: een woonroute in zeven stappen (plaatsverkenning, woningwensen, Zoekhulp, handmatige vergelijking, werkchecklist, aankoopvoortgang, klussen) met regioverkenning op officiële gegevens. Versie 1.0 zonder AI. De bestaande Sites-test blijft onaangeroerd.

## Live adres

Niet in de repo vastgelegd. De README beschrijft het deployen op Vercel (project antonnoe/franse-zoekhulp) zonder een adres te noemen. De tool staat voorlopig op noindex (`robots` in `app/layout.tsx`).

## Opbouw

- `app/`: layout.tsx, page.tsx, globals.css; API-routes `app/api/nearby`, `places`, `regions`, `travel`
- `components/`: region-explorer.tsx, woonplan.tsx
- `lib/`: assessment, cloud (Supabase), geography, model, portals, public-data, region-contract, region-engine, resources
- `data/`: density.json (INSEE-dichtheid) en region-data.json (BPE-voorzieningen), vernieuwd door scripts
- `scripts/`: import-density.py en import-region-data.py (Python, openpyxl)
- `supabase/migrations/20261013_woonplannen.sql`: tabel woonplannen met RLS
- `tests/`: api, regions en woonplan tests met fixtures
- `docs/`: beoordelingsmatrix.md, koppelingen.md, regioverkenning.md

## Techniek

Next.js 16 (App Router, build met `next build --webpack`), React 19, TypeScript, Zod, `@supabase/supabase-js`. Node 22 of hoger. Scripts: `npm run dev`, `build`, `start`, `typecheck`, `test` (node:test met tsx). Fonts Poppins en Mulish, hoofdkleur #800000.

## Externe diensten en namen van omgevingsvariabelen

- Vercel (hosting), Supabase (optionele login met inloglink en cloudbewaring met RLS), API Géo, IGN (routes en omgeving), INSEE (dichtheid en BPE), links naar Infofrankrijk-dossiers en de internetcheck (https://internetverbinding.vercel.app/)
- Variabelen, alle optioneel en publiek: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_IF_CHECKLIST_URL`, `NEXT_PUBLIC_IF_AANKOOP_URL`
- Geen service-role key in de browser of repository

## Hoe het live gaat

Import van de GitHub-repo in Vercel als Next.js, repository-root, Node 22.x, standaard buildinstellingen. Wijzigingen aan de variabelen alleen via Vercel, daarna redeploy. GitHub Actions: `ci.yml` (typecheck, tests en productiebuild bij push en pull request), `refresh-density.yml` en `refresh-regions.yml` (alleen handmatig, downloaden het officiële werkboek, controleren het schema en bewaren een snapshot in `data/`).

## Regels en besluiten

Bron: README.md en docs/.

- Bekende en onbekende gegevens apart; harde eisen worden niet afgezwakt tot voorkeuren.
- Geen scraping, achtergrondagent of AI-verwerking: advertenties worden alleen handmatig ingevoerd. Online gegevens worden pas verzonden bij een expliciete login- of bewaarhandeling.
- Geen automatische bewaring: de gebruiker klikt op Bewaar. De opslag op het apparaat is niet geschikt als enige reservekopie.
- Profielen en dossiers hebben een eigen, versieerbaar JSON-formaat dat buiten de app bruikbaar blijft.
- Geen totale leefkwaliteitsscore en geen ranglijst: de regioverkenner biedt startpunten voor onderzoek. Zorgtoegang, winteropening, internet op adres en andere ontbrekende criteria tellen niet als bewezen match (docs/regioverkenning.md).
- Elke databron-adapter levert meetwaarde, eenheid, bron-URL, actualisatiedatum, controledatum, geografisch niveau en ontbrekende gegevens. Gemeentecentra worden nooit ongemerkt woningadressen. Geen generieke regio-uitsluitingen op één departementgemiddelde (docs/beoordelingsmatrix.md).
- Betaalde toegang pas bouwen na server-side verificatie via de IF-membershipplugin, een verborgen knop of lokaal premiumveld is geen beveiliging (docs/koppelingen.md).
- De Supabase-login is geen IF-abonnementscontrole. V1 is voorlopig vrij toegankelijk.
- Een eventuele latere AI-laag komt in een adapter zonder leveranciersafhankelijkheid, beoordeling blijft in vaste regels (docs/koppelingen.md).
- Nog niet aangesloten: FINESS, DVF, klimaatdata, Géorisques, NL/BE-reistijden, abonnementstoegang en AI.

Laatst nagelopen: 5 november 2026
