# Pool Tables Manager - Gebruikershandleiding

## Welkom bij Pool Tables Manager

Pool Tables Manager is een complete oplossing voor het beheren van de dagelijkse activiteiten van een biljartzaal. Deze handleiding helpt je alle functies van de applicatie te begrijpen en te gebruiken.

---

## Aan de slag

### De applicatie openen

Open je webbrowser en ga naar `http://localhost:3000` (of het adres van je server).

De eerste keer wordt je gevraagd een lokaal beheerderswachtwoord in te stellen (of in te loggen als er al een wachtwoord/OIDC is geconfigureerd). Na het inloggen toont het dashboard al je tafels, gegroepeerd per type.

### Hoofdmenu

De koptekst bevat drie onderdelen, plus de themaknop en een knop om uit te loggen:

- **Dashboard** - Live tafels, sessies en openstaande bestellingen
- **Beheer** - Menu, tafelvoorraad, abonnementen, rapporten en instellingen
- **Openbare status** - Opent het beschikbaarheidsbord voor klanten in een nieuw tabblad (inloggen is niet nodig)
- **Help** - De gebruikershandleiding in de app (dit document), met een inhoudsopgave; bevat ook een link naar de API-referentie
- **Taalkeuze** - Beschikbaar in de koptekst (desktop), via Instellingen → Lokalisatie & prijzen, op de spelerstafelpagina en op het openbare statusbord. De keuze wordt op het apparaat onthouden; dranknamen volgen de vertalingen van het menu (momenteel Engels/Frans)
- **Uitloggen** (rechtsboven) - Beëindigt de beheerderssessie. Als OIDC is ingeschakeld, wordt ook de sessie bij de identiteitsprovider beëindigd wanneer dat wordt ondersteund; daarna keer je terug naar de inlogpagina

---

## Overzicht van het Dashboard

Het Dashboard is je centrale plek om alle tafels te beheren.

### Tafelweergave

Tafels zijn gegroepeerd per type (Amerikaans, Pool, Snooker, Frans, …), met vlagbadges en kleurgecodeerde tegels:
- **Groene tegels** = Beschikbare tafels
- **Rode tegels** = Actieve sessies
- Tafels in onderhoud worden verborgen op het Dashboard (beheer ze via Beheer → Tafeltypen & voorraad)

Je kunt kiezen uit twee indelingen (selecteer die via **Instellingen → Dashboardindeling**):

- **Secties** (standaard) — alle typen als inklapbare groepen. Met de **vlaggen bovenaan** spring je
  naar een type en klap je die groep open; met het chevronpictogram op een groep klap je die in.
  De ingeklapte status wordt op dit apparaat onthouden.
- **Tabbladen** — één tafeltype per tabblad; versleep de **sleepgreep** naast een tabblad om de tabbladen te herordenen.

In beide indelingen kun je de groepen met tafeltypen herordenen: sleep in de sectiemodus de **⋮⋮-greep**
links van een groepskop. De volgorde wordt voor alle apparaten van het personeel opgeslagen en wordt ook gebruikt op het openbare statusbord.

### Tafelinformatie

Elke tegel toont:
- Tafelnummer en type
- Sessie-pincode (bij een actieve sessie) - weergegeven naast het tafelnummer, bijvoorbeeld "#5 (1234)"
- Duur van de huidige sessie
- Huidig aantal spelers
- Totaal op de rekening (oplopende kosten)
- Knoppen voor snelle acties

### Snelle acties

**Beschikbare tafels:**
- **Sessie starten** - Een nieuwe sessie beginnen
- **Onderhoud** - De tafel buiten gebruik stellen (reset de gebruiksteller wanneer je de tafel weer in gebruik neemt)

**Actieve tafels:**
- **Drank** - Dranken aan de rekening toevoegen (gegroepeerd per menucategorie)
- **Overdragen** - De sessie naar een andere tafel verplaatsen
- **Afrekenen** - Korting toepassen, een rekeningoverzicht afdrukken, de betaling afronden en de factuur afdrukken
- **−** naast het aantal spelers - Spelerafrekening (één speler betaalt diens deel en vertrekt)
- **+** - Een speler toevoegen — je wordt gevraagd of die speler abonnee is (dit beïnvloedt de korting)
- **QR-miniatuur** - De QR-code voor spelers vergroten

---

## Een sessie starten

1. Klik op **▶ Starten** bij een beschikbare tafel
2. Stel het aantal spelers in (standaard: 1)
3. (Optioneel) Selecteer abonnees uit je lijst
   - Abonnees krijgen korting tijdens het spelen; **sessies met alleen abonnees zijn toegestaan** (0
     niet-abonnees) en zij spelen gratis qua tafeltijd
   - Er is minstens één speler nodig (abonnee of niet)
4. Klik op **Sessie starten**

**Wat gebeurt er:**
- Er wordt een unieke pincode van 4 cijfers voor de sessie gegenereerd
- De tafel wordt als bezet gemarkeerd
- De kosten lopen op op basis van de verstreken tijd
- De pincode wordt op de tafelkaart weergegeven, zodat spelers hun rekening kunnen bekijken

---

## Actieve sessies beheren

### Live updates

Bij actieve sessies wordt het volgende getoond:
- **Duur** - Wordt elke seconde bijgewerkt (bijvoorbeeld "1h 23m 45s")
- **In rekening gebrachte uren** - Naar boven afgerond op het dichtstbijzijnde uur
- **Totaal op de rekening** - Tafelkosten + kosten van items

### Tafelkosten

De kosten worden per uur berekend op basis van het tafeltype:
- **Amerikaans poolbiljart:** €30/uur
- **Pool:** €25/uur
- **Snooker:** €40/uur
- **Frans biljart:** €35/uur

Tijd wordt altijd naar boven afgerond op het volgende uur (bijvoorbeeld: 1 uur en 1 minuut = 2 uur in rekening gebracht).

### Abonneekorting

Wanneer abonnees met niet-abonnees spelen:
- **Standaard:** 50% korting op de tafelkosten
- **Alle spelers zijn abonnee:** Geen kosten
- **Geen abonnees:** Volledige prijs

*Het kortingspercentage kan worden aangepast via Instellingen.*

---

## Items aan rekeningen toevoegen

### Snel dranken toevoegen

1. Klik op **Drank** op een actieve tafelkaart
2. Blader door de drankenkaart — gebruik de **categoriefilters** (Koud / Warm / Alcoholisch) en het **zoekveld**
   om snel items te vinden
3. Gebruik de knoppen **+** en **-** om aantallen te selecteren
4. Klik op **Aan rekening toevoegen**

### Aangepaste kosten

Vanuit de sessiegegevens:
1. Klik op de actieve tafel om de gegevens te bekijken
2. Scroll naar 'Aangepaste kosten toevoegen'
3. Voer een beschrijving en bedrag in
4. Klik op **Kosten toevoegen**

**Gebruik dit bijvoorbeeld voor:**
- Eten
- Materiaalverhuur
- Speciale toeslagen
- Aanvullende diensten

---

## Openstaande bestellingen (zelfbediening voor spelers)

Spelers kunnen zelf dranken bestellen vanaf de [Openbare tafelweergave](#public-table-view) op hun telefoon. Personeel hoeft hiervoor niet naar de tafel te lopen om de bestelling op te nemen.

### Zo werkt het

1. Een speler opent de pagina van de betreffende tafel, voert de **pincode** van de tafel in en selecteert dranken uit het menu.
2. De bestelling wordt verzonden en verschijnt meteen op het hoofddashboard, in een nieuwe sectie **'Openstaande bestellingen'** bovenaan het scherm, boven het tafelenraster.
3. Bij elke nieuwe bestelling klinkt op het Dashboard van de beheerder een geluidssignaal ('Bright Triangle'), zodat het personeel het scherm niet voortdurend in de gaten hoeft te houden.
4. Elke openstaande bestelling toont het tafelnummer, de bestelde items en het totaalbedrag.
5. Het personeel controleert de bestelling en klikt op **✓ Voldaan** zodra de dranken zijn bezorgd.
6. Na afhandeling worden de items automatisch aan de rekening van die tafel toegevoegd — je hoeft niets handmatig opnieuw in te voeren.

**Beveiliging:** De vereiste pincode voorkomt dat andere spelers, of iemand die niet aan de tafel zit, bestellingen op jouw rekening plaatsen.

**Geluidssignalen:** Het geluidssignaal voor nieuwe bestellingen volgt de instelling **Audiosturen** op de pagina Instellingen.

---

## Spelerafrekeningen

Wanneer een speler wil vertrekken terwijl de anderen doorspelen:

1. Klik op **🧾 Afrekenen** op de tafelkaart
2. Controleer de huidige rekening en tafelkosten
3. **Kies een optie voor de tafelkosten:**
   - **Aandeel van de speler** - Gelijke verdeling over het oorspronkelijke aantal spelers
   - **Volledige tafelkosten** - De speler betaalt alle tafelkosten
   - **Tafelkosten overslaan** - Alleen de items afrekenen

4. **Selecteer items:**
   - Gebruik de aantalkiezers om de items te selecteren die de speler heeft verbruikt
   - Je kunt ook een deel van een aantal afrekenen (bijvoorbeeld 1 van de 3 biertjes)

5. Klik op **💰 Afrekenen**

**Wat gebeurt er:**
- Geselecteerde items worden van de rekening verwijderd of het aantal wordt verlaagd
- Het aantal spelers neemt met 1 af
- De weergave van de overgebleven spelers wordt automatisch bijgewerkt
- Je kunt een bon afdrukken

**Belangrijk:** Afrekenbedragen zijn gebaseerd op de *oorspronkelijke* tafelkosten, vóór eventuele eerdere afrekeningen.

---

## Sessies beëindigen (afrekenen)

Wanneer alle spelers klaar zijn:

1. Klik op **✓ Afrekenen** op de tafelkaart
2. Controleer de uiteindelijke kosten:
   - Tafelkosten (op basis van de totale duur)
   - Alle items op de rekening
   - Eventuele eerdere afrekeningen (weergegeven als inhoudingen)
3. **Optioneel:** Klik op **🖨 Bon afdrukken** voor een papieren exemplaar
4. Klik op **Sessie beëindigen** om af te ronden

**Wat gebeurt er:**
- Het eindbedrag wordt berekend
- De sessie wordt als afgerond gemarkeerd
- De tafel is beschikbaar voor de volgende sessie
- De gegevens worden opgeslagen voor rapporten

---

## Abonnementen

### Wat zijn abonnementen?

Abonnementen zijn vooraf betaalde lidmaatschappen die korting geven op tafelkosten.

### Abonnementen bekijken

1. Open het menu (☰)
2. Klik op **Abonnementen**
3. Bekijk alle actieve abonnementen met:
   - Naam van de speler
   - Startdatum
   - Einddatum
   - Huidige status

### Abonnementen gebruiken

Bij het starten van een sessie:
1. Stel het aantal spelers in
2. Vink de vakjes naast de namen van abonnees aan
3. Het systeem past de korting automatisch toe

**Voordelen:**
- Lagere of geen tafelkosten
- Geregistreerd gebruik voor analyses
- Stimuleert klanten om regelmatig terug te komen

---

## Openbare tafelweergave

Spelers kunnen hun rekening vanaf elk apparaat live bekijken en zelf dranken bestellen.

### De tafelweergave openen

**URL-indeling:** `http://[server]/table.html?number=[table_number]`

Voorbeeld: `http://localhost:3000/table.html?number=5`

### Eerste keer openen

1. De speler gaat naar de URL
2. Voert de pincode van 4 cijfers in (zichtbaar op het Dashboard)
3. De pincode wordt voor de sessie opgeslagen

### Wat spelers zien

- Tafelnummer en type
- Huidige duur
- Aantal spelers
- Alle items op de rekening, met aantallen en prijzen
- Tafelkosten (uren en bedrag)
- Tussentotaal
- Een drankenmenu waaruit spelers rechtstreeks kunnen bestellen (pincode vereist) — zie [Openstaande bestellingen](#pending-orders-player-self-service)

**Automatisch vernieuwen:** De weergave wordt automatisch vernieuwd (ongeveer elke 10 seconden en meteen wanneer je terugkeert naar het tabblad), zodat afgehandelde bestellingen en wijzigingen op de rekening snel zichtbaar zijn.

### QR-codes

Op elke actieve tafelkaart op het Dashboard staat een **QR-code** die rechtstreeks naar de tafelweergave leidt, met de pincode al ingevuld. Spelers kunnen de code dus eenvoudig met de camera van hun telefoon scannen om hun sessie te volgen — ze hoeven de URL of pincode niet handmatig in te voeren. Klik op de QR-code op het Dashboard om deze te vergroten (handig om af te drukken of bij de tafel te tonen).

**De hostnaam in QR-codes instellen:** Standaard verwijzen QR-codes naar het adres waarmee je browser het Dashboard heeft geopend (bijvoorbeeld `http://localhost:3000`), wat alleen werkt op dezelfde computer. Als spelers de QR-codes met hun telefoon willen scannen, stel je bij Beheer → Instellingen de **Openbare basis-URL** in op de hostnaam/IP of FQDN die hun telefoon kan bereiken, bijvoorbeeld `http://[IP_ADDRESS]:3000` of `https://pool.example.com`. Laat dit veld leeg om het huidige browseradres te gebruiken.

---

## Beheerfuncties

Open via het menu (☰) → **Beheerpaneel**

### Tafeltypen & voorraad

**Tafeltypen beheren:**
- Nieuwe tafeltypen toevoegen (bijvoorbeeld 'Biljart', 'Carambole')
- Uurtarieven instellen in je valuta
- Het **btw-tarief** instellen dat geldt voor de tijdskosten van dat tafeltype (20%, 10% of 0% — zie [Btw-rapportage (TVA)](#vat-tva-reporting--france))
- Bestaande typen bewerken of verwijderen

**Tafels beheren:**
- **Tafels toevoegen:** geef een aantal op om meerdere tafels tegelijk aan te maken (automatisch opeenvolgend genummerd)
- **Hernummeren:** klik op het **potlood** naast een tafelnummer, typ het nieuwe nummer en druk op Enter
  (een nummer dat al in gebruik is, wordt geweigerd met een toelichtende melding)
- **Tafels verwijderen:** verwijder ongebruikte tafels
- **Onderhoudsmodus instellen:** schakel tafels tijdelijk uit; als je een tafel weer in gebruik neemt, wordt de
  teller voor gebruik sinds het onderhoud gereset
- **Volgorde van typen wijzigen:** gebruik de knoppen **↑/↓** bij elk type om de volgorde op het Dashboard,
  de tabbladen/vlaggenkiezer van het Dashboard en het openbare statusbord te wijzigen

**Bulkbewerkingen:**
- Meerdere tafels van hetzelfde type toevoegen (1-50 tegelijk)
- Tafels krijgen automatisch de eerstvolgende beschikbare nummers

### Drankenkaart beheren

1. Klik op **Drankenkaart**
2. **Nieuw item toevoegen:**
   - Naam
   - Prijs
   - Btw-tarief (20% standaard, 10% verlaagd of 0% vrijgesteld — zie [Btw-rapportage (TVA)](#vat-tva-reporting--france))
   - **Categorie** — Koud, Warm, Alcoholisch, Overig (of geen). Categorieën groeperen het menu op het bestelscherm van de speler
     en in het dialoogvenster 'Drank toevoegen' op het Dashboard.
3. **Bewerken/verwijderen:** gebruik de potlood-/prullenbakknoppen naast elk item

**Meertalige ondersteuning:**
- Items kunnen een Engelse en Franse naam hebben
- Je kunt de weergavetaal wijzigen via Instellingen

### Betalingen (optionele POS)

Betalingen staan **standaard uit**. Schakel ze in via **Instellingen → Algemeen → 'Betalingen (POS)'** (zie ook
[Kaartbetalingen instellen](#setting-up-card-payments-administrator) voor betaalterminals).

Zodra betalingen zijn ingeschakeld:

- **Afrekenen** int het bedrag voordat de factuur wordt uitgegeven:
  - **Contant:** voer het ontvangen contante bedrag in en klik op **Betaling toevoegen** (het wisselgeld wordt getoond). Gebruik **Exact bedrag** om het resterende saldo precies te betalen.
  - **Kaart (terminal):** klik op **Kaart (terminal) — €X**. Er verschijnt een banner 'Houd de kaart op de terminal…'; de klant houdt de kaart tegen de terminal of steekt deze erin, waarna de betaling automatisch wordt toegevoegd. Met **Annuleren** stop je de actie op de terminal.
  - **Gesplitste betalingen:** voeg meerdere betalingen toe (contant en/of kaart) totdat het resterende saldo nul is. **Afrekenen voltooien** is alleen beschikbaar als de rekening volledig is betaald.
  - Kortingen kunnen niet meer worden gewijzigd zodra een betaling is toegevoegd (om verschillen in het bedrag te voorkomen).
- **Bonnen** (op het scherm en de afgedrukte factuur) vermelden de betaalmethode(n) en eventueel verschuldigd wisselgeld.
- **Beheer → Contant & betalingen** (alleen zichtbaar als betalingen zijn ingeschakeld):
  - **Kassadienst:** open aan het begin van de dag een kassadienst met een beginbedrag; voer bij het afsluiten het getelde contante geld in — het verwachte totaal (beginbedrag + netto contant) en het **verschil** worden berekend. Bij een verschil dat niet nul is, wordt een e-mail gestuurd naar het ingestelde onderhoudsadres (als SMTP is ingesteld).
  - **Terugbetalingen:** per betaling, met een bedrag (gedeeltelijke terugbetaling is mogelijk) en optionele reden. Bij terugbetaling van een gefactureerde betaling wordt een genummerde **creditnota (avoir)** uitgegeven; de melding toont het nummer.
  - **Creditnota's:** worden weergegeven met een knop **Afdrukken** (voegt de oorspronkelijke bonreferentie en de btw-specificatie toe; sla op als PDF vanuit het afdrukvenster).
  - **Dagafsluiting & afstemming:** kies een datum om betalingen per methode, creditnota's en verwacht/geteld contant geld/verschil te bekijken; met **CSV exporteren** download je het betalingsjournaal; **Dag afsluiten** vergrendelt de dag (dit kan niet zolang een kassadienst open is).
- **Rapporten → Financieel** toont de regels **Betaald met contant/kaart** en **Terugbetalingen (creditnota's)** (ook in de PDF- en Excel-exports). Het rapport **Btw / TVA** trekt creditnota's af en toont de categorie *Terugbetalingen (creditnota's)*.

### Instellingen

Open via het menu (☰) → **Instellingen**

**Beschikbare instellingen:**

- **Applicatienaam:** naam die in de koptekst wordt weergegeven (bijvoorbeeld 'Joe's Pool Hall')
- **Openbare basis-URL:** hostnaam/IP of FQDN die wordt gebruikt voor QR-codes van tafels (zie [QR-codes](#qr-codes)); laat leeg om het adres te gebruiken waarmee je nu surft
- **Dashboardindeling:** Secties (inklapbare groepen + vlaggenkiezer) of Tabbladen (één type per tabblad)
- **Taal:** Engels, Français, Deutsch, Español of Italiano — wijzigt de interface op dit apparaat (ook te kiezen via de koptekst, de spelerstafelpagina en het openbare statusbord)
- **Valuta:** $ (USD), € (EUR) of £ (GBP)
- **Abonneekorting:** kortingspercentage (0-100%)
- **Audiosturen:** schakel klikgeluiden in de gebruikersinterface en het geluidssignaal voor nieuwe bestellingen in of uit
- **Fiscale/juridische informatie:** officiële bedrijfsnaam, SIRET, SIREN, intracommunautair btw-nummer, geregistreerd adres, btw-regeling en aangifteperiodiciteit — gebruikt in het btw-rapport en voor je eigen administratie (zie [Btw-rapportage (TVA)](#vat-tva-reporting--france))

**Gevarenzone:**
- **Alle sessiegeschiedenis wissen:** verwijdert afgeronde sessies definitief
  - Er is een dubbele bevestiging vereist
  - Actieve sessies worden NIET beïnvloed
  - Sessies binnen een **afgesloten btw-periode** zijn ook beschermd en worden niet verwijderd

---

## Kaartbetalingen instellen (beheerder)

### Wat heb je nodig?

- De app draait (Docker) op een machine met internettoegang.
- Een **Stripe-account** (bedrijfsgegevens geverifieerd). Begin in de **testmodus**.
- Een **Stripe Terminal-lezer** (bijvoorbeeld WisePOS E) die is gekoppeld aan de wifi van de zaak — of, om te testen, een
  **gesimuleerde Stripe-lezer**.
- **Stripe moet je server kunnen bereiken** via `https://<your-domain>/api/webhooks/stripe`
  (openbare HTTPS-verbinding, reverse proxy of een tunnel tijdens de pilot). De app zelf mag binnen
  het LAN op HTTP blijven draaien.
- Zaken die alleen contant geld accepteren, hebben dit niet nodig: schakel Betalingen in en gebruik contant geld.

### Stappen

1. **Stripe (testmodus)**
   - Koppel/registeer de lezer (Dashboard → Terminal → Readers); noteer de id (`tmr_…`).
   - Ga naar Developers → Webhooks → voeg `https://<your-domain>/api/webhooks/stripe` toe met de gebeurtenissen
     `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`; kopieer het
     ondertekeningsgeheim (`whsec_…`).
2. **Serverconfiguratie** (compose-omgeving / `.env`), en herstart daarna (`docker compose up -d`):
   - `STRIPE_SECRET_KEY=sk_test_…` (later de live-sleutel)
   - `STRIPE_TERMINAL_READER_ID=tmr_…`
   - `STRIPE_WEBHOOK_SECRET=whsec_…`
   - `COOKIE_SECURE=true` wanneer de app via HTTPS wordt aangeboden
3. **App-instellingen**
   - **Instellingen → Algemeen → 'Betalingen (POS)' → aan**.
   - De valuta moet `€`, `$` of `£` zijn (Stripe ontvangt respectievelijk eur/usd/gbp).
   - Stel de applicatienaam en de fiscale/juridische informatie in (gebruikt voor rapporten en je administratie).
   - Optioneel: SMTP-instellingen + e-mailadres voor onderhoudsmeldingen bij kasverschillen.
4. **Testen zonder hardware aan te schaffen**
   - Stel `PAYMENT_PROVIDER=fake` in de omgeving in: betalingen worden direct vastgelegd (geen terminal of netwerk nodig) —
     handig om de gebruikersinterface te trainen/testen.
   - Of gebruik de Stripe-testmodus met een **gesimuleerde lezer** om de echte kaartbetalingsstroom te testen.
5. **Controlelijst voor de pilot vóór ingebruikname**
   - Contante verkoop met gesplitste betaling + wisselgeld; kaartbetaling; geweigerde kaart en opnieuw proberen; annuleren op de terminal;
     gedeeltelijke terugbetaling (druk de creditnota af); sluit de kassadienst; sluit de dag af en exporteer de CSV.
   - Schakel pas over op live-sleutels van Stripe nadat de pilot is geslaagd.

### Problemen oplossen en dagelijkse werkzaamheden

- **Webhook komt niet aan** (de terminal geeft aan dat er is betaald, maar de app blijft 'wordt aangeboden' tonen): controleer het
  endpointadres, het ondertekeningsgeheim en de ingestelde gebeurtenissen; de app controleert de betalingsstatus ook regelmatig
  en synchroniseert verouderde kaartbetalingen opnieuw wanneer de pagina Contant wordt geladen. Als de betaling is afgebroken, klik je op
  **Annuleren** ernaast via Beheer → Contant & betalingen.
- **Totalen van de terminal en de app verschillen** op de dagafsluitkaart: de regel 'Terminal (Stripe)' komt uit
  Stripe-saldotransacties (bruto minus terugbetalingen, plus de getoonde kosten). Controleer de weergave van de betalingskosten,
  terugbetalingen in het Stripe-dashboard en of de daggrens overeenkomt met je boekhoudkundige dag.
  De regel wordt alleen getoond wanneer er Stripe-afrekengegevens beschikbaar zijn.
- **Betalingen snel uitschakelen:** zet **Instellingen → Algemeen → 'Betalingen (POS)'** uit — afrekenen
  keert terug naar het gedrag van vóór POS, kaartopties verdwijnen en de pagina Contant wordt verborgen. Bestaande
  bonnen, creditnota's en geschiedenis blijven behouden.
- **Sleutels/lezer vervangen:** werk `STRIPE_SECRET_KEY` / `STRIPE_TERMINAL_READER_ID` /
  `STRIPE_WEBHOOK_SECRET` bij in de omgeving en herstart (`docker compose up -d`). Stop met het gebruik van de oude
  lezer in het Stripe-dashboard.
- **Live gaan:** vervang de testcodes en -geheimen door live-exemplaren en herhaal de pilotcontrolelijst met een
  kleine echte betaling voordat je kaartbetalingen aankondigt.
- **Zaken die alleen contant geld accepteren:** Stripe instellen is niet nodig; schakel Betalingen in en gebruik contant geld. Kassadiensten, terugbetalingen,
  creditnota's, dagafsluiting en CSV-export werken allemaal zonder terminal.

### Goed om te weten

- **Eén lezer per installatie:** de lezer-id wordt in de omgeving ingesteld. Voor meerdere kassa's
  zou je lezers moeten kunnen selecteren (die functie is niet geïmplementeerd).
- **Afhankelijkheid van internet:** kaartbetalingen vereisen een verbinding; als die tijdens een betaling wegvalt, kan de betaling
  op 'wordt aangeboden' blijven staan — annuleer of betaal deze terug via de pagina Contant. Contant geld werkt altijd.
- **Eén personeelslogin:** de app heeft momenteel één beheerderslogin; betalingen/creditnota's worden op naam van die gebruiker geregistreerd.
- **NF525 (Frankrijk):** de app registreert verkopen en betalingen met opeenvolgende bonnen, onveranderlijke regels,
  creditnota's en periodeafsluitingen — maar certificering is een wettelijk attestatieproces. Overleg met je
  expert-comptable voordat je naleving aankondigt of kaartbetalingen in productie inschakelt.
- Dit integreert **betalingen**, niet een extern kassasysteem voor de bar (synchronisatie van menu/bestellingen) en ook niet
  zelf betalen door klanten via hun telefoon.

## Rapporten

Open via **Beheer → Rapporten**. De pagina heeft twee tabbladen: **Financieel** en **Btw / TVA**.

### Financiële rapporten

Genereer gedetailleerde omzetrapporten voor elke gewenste periode.

**Periodetypen:**
- **Dag:** specifieke datum met sessiegegevens
- **Week:** periode van 7 dagen die op maandag begint
- **Maand:** volledige kalendermaand
- **Kwartaal:** K1, K2, K3 of K4
- **Jaar:** jaarsamenvatting

**Inhoud van rapporten:**

1. **Totale omzet** - Alle bronnen samen

2. **Omzet per tafeltype**
   - Amerikaans poolbiljart: €X
   - Pool: €X
   - Snooker: €X
   - Frans: €X

3. **Omzet uit dranken/items** - Verkoop van eten en drinken

4. **Abonnementen omzet** - Actieve abonnementen in de periode

5. **Tijdreeksanalyse** (week-/maand-/kwartaal-/jaarrapporten)
   - Omzettrends in de tijd
   - Analyse per weekdag
   - Drukste uren vaststellen

6. **Daggegevens** (alleen dagrapporten)
   - Uitsplitsing van afzonderlijke sessies
   - Tafelgebruik per sessie
   - Gegevens op itemniveau
   - Kosten bewerken/verwijderen

### Rapporten begrijpen

**Wat is inbegrepen:**
- Tafelkosten van afgeronde sessies
- Alle menu-items en aangepaste kosten
- Omzet uit abonnementen

**Wat is uitgesloten:**
- Actieve (lopende) sessies
- Boekingen van spelerafrekeningen (dit zijn interne correcties)
- Tafels in onderhoud of gepauzeerd

**Automatisch laden:** Het rapport voor de huidige dag wordt automatisch gegenereerd wanneer je de pagina Rapporten opent.

---

## Btw-rapportage (TVA) — Frankrijk

> ⚠️ **Dit is geen juridisch of fiscaal advies.** Raadpleeg je *expert-comptable* om te bevestigen dat deze cijfers en procedures overeenkomen met de specifieke btw-regeling van je bedrijf voordat je aangifte doet. Zie [VAT-COMPLIANCE.md](VAT-COMPLIANCE.md) voor de volledige conformiteitsnotities.

Het tabblad **Btw / TVA** op de pagina Rapporten bereidt je periodieke btw-aangifte (CA3/CA12) voor.

### Een btw-rapport genereren

1. Kies een **periodetype** (maand, kwartaal, jaar of dag) en de betreffende periode.
2. Klik op **Btw-rapport laden** om de uitsplitsing per btw-tarief te bekijken:
   - Totaal HT (exclusief btw)
   - TVA (btw-bedrag)
   - Totaal TTC (inclusief btw)
3. Onder de tabel wordt een uitsplitsing per categorie getoond (tafeltijd, dranken, kortingen, overige).

### Een periode afsluiten

Nadat je aangifte over een periode bij de belastingdienst hebt ingediend, klik je op **Periode sluiten**. Hierdoor:
- Worden de totalen van de periode als momentopname voor je administratie opgeslagen.
- Kan **Alle sessiegeschiedenis wissen** nooit meer verkopen binnen die periode verwijderen, zodat de ingediende cijfers altijd in de database terug te vinden zijn.

Afgesloten periodes verschijnen in een geschiedenislijst onder het rapport. Daarin zie je de periode, de totalen en wie de periode heeft afgesloten.

### Exporteren voor je accountant

Klik op **CSV-journaal exporteren** om elke afzonderlijke verkoopregel in de geselecteerde periode te downloaden (datum, tafel/sessie, beschrijving, aantal, stukprijs, btw-tarief, btw-bedrag, HT-bedrag) — handig om aan je accountant te geven of langdurig te archiveren.

### Btw-rapporten nauwkeurig houden

- Stel het btw-tarief van elke drank en elk tafeltype correct in via Beheer (zie [Drankenkaart beheren](#drink-menu-management) en [Tafeltypen & voorraad](#table-types--inventory)).
- Gebruik altijd **'✓ Afrekenen' → Betaling voltooien** om sessies met omzet te beëindigen — zo worden de tafeltijdkosten geregistreerd en wordt een bon met volgnummer uitgegeven. Als je een sessie op een andere manier beëindigt, worden de tafeltijdkosten niet in het btw-rapport opgenomen.
- Vul je **fiscale/juridische informatie** in via Instellingen (SIRET, btw-nummer, btw-regeling enz.), zodat je deze bij de hand hebt wanneer je aangifte doet.

---

## Tips en aanbevolen werkwijzen

### Voor de dagelijkse werkzaamheden

1. **Begin van de dag:**
   - Controleer op eventueel onterecht als 'bezet' gemarkeerde tafels
   - Bekijk het rapport van gisteren
   - Controleer of alle tafels op 'beschikbaar' staan

2. **Tijdens de bediening:**
   - Gebruik de snelle drankknoppen om sneller te werken
   - Controleer de pincode met spelers wanneer ze toegang tot hun rekening nodig hebben
   - Houd sessies die lang duren in de gaten

3. **Einde van de dag:**
   - Reken alle resterende sessies af
   - Genereer het dagrapport
   - Controleer eventuele problemen of correcties

### Voor afrekeningen

- Controleer altijd het aantal spelers voordat je afrekent
- Druk bonnen af voor de administratie van klanten
- Controleer goed of de geselecteerde items overeenkomen met wat de speler heeft verbruikt

### Voor nauwkeurigheid

- Voeg items meteen aan rekeningen toe (wacht niet tot het afrekenen)
- Gebruik aangepaste kosten voor items die niet op het menu staan
- Controleer bij de start van een sessie of het aantal spelers klopt

### Voor klantenservice

- Deel de tafel-URL's vroeg in de sessie met spelers
- Hang QR-codes bij de tafels voor eenvoudige toegang
- Leg de voordelen van abonnementen uit om inschrijvingen te stimuleren

---

## Sneltoetsen

De applicatie wordt momenteel bediend met muis of aanraking en heeft geen sneltoetsen. Voor alle acties moet je op knoppen klikken.

---

## Mobiele toegang

De applicatie past zich aan het scherm aan en werkt op:
- Desktopbrowsers
- Tablets
- Smartphones

**Aanbevolen gebruik:**
- Personeel: desktop/tablet voor het Dashboard
- Spelers: smartphone voor de tafelweergave

---

## Problemen oplossen

### Veelvoorkomende problemen

**'Sessie starten mislukt'**
- Controleer of de tafel echt beschikbaar is
- Zorg dat het aantal abonnees ≤ het totale aantal spelers is
- Vernieuw de pagina en probeer het opnieuw
- Neem contact op met de beheerder als het probleem blijft bestaan

**Pincode werkt niet**
- Controleer of de pincode overeenkomt met die op het Dashboard
- Controleer of het tafelnummer klopt
- De pincode verloopt wanneer de sessie eindigt

**Items verschijnen niet op de rekening**
- Controleer of het item is toegevoegd (kijk of er een bevestigingsmelding verschijnt)
- Wacht ongeveer 10 seconden op automatisch vernieuwen (openbare weergave), of keer terug naar het tabblad om de weergave meteen te vernieuwen
- Vernieuw het Dashboard handmatig

**Er worden verkeerde bedragen weergegeven**
- Controleer of de juiste valuta is ingesteld
- Controleer of er spelerafrekeningen zijn toegepast
- Bekijk de afzonderlijke regels in de sessiegegevens

### Hulp krijgen

Als het probleem blijft bestaan:
1. Noteer het tafelnummer en het tijdstip
2. Maak indien mogelijk een schermafbeelding
3. Neem contact op met de systeembeheerder
4. Controleer de Docker-logs (voor beheerders)

---

## Veelgestelde vragen

**V: Kan ik een sessie aanpassen nadat deze is gestart?**

A: Ja, je kunt items toevoegen/verwijderen en tijdens de sessie het aantal spelers aanpassen.

**V: Wat gebeurt er als ik per ongeluk een sessie beëindig?**

A: Beëindigde sessies kunnen niet opnieuw worden geopend. Je moet dan een nieuwe sessie starten.

**V: Kunnen spelers zelf items toevoegen?**

A: Nee, alleen personeel kan items toevoegen. Spelers kunnen alleen hun rekening bekijken.

**V: Hoe verwerk ik gratis sessies?**

A: Start een sessie met 1 speler, voeg items toe en reken daarna af zonder kosten in rekening te brengen.

**V: Kan ik het uurtarief tijdens een sessie wijzigen?**

A: Nee, tariefwijzigingen gelden alleen voor nieuwe sessies. Voor actieve sessies blijft het oorspronkelijke tarief gelden.

**V: Wat als het internet uitvalt?**

A: Het systeem heeft netwerktoegang nodig. Actieve sessies blijven bestaan, maar updates worden onderbroken totdat de verbinding is hersteld.

**V: Kan ik rapportgegevens exporteren?**

A: Rapporten zijn momenteel alleen te bekijken. Gebruik Afdrukken/PDF in je browser om ze te bewaren.

**V: Hoe ver terug kan ik rapporten bekijken?**

A: Zolang de sessiegeschiedenis bewaard blijft (totdat deze handmatig via Instellingen wordt gewist).

---

## Functieoverzicht

### Kernfuncties
- Live sessiebewaking
- Automatische tijdgebaseerde kostenberekening
- Ondersteuning voor meerdere spelers met afrekeningen
- Met pincode beveiligde spelerweergaven
- Beheer van dranken en items
- Ondersteuning voor aangepaste kosten
- Tafelsessies overdragen
- Bonnen afdrukken
- Zelfbediening voor drankbestellingen door spelers, met een met geluid gemelde wachtrij voor openstaande bestellingen
- QR-codes waarmee spelers met één tik de tafel op hun telefoon openen

### Beheerfuncties
- Beheer van tafeltypen en tafelvoorraad
- Meerdere tafels tegelijk aanmaken
- Drankenkaart configureren met btw-tarieven
- Abonnementen beheren
- Financiële rapportage (meerdere periodes)
- Btw-rapportage (TVA), CSV-export en periodeafsluitingen voor Franse regelgeving
- Ondersteuning voor meerdere valuta
- Kortingssysteem voor abonnees
- Sessiegeschiedenis beheren
- Openbare basis-URL voor QR-codes instellen
- Fiscale/juridische bedrijfsgegevens

### Spelerfuncties
- Rekeningen live bekijken
- Weergave wordt automatisch vernieuwd
- Mobielvriendelijke interface
- Toegang beveiligd met een pincode
- Zelf dranken bestellen via een QR-code

---

## Ondersteuning

Neem voor technische ondersteuning of verzoeken om functies contact op met je systeembeheerder.

---

**Versie:** 1.0  
**Laatst bijgewerkt:** december 2025

---

Bedankt dat je Pool Tables Manager gebruikt! We hopen dat deze handleiding je helpt om alles uit de applicatie te halen. Ontwikkelaars vinden de technische documentatie in `DEVELOPER_README.md`.
