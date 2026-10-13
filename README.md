# Franse Zoekhulp — Mijn woonplan Frankrijk

Next.js App Router + TypeScript, voorbereid op Supabase, voor Infofrankrijk. V1.0 zonder AI. De bestaande Sites-test blijft onaangeroerd.

## Wat werkt

- Zeven verbonden stappen: plaatsverkenning, woningwensen, Zoekhulp, handmatige vergelijking, werkchecklist, aankoopvoortgang en klussen.
- Franse gemeentezoeker via API Géo; geografische omgeving en lokale autoroutes via IGN.
- Officiële INSEE-dichtheidsindeling voor 34.875 gemeenten, met bron, geografie en importdatum; handmatige vernieuwingsactie in GitHub Actions.
- Regioverkenning op woonomgeving en geregistreerde dagelijkse voorzieningen (BPE 2025, 34.873 gemeenten), landelijk of rond een bewaarde plaats. Kandidaten gaan met hun straal en onderbouwing naar de Zoekhulp; zoekgebieden worden mee opgeslagen en geëxporteerd.
- Eigen woonplan met kandidaatplaatsen, maximaal 50 woningen, oorspronkelijke advertentietekst en controles met datum.
- Bekende en onbekende gegevens apart; harde eisen worden niet afgezwakt tot voorkeuren.
- Zes geteste zoeklinks voor huizen in Céret, met aanpasbare vraagprijs en woonoppervlakte. Andere locaties/types: duidelijke handmatige portalzoekroute.
- Bewaren op eigen apparaat, downloaden/importeren en wissen. Geen automatische bewaring: klik op Bewaar.
- Optionele Supabase-login en cloudbewaring, met RLS; geen verplichte database om de route te gebruiken.
- Links naar bestaande IF-dossiers en internetcheck.

## Nog niet actief

FINESS, DVF-aggregaties, klimaatdata en Géorisques API worden nog niet automatisch ingelezen. BPE-tellingen en periurbane classificatie zijn aangesloten voor de eerste regioverkenning. Zorgtoegang, winteropening, internet op adres en andere ontbrekende criteria worden niet als bewezen match meegeteld. Zie docs/regioverkenning.md, docs/beoordelingsmatrix.md en docs/koppelingen.md. NL/BE-reistijden, alle-portal geografische mappings, abonnementstoegang en AI zijn niet aangesloten. De exacte IF-checklistlink moet nog worden ingesteld.

## Op Vercel zetten — klikken, geen code plakken

1. Open https://vercel.com/new en kies **Import Git Repository**.
2. Kies **antonnoe/franse-zoekhulp**.
3. Framework: **Next.js**. Root Directory: leeg / repository-root. Node.js: **22.x**.
4. Laat de standaard Next.js-buildinstellingen staan. Geen `dist`-map of statische export instellen.
5. Klik **Deploy**. Voor de basisversie zijn geen API-sleutels nodig.

De tool staat voorlopig op **noindex**. Dat is geen toegangsbeveiliging: een Vercel-URL is zonder aanvullende bescherming bereikbaar. De eerdere private Sites-toegang is niet onderdeel van deze app.

## Online dossiers aansluiten

1. Maak of kies een Supabase-project.
2. Open SQL Editor en voer het volledige bestand supabase/migrations/20261013_woonplannen.sql één keer uit.
3. Voeg in Vercel twee environment variables toe: NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Gebruik geen service-role key in de browser of repository.
4. Stel in Supabase Auth de Site URL en toegestane Redirect URL in op uw Vercel-/custom domein. Email-login met inloglink is vereist.
5. Redeploy in Vercel. Test aanmelden, bewaren, laden en verwijderen met twee aparte gebruikers om isolatie te controleren.

Alleen de twee genoemde NEXT_PUBLIC-variabelen zijn bewust publieke projectgegevens. De database beperkt dossiers via auth.uid() en RLS. IF-abonnementen zijn een afzonderlijke, nog te bouwen koppeling.

## Bestaande IF-links

NEXT_PUBLIC_IF_CHECKLIST_URL: exacte URL van de al bestaande bezichtigingschecklist.
NEXT_PUBLIC_IF_AANKOOP_URL: optionele override voor de bestaande aankoopgids.
Wijzig deze alleen via Vercel en redeploy; bestaande IF-content wordt niet aangepast.

## Controles

GitHub Actions voert typecontrole, betekenisvolle tests en een productiebuild uit bij push/PR. De tests toetsen onder meer ontbrekende informatie, harde eisen, budgetreserves, imports, API-validatie en alle zes originele portal-links. Installatie wordt vastgelegd in package-lock.json.

Browser- en visuele QA konden in deze werkomgeving niet worden uitgevoerd. Controleer de Vercel-preview op desktop en mobiel vóór publicatie op Infofrankrijk. Ook live Supabase-isolatie vereist een aangesloten project.

Voor ontwikkelaars: npm ci, npm run typecheck, npm test, npm run build. Node 22+. De fonts zijn Poppins en Mulish; hoofdkleur #800000; body line-height 1.8.

## Eigendom en opslag

Profielen en dossiers hebben een eigen, versieerbaar JSON-formaat. Een export blijft bruikbaar buiten de app. Advertenties worden alleen handmatig door de gebruiker ingevoerd; er is geen scraping, achtergrondagent of AI-verwerking. Online gegevens worden pas verzonden bij een expliciete login-/bewaarhandeling. De opslag op dit apparaat is niet geschikt als enige reservekopie.
