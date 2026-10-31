# Pool Tables Manager – Benutzerhandbuch

## Willkommen bei Pool Tables Manager

Pool Tables Manager ist eine umfassende Lösung für die Verwaltung des Betriebs eines Billardsalons. Dieses Handbuch hilft Ihnen dabei, alle in der Anwendung verfügbaren Funktionen zu verstehen und zu nutzen.

---

## Erste Schritte

### Zugriff auf die Anwendung

Öffnen Sie Ihren Webbrowser und rufen Sie `http://localhost:3000` (oder die Adresse Ihres Servers) auf.

Beim ersten Aufruf werden Sie aufgefordert, ein lokales Admin-Passwort festzulegen (oder sich anzumelden, falls bereits ein Passwort/OIDC konfiguriert ist). Nach der Anmeldung zeigt die Übersicht alle Ihre Tische, nach Typ geordnet.

### Hauptmenü

Die Kopfzeile enthält drei Menüpunkte sowie den Schalter für das Design und eine Schaltfläche zum Abmelden:

- **Übersicht** – Tische, Sitzungen und offene Bestellungen in Echtzeit
- **Admin** – Karte, Tischbestand, Abonnements, Berichte und Einstellungen
- **Öffentlicher Status** – Öffnet die Verfügbarkeitsübersicht für Kunden in einem neuen Tab (keine Anmeldung erforderlich)
- **Hilfe** – Integriertes Benutzerhandbuch (dieses Dokument) mit Inhaltsverzeichnis; enthält einen Link zur API-Referenz
- **Sprachauswahl** – Verfügbar in der Kopfzeile (Desktop), unter Einstellungen → Lokalisierung & Preise, auf der Spielertischseite und auf der öffentlichen Statusseite. Die Auswahl wird auf dem Gerät gespeichert; Getränkenamen richten sich nach den Übersetzungen der Karte (derzeit Englisch/Französisch)
- **Abmelden** (oben rechts) – Beendet die Admin-Sitzung. Bei aktiviertem OIDC wird, sofern unterstützt, auch die Sitzung beim Identitätsanbieter beendet; anschließend kehren Sie zur Anmeldeseite zurück

---

## Übersicht

Die Übersicht ist Ihre zentrale Anlaufstelle für die Verwaltung aller Tische.

### Tischanzeige

Tische werden nach Typ gruppiert (Amerikanisch, Pool, Snooker, Französisch usw.) und mit Flaggen sowie farbcodierten Kacheln angezeigt:
- **Grüne Kacheln** = verfügbare Tische
- **Rote Kacheln** = laufende Sitzungen
- Tische im Wartungsmodus werden in der Übersicht ausgeblendet (verwalten Sie sie unter Admin → Tischtypen & Inventar)

Zwei Layouts sind verfügbar (wählen Sie eines unter **Einstellungen → Dashboard-Layout**):

- **Abschnitte** (Standard) – Alle Typen werden als einklappbare Gruppen angezeigt. Über eine Reihe von **Flaggen oben** springen Sie zu einem Typ (und klappen ihn auf); mit dem Pfeil einer Gruppe können Sie diese einklappen. Der eingeklappte Zustand wird auf diesem Gerät gespeichert.
- **Tabs** – Ein Tischtyp pro Tab; ziehen Sie den **Griff** neben einem Tab, um die Tabs neu anzuordnen.

In beiden Layouts können Sie die Tischtypgruppen neu anordnen: Ziehen Sie im Modus „Abschnitte“ den **⋮⋮-Griff** links neben einer Gruppenüberschrift. Die Reihenfolge wird für alle Geräte des Personals gespeichert und auch auf der öffentlichen Statusseite verwendet.

### Tischinformationen

Jede Kachel zeigt:
- Tischnummer und -typ
- Sitzungs-PIN (bei laufender Sitzung) – neben der Tischnummer angezeigt, z. B. „#5 (1234)“
- Dauer der laufenden Sitzung
- Aktuelle Spielerzahl
- Rechnungsbetrag (laufende Kosten)
- Schnellzugriffsschaltflächen

### Schnellaktionen

**Verfügbare Tische:**
- **Sitzung starten** – Eine neue Sitzung beginnen
- **Wartung** – Den Tisch außer Betrieb nehmen (setzen Sie den Nutzungszähler beim Wiederinbetriebnehmen zurück)

**Belegte Tische:**
- **Getränk** – Getränke zur Rechnung hinzufügen (nach Kartenkategorie gruppiert)
- **Umziehen** – Die Sitzung an einen anderen Tisch verlegen
- **Kassieren** – Rabatt anwenden, Rechnungsvorschau drucken, Zahlung abschließen und Rechnung drucken
- **−** neben der Spielerzahl – Spielerabrechnung (ein Spieler bezahlt seinen Anteil und geht)
- **+** – Einen Spieler hinzufügen – Sie werden gefragt, ob die Person Abonnent ist (wirkt sich auf den Rabatt aus)
- **QR-Miniaturansicht** – Den QR-Code für Spieler vergrößern

---

## Sitzung starten

1. Klicken Sie bei einem verfügbaren Tisch auf **▶ Starten**
2. Legen Sie die Spielerzahl fest (Standard: 1)
3. (Optional) Wählen Sie Abonnenten aus Ihrer Liste aus
   - Abonnenten erhalten beim Spielen Rabatte; **Sitzungen ausschließlich mit Abonnenten sind zulässig** (0 Nicht-Abonnenten), und die Tischzeit ist kostenlos
   - Mindestens ein Spieler (Abonnent oder nicht) ist erforderlich
4. Klicken Sie auf **Sitzung starten**

**Was passiert:**
- Für die Sitzung wird eine eindeutige 4-stellige PIN erstellt
- Der Tisch wird als belegt markiert
- Die Kosten werden entsprechend der verstrichenen Zeit berechnet
- Die PIN wird auf der Tischkachel angezeigt, damit Spieler ihre Rechnung aufrufen können

---

## Laufende Sitzungen verwalten

### Echtzeitaktualisierungen

Bei laufenden Sitzungen wird Folgendes angezeigt:
- **Dauer** – Wird jede Sekunde aktualisiert (z. B. „1 Std. 23 Min. 45 Sek.“)
- **Berechnete Stunden** – Auf die nächste volle Stunde aufgerundet
- **Rechnungsbetrag** – Tischgebühr + Artikelkosten

### Tischgebühren

Die Gebühren werden je nach Tischtyp pro Stunde berechnet:
- **Amerikanischer Pool:** 30 €/Stunde
- **Pool:** 25 €/Stunde
- **Snooker:** 40 €/Stunde
- **Französisches Billard:** 35 €/Stunde

Die Zeit wird immer auf die nächste volle Stunde aufgerundet (z. B. 1 Stunde und 1 Minute = Abrechnung von 2 Stunden).

### Abonnentenrabatte

Wenn Abonnenten mit Nicht-Abonnenten spielen:
- **Standard:** 50 % Rabatt auf die Tischgebühr
- **Alle sind Abonnenten:** Keine Gebühr
- **Keine Abonnenten:** Voller Preis

*Der Rabattprozentsatz kann unter Einstellungen angepasst werden.*

---

## Artikel zur Rechnung hinzufügen

### Getränke schnell hinzufügen

1. Klicken Sie auf der Kachel eines belegten Tisches auf **Getränk**
2. Durchsuchen Sie die Getränkekarte – nutzen Sie die **Kategorie-Schaltflächen** (Kalt / Heiß / Alkoholisch) und das **Suchfeld**, um Artikel schnell zu finden
3. Legen Sie die Mengen mit den Schaltflächen **+** und **−** fest
4. Klicken Sie auf **Zur Rechnung hinzufügen**

### Benutzerdefinierte Gebühren

In den Sitzungsdetails:
1. Klicken Sie auf den belegten Tisch, um die Details aufzurufen
2. Scrollen Sie zu „Benutzerdefinierte Gebühr hinzufügen“
3. Geben Sie eine Beschreibung und einen Betrag ein
4. Klicken Sie auf **Gebühr hinzufügen**

**Anwendungsfälle:**
- Speisen
- Geräteverleih
- Sondergebühren
- Zusätzliche Dienstleistungen

---

## Offene Bestellungen (Selbstbedienung für Spieler)

Spieler können über die [öffentliche Tischansicht](#public-table-view) auf ihrem Smartphone selbst Getränke bestellen, ohne dass das Personal zum Tisch kommen und die Bestellung aufnehmen muss.

### So funktioniert es

1. Ein Spieler öffnet die für den Tisch vorgesehene Seite, gibt die **PIN** des Tisches ein und wählt Getränke aus der Karte aus.
2. Die Bestellung wird übermittelt und erscheint sofort in einem neuen Abschnitt **„Offene Bestellungen“** oben auf der Hauptübersicht, oberhalb der Tischübersicht.
3. Jedes Mal, wenn eine neue Bestellung eingeht, ertönt in der Admin-Übersicht ein Signalton („Bright Triangle“). Das Personal muss den Bildschirm also nicht ständig beobachten.
4. Für jede offene Bestellung werden Tischnummer, bestellte Artikel und Gesamtbetrag angezeigt.
5. Das Personal prüft die Bestellung und klickt auf **✓ Erledigt**, sobald die Getränke geliefert wurden.
6. Nach der Erledigung werden die Artikel der Bestellung automatisch zur Rechnung des Tisches hinzugefügt – eine manuelle Neueingabe ist nicht erforderlich.

**Sicherheit:** Die erforderliche PIN verhindert, dass andere Spieler oder Personen, die nicht am Tisch sitzen, Bestellungen auf Ihre Rechnung setzen.

**Tonsignale:** Der Signalton bei Bestelleingang richtet sich nach der Einstellung **Tonsignale** auf der Seite „Einstellungen“.

---

## Spielerabrechnungen

Wenn ein Spieler gehen möchte, während die anderen weiterspielen:

1. Klicken Sie auf der Tischkachel auf **🧾 Abrechnen**
2. Prüfen Sie die aktuelle Rechnung und die Tischgebühr
3. **Wählen Sie die Tischgebühr-Option:**
   - **Anteil des Spielers** – Gleichmäßige Aufteilung unter den ursprünglichen Spielern
   - **Volle Tischgebühr** – Der Spieler zahlt die gesamte Tischgebühr
   - **Tischgebühr überspringen** – Nur die Artikel bezahlen

4. **Wählen Sie Artikel aus:**
   - Wählen Sie mit den Mengenreglern die Artikel aus, die der Spieler konsumiert hat
   - Teilmengen können abgerechnet werden (z. B. 1 von 3 Bieren)

5. Klicken Sie auf **💰 Abrechnen**

**Was passiert:**
- Ausgewählte Artikel werden von der Rechnung entfernt oder ihre Menge wird reduziert
- Die Spielerzahl sinkt um 1
- Die Ansicht der verbleibenden Spieler wird automatisch aktualisiert
- Ein Beleg kann gedruckt werden

**Wichtig:** Abrechnungsbeträge basieren auf der *ursprünglichen* Tischgebühr vor vorherigen Spielerabrechnungen.

---

## Sitzungen beenden (Kassieren)

Wenn alle Spieler fertig sind:

1. Klicken Sie auf der Tischkachel auf **✓ Kassieren**
2. Prüfen Sie die endgültigen Kosten:
   - Tischgebühr (basierend auf der Gesamtdauer)
   - Alle Artikel auf der Rechnung
   - Frühere Spielerabrechnungen (als Abzüge ausgewiesen)
3. **Optional:** Klicken Sie auf **🖨 Beleg drucken**, um eine Papierkopie zu erhalten
4. Klicken Sie auf **Sitzung beenden**, um den Vorgang abzuschließen

**Was passiert:**
- Der Endbetrag wird berechnet
- Die Sitzung wird als abgeschlossen markiert
- Der Tisch ist für die nächste Sitzung verfügbar
- Die Daten werden für Berichte gespeichert

---

## Abonnements

### Was sind Abonnements?

Abonnements sind im Voraus bezahlte Mitgliedschaften, die Rabatte auf Tischgebühren bieten.

### Abonnements anzeigen

1. Öffnen Sie das Menü (☰)
2. Klicken Sie auf **Abonnements**
3. Sehen Sie alle aktiven Abonnements mit folgenden Angaben:
   - Name des Spielers
   - Startdatum
   - Enddatum
   - Aktueller Status

### Abonnements verwenden

Beim Starten einer Sitzung:
1. Legen Sie die Spielerzahl fest
2. Aktivieren Sie die Kontrollkästchen neben den Namen der Abonnenten
3. Das System wendet den Rabatt automatisch an

**Vorteile:**
- Reduzierte oder vollständig entfallende Tischgebühren
- Erfasste Nutzung für Analysen
- Förderung regelmäßiger Besuche

---

## Öffentliche Tischansicht

Spieler können ihre Rechnung auf jedem Gerät in Echtzeit einsehen und selbst Getränke bestellen.

### Tischansicht aufrufen

**URL-Format:** `http://[server]/table.html?number=[table_number]`

Beispiel: `http://localhost:3000/table.html?number=5`

### Erster Zugriff

1. Der Spieler ruft die URL auf
2. Er gibt die 4-stellige PIN ein (wird in der Übersicht angezeigt)
3. Die PIN wird für die Dauer der Sitzung gespeichert

### Anzeige für Spieler

- Tischnummer und -typ
- Aktuelle Dauer
- Spielerzahl
- Alle Artikel auf der Rechnung mit Mengen und Preisen
- Tischgebühr (Stunden und Betrag)
- Laufender Gesamtbetrag
- Eine Getränkekarte, aus der direkt bestellt werden kann (PIN erforderlich) – siehe [Offene Bestellungen](#pending-orders-player-self-service)

**Automatische Aktualisierung:** Die Ansicht wird automatisch aktualisiert (etwa alle 10 Sekunden und sofort, wenn Sie zum Tab zurückkehren), sodass erledigte Bestellungen und Änderungen an der Rechnung zeitnah erscheinen.

### QR-Codes

Auf jeder Kachel eines belegten Tisches in der Übersicht wird ein **QR-Code** angezeigt, der direkt zur Ansicht dieses Tisches führt und die PIN bereits enthält. Spieler müssen ihn nur mit der Handykamera scannen, um ihre Sitzung zu verfolgen – URL oder PIN müssen nicht manuell eingegeben werden. Klicken Sie in der Übersicht auf den QR-Code, um ihn zu vergrößern (praktisch zum Drucken oder Anzeigen am Tisch).

**Den in QR-Codes verwendeten Hostnamen festlegen:** Standardmäßig verweisen QR-Codes auf die Adresse, über die Ihr Browser die Admin-Übersicht aufgerufen hat (z. B. `http://localhost:3000`); diese funktioniert nur auf demselben Gerät. Damit Spieler QR-Codes mit ihren Smartphones scannen können, legen Sie unter Admin → Einstellungen die **Öffentliche Basis-URL** auf den Hostnamen/die IP-Adresse oder den FQDN fest, den Ihre Smartphones tatsächlich erreichen können, zum Beispiel `http://[IP_ADDRESS]:3000` oder `https://pool.example.com`. Lassen Sie das Feld leer, um die aktuelle Browseradresse zu verwenden.

---

## Admin-Funktionen

Zugriff über das Menü (☰) → **Admin-Bereich**

### Tischtypen & Inventar

**Tischtypen verwalten:**
- Neue Tischtypen hinzufügen (z. B. „Billard“, „Karambol“)
- Stundensätze in Ihrer Währung festlegen
- Den **MwSt.-Satz** festlegen, der auf die Zeitgebühren dieses Tischtyps angewendet wird (20 %, 10 % oder 0 % – siehe [MwSt.-Berichte (TVA)](#vat-tva-reporting--france))
- Bestehende Typen bearbeiten oder löschen

**Tische verwalten:**
- **Tische hinzufügen:** Geben Sie eine Anzahl an, um mehrere Tische gleichzeitig anzulegen (fortlaufende automatische Nummerierung)
- **Umnummerieren:** Klicken Sie neben einer Tischnummer auf den **Stift**, geben Sie die neue Nummer ein und drücken Sie die Eingabetaste (bereits verwendete Nummern werden mit einer erklärenden Meldung abgelehnt)
- **Tische löschen:** Nicht verwendete Tische entfernen
- **Wartungsmodus einstellen:** Tische vorübergehend deaktivieren; bei der Wiederinbetriebnahme wird der Nutzungszähler seit der letzten Wartung zurückgesetzt
- **Typen sortieren:** Verwenden Sie die Schaltflächen **↑/↓** bei jedem Typ, um die Reihenfolge in der Übersicht, den Übersicht-Tabs/der Flaggennavigation und auf der öffentlichen Statusseite zu ändern

**Massenaktionen:**
- Mehrere Tische desselben Typs hinzufügen (1–50 auf einmal)
- Tische erhalten automatisch die jeweils nächste verfügbare Nummer

### Getränkekarte verwalten

1. Klicken Sie auf **Getränkekarte**
2. **Neuen Artikel hinzufügen:**
   - Name
   - Preis
   - MwSt.-Satz (20 % regulär, 10 % ermäßigt oder 0 % steuerfrei – siehe [MwSt.-Berichte (TVA)](#vat-tva-reporting--france))
   - **Kategorie** – Kalt, Heiß, Alkoholisch, Sonstiges (oder keine). Kategorien gliedern die Karte auf der Bestellseite für Spieler und im Dialog „Getränk hinzufügen“ der Übersicht.
3. **Bearbeiten/Löschen:** Verwenden Sie die Stift-/Papierkorb-Schaltflächen neben den Artikeln

**Mehrsprachige Unterstützung:**
- Für Artikel können englische und französische Namen hinterlegt werden
- Die Anzeigesprache kann unter Einstellungen geändert werden

### Kasse & Zahlungen (optionales Kassensystem)

Zahlungen sind **standardmäßig deaktiviert**. Aktivieren Sie sie unter **Einstellungen → Allgemein → „Zahlungen (POS)“** (für Kartenterminals siehe auch [Kartenzahlungen einrichten](#setting-up-card-payments-administrator)).

Nach der Aktivierung:

- Beim **Kassieren** wird das Geld vor Ausstellung der Rechnung eingezogen:
  - **Bargeld:** Geben Sie den erhaltenen Bargeldbetrag ein und klicken Sie auf **Zahlung hinzufügen** (das Rückgeld wird angezeigt). Mit **Genauer Betrag** können Sie den Restbetrag exakt begleichen.
  - **Karte (Terminal):** Klicken Sie auf **Karte (Terminal) — €X**. Ein Banner „Karte am Terminal vorhalten …“ erscheint; der Kunde hält seine Karte vor oder steckt sie ein, und die Zahlung wird automatisch hinzugefügt. Mit **Abbrechen** wird der Vorgang am Terminal beendet.
  - **Geteilte Zahlungen:** Fügen Sie mehrere Zahlungen (bar und/oder per Karte) hinzu, bis der Restbetrag null beträgt. **Kassieren abschließen** ist erst aktiviert, wenn die Rechnung vollständig bezahlt ist.
  - Rabatte können nicht mehr geändert werden, sobald eine Zahlung hinzugefügt wurde (verhindert Abweichungen beim Betrag).
- Auf **Belegen** (Bildschirm und gedruckte Rechnung) werden die Zahlungsarten und ein gegebenenfalls fälliges Rückgeld aufgeführt.
- **Admin → Kasse & Zahlungen** (wird nur bei aktivierter Funktion angezeigt):
  - **Kassenschicht:** Öffnen Sie zu Tagesbeginn eine Schicht mit einem Anfangsbestand; tragen Sie beim Kassenabschluss das gezählte Bargeld ein – der erwartete Gesamtbetrag (Anfangsbestand + Nettobargeld) und die **Differenz** werden berechnet. Bei einer Differenz ungleich null wird die konfigurierte Wartungs-E-Mail-Adresse benachrichtigt (wenn SMTP eingerichtet ist).
  - **Erstattungen:** Pro Zahlung, mit Betrag (Teilbeträge sind möglich) und optionalem Grund. Bei Erstattung einer in Rechnung gestellten Zahlung wird eine nummerierte **Gutschrift (avoir)** erstellt; eine Meldung zeigt ihre Nummer.
  - **Gutschriften:** Werden mit einer Schaltfläche **Drucken** aufgelistet (fügt den Verweis auf den ursprünglichen Beleg und die MwSt.-Aufschlüsselung hinzu; speichern Sie sie über den Druckdialog als PDF).
  - **Tagesabschluss & Abrechnung:** Wählen Sie ein Datum, um Zahlungen nach Zahlungsart, Gutschriften und erwarteten/gezählten Kassenbestand sowie Differenz anzuzeigen; mit **CSV exportieren** wird das Zahlungsjournal heruntergeladen; **Tag abschließen** sperrt den Tag (nicht möglich, solange eine Kassenschicht geöffnet ist).
- Unter **Berichte → Finanzen** werden die Zeilen **Bar-/Kartenzahlungen** und **Erstattungen (Gutschriften)** angezeigt (auch in PDF- und Excel-Exporten). Der **MwSt.-Bericht / TVA** zieht Gutschriften ab und enthält die Kategorie *Erstattungen (Gutschriften)*.

### Einstellungen

Zugriff über das Menü (☰) → **Einstellungen**

**Verfügbare Einstellungen:**

- **Anwendungsname:** In der Kopfzeile angezeigter Name (z. B. „Joes Billardsalon“)
- **Öffentliche Basis-URL:** Hostname/IP oder FQDN für die Tisch-QR-Codes (siehe [QR-Codes](#qr-codes)); leer lassen, um die Adresse zu verwenden, über die Sie gerade auf die Anwendung zugreifen
- **Dashboard-Layout:** Abschnitte (einklappbare Gruppen + Flaggennavigation) oder Tabs (ein Typ pro Tab)
- **Sprache:** English, Français, Deutsch, Español oder Italiano – ändert die Benutzeroberfläche auf diesem Gerät (auch in der Kopfzeile, auf der Spielertischseite und der öffentlichen Statusseite auswählbar)
- **Währung:** $ (USD), € (EUR) oder £ (GBP)
- **Abonnentenrabatt:** Rabattprozentsatz (0–100 %)
- **Tonsignale:** Klickgeräusche der Benutzeroberfläche und Signalton bei neuen Bestellungen ein- oder ausschalten
- **Steuer- / Rechtsangaben:** Rechtlicher Firmenname, SIRET, SIREN, innergemeinschaftliche TVA-Nummer, eingetragene Anschrift, MwSt.-Regelung und Erklärungszeitraum – für den MwSt.-Bericht und Ihre Unterlagen (siehe [MwSt.-Berichte (TVA)](#vat-tva-reporting--france))

**Gefahrenzone:**
- **Gesamten Sitzungsverlauf löschen:** Abgeschlossene Sitzungen dauerhaft löschen
  - Erfordert eine doppelte Bestätigung
  - Laufende Sitzungen sind NICHT betroffen
  - Sitzungen innerhalb eines **geschlossenen MwSt.-Zeitraums** sind ebenfalls geschützt und werden nicht gelöscht

---

## Kartenzahlungen einrichten (Administration)

### Was Sie benötigen

- Die Anwendung läuft (Docker) auf einem Rechner mit Internetzugang.
- Ein **Stripe-Konto** (mit bestätigten Unternehmensangaben). Beginnen Sie im **Testmodus**.
- Ein **Stripe Terminal-Lesegerät** (z. B. WisePOS E), das mit dem WLAN des Lokals gekoppelt ist – oder zum Testen ein **simuliertes Stripe-Lesegerät**.
- **Stripe muss Ihren Server erreichen können** unter `https://<your-domain>/api/webhooks/stripe` (öffentliches HTTPS, Reverse-Proxy oder während der Pilotphase ein Tunnel). Die Anwendung selbst kann im LAN weiterhin HTTP verwenden.
- Für Lokale, die ausschließlich Bargeld akzeptieren, ist nichts davon erforderlich: Aktivieren Sie einfach Zahlungen und nehmen Sie Bargeld an.

### Schritte

1. **Stripe (Testmodus)**
   - Koppeln/registrieren Sie das Lesegerät (Dashboard → Terminal → Readers); notieren Sie seine ID (`tmr_…`).
   - Developers → Webhooks → fügen Sie `https://<your-domain>/api/webhooks/stripe` mit den Ereignissen `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled` hinzu; kopieren Sie das Signaturgeheimnis (`whsec_…`).
2. **Serverkonfiguration** (Compose-Umgebung / `.env`), anschließend neu starten (`docker compose up -d`):
   - `STRIPE_SECRET_KEY=sk_test_…` (später den Live-Schlüssel verwenden)
   - `STRIPE_TERMINAL_READER_ID=tmr_…`
   - `STRIPE_WEBHOOK_SECRET=whsec_…`
   - `COOKIE_SECURE=true`, wenn die Anwendung über HTTPS bereitgestellt wird
3. **Anwendungseinstellungen**
   - **Einstellungen → Allgemein → „Zahlungen (POS)“ → ein**.
   - Die Währung muss `€`, `$` oder `£` sein (wird als eur/usd/gbp an Stripe übermittelt).
   - Legen Sie den Anwendungsnamen sowie die Steuer- / Rechtsangaben fest (für Berichte und Ihre Unterlagen).
   - Optional: SMTP-Einstellungen und E-Mail-Adresse für Wartungshinweise bei Kassenabweichungen.
4. **Ohne Hardware testen**
   - `PAYMENT_PROVIDER=fake` in der Umgebung: Zahlungen werden sofort erfasst (kein Terminal, kein Netzwerk) – geeignet für Schulungen/Tests der Benutzeroberfläche.
   - Oder verwenden Sie den Stripe-Testmodus mit einem **simulierten Lesegerät**, um den echten Kartenzahlungsablauf zu testen.
5. **Checkliste für die Pilotphase vor dem Echtbetrieb**
   - Bargeldverkauf mit geteilter Zahlung und Rückgeld; Kartenzahlung; abgelehnte Karte und erneuter Versuch; Abbruch am Terminal; teilweise Erstattung (Gutschrift drucken); Kassenschicht abschließen; Tag abschließen und CSV exportieren.
   - Wechseln Sie erst dann zu Live-Schlüsseln bei Stripe, wenn die Pilotphase erfolgreich abgeschlossen wurde.

### Fehlerbehebung & Betrieb

- **Webhook kommt nicht an** (Terminal zeigt „bezahlt“, aber in der Anwendung steht weiterhin „wird vorgelegt“): Prüfen Sie die Endpunkt-URL, das Signaturgeheimnis und die Ereignisabonnements. Die Anwendung fragt außerdem den Zahlungsstatus ab und synchronisiert veraltete Kartenzahlungen bei jedem Aufruf der Kassenseite erneut. Wenn die Zahlung abgebrochen wurde, klicken Sie unter Admin → Kasse & Zahlungen daneben auf **Abbrechen**.
- **Terminal- und Anwendungssummen weichen** auf der Karte zum Tagesabschluss voneinander ab: Die Zeile „Terminal (Stripe)“ stammt aus Stripe-Guthabentransaktionen (Bruttobetrag abzüglich Erstattungen zuzüglich der angezeigten Gebühren). Prüfen Sie die Anzeige der Zahlungsgebühren, Erstattungen im Stripe-Dashboard und ob die Tagesgrenze Ihrem Buchhaltungstag entspricht. Die Zeile wird nur angezeigt, wenn Stripe-Abrechnungsdaten verfügbar sind.
- **Zahlungen schnell deaktivieren:** Schalten Sie **Einstellungen → Allgemein → „Zahlungen (POS)“** aus – beim Kassieren wird das Verhalten vor Einführung des Kassensystems wiederhergestellt, Kartenoptionen werden ausgeblendet und die Kassenseite wird verborgen. Bestehende Belege, Gutschriften und Verlaufsdaten bleiben unverändert.
- **Schlüssel/Lesegerät austauschen:** Aktualisieren Sie `STRIPE_SECRET_KEY` / `STRIPE_TERMINAL_READER_ID` / `STRIPE_WEBHOOK_SECRET` in der Umgebung und starten Sie neu (`docker compose up -d`). Verwenden Sie das alte Lesegerät nicht mehr im Stripe-Dashboard.
- **Echtbetrieb starten:** Ersetzen Sie Testschlüssel/-geheimnisse durch Live-Daten und wiederholen Sie die Pilot-Checkliste mit einer kleinen echten Zahlung, bevor Sie Kartenzahlungen ankündigen.
- **Lokale mit reiner Bargeldzahlung:** Eine Stripe-Einrichtung ist nicht nötig; aktivieren Sie Zahlungen und nehmen Sie Bargeld an. Kassenschichten, Erstattungen, Gutschriften, Tagesabschluss und CSV funktionieren ohne Terminal.

### Wissenswertes

- **Ein Lesegerät pro Bereitstellung:** Die Lesegeräte-ID wird in der Umgebung konfiguriert. Für mehrere Kassen wäre eine Auswahl des Lesegeräts erforderlich (derzeit nicht implementiert).
- **Internetverbindung erforderlich:** Kartenzahlungen benötigen eine Verbindung. Wird sie während einer Zahlung unterbrochen, kann der Status „wird vorgelegt“ bestehen bleiben – brechen Sie die Zahlung über die Kassenseite ab oder erstatten Sie sie. Bargeld funktioniert immer.
- **Einzelne Personal-Anmeldung:** Die Anwendung hat derzeit ein Admin-Konto; Zahlungen/Gutschriften werden diesem Benutzer zugeordnet.
- **NF525 (Frankreich):** Die Anwendung erfasst Verkäufe und Zahlungen mit fortlaufend nummerierten Belegen, unveränderlichen Positionen, Gutschriften und Periodenabschlüssen – die Zertifizierung ist jedoch ein gesetzliches Bestätigungsverfahren. Klären Sie die Anforderungen mit Ihrem *expert-comptable*, bevor Sie mit Konformität werben oder Kartenzahlungen im Produktivbetrieb aktivieren.
- Diese Funktion integriert **Zahlungen**, nicht ein externes Bar-Kassensystem (Synchronisierung von Karte/Bestellungen) und auch keine Selbstzahlung durch Kunden per Smartphone.

## Berichte

Zugriff über **Admin → Berichte**. Die Seite enthält zwei Tabs: **Finanzen** und **MwSt. / TVA**.

### Finanzberichte

Erstellen Sie detaillierte Umsatzberichte für einen beliebigen Zeitraum.

**Zeitraumtypen:**
- **Tag:** Bestimmtes Datum mit Sitzungsdetails
- **Woche:** 7-Tage-Zeitraum ab Montag
- **Monat:** Vollständiger Kalendermonat
- **Quartal:** Q1, Q2, Q3 oder Q4
- **Jahr:** Jahresübersicht

**Berichtsinhalte:**

1. **Gesamtumsatz** – Alle Quellen zusammen

2. **Umsatz nach Tischtyp**
   - Amerikanischer Pool: €X
   - Pool: €X
   - Snooker: €X
   - Französisch: €X

3. **Umsatz aus Getränken/Artikeln** – Verkäufe von Speisen und Getränken

4. **Umsatz aus Abonnements** – Im Zeitraum aktive Abonnements

5. **Zeitreihenanalyse** (Wochen-/Monats-/Quartals-/Jahresberichte)
   - Umsatztrends im Zeitverlauf
   - Analyse nach Wochentag
   - Ermittlung der Stoßzeiten

6. **Tagesdetails** (nur Tagesberichte)
   - Aufschlüsselung einzelner Sitzungen
   - Tischnutzung je Sitzung
   - Details auf Artikelebene
   - Gebühren können bearbeitet/gelöscht werden

### Berichte verstehen

**Enthalten:**
- Tischgebühren abgeschlossener Sitzungen
- Alle Kartenartikel und benutzerdefinierten Gebühren
- Abonnementumsätze

**Nicht enthalten:**
- Laufende Sitzungen
- Buchungen aus Spielerabrechnungen (diese sind interne Anpassungen)
- Tische in Wartung oder mit pausiertem Betrieb

**Automatisches Laden:** Der Bericht für den aktuellen Tag wird automatisch erstellt, wenn Sie die Berichtsseite öffnen.

---

## MwSt.-Berichte (TVA) – Frankreich

> ⚠️ **Keine Rechts- oder Steuerberatung.** Lassen Sie sich von Ihrem *expert-comptable* bestätigen, dass diese Zahlen und Verfahren vor der Abgabe Ihrer Erklärung mit der spezifischen MwSt.-Regelung Ihres Betriebs übereinstimmen. Vollständige Hinweise zur Konformität finden Sie unter [VAT-COMPLIANCE.md](VAT-COMPLIANCE.md).

Der Tab **MwSt. / TVA** der Berichtsseite bereitet Ihre regelmäßige MwSt.-Erklärung (CA3/CA12) vor.

### MwSt.-Bericht erstellen

1. Wählen Sie einen **Zeitraumtyp** (Monat, Quartal, Jahr oder Tag) und den konkreten Zeitraum aus.
2. Klicken Sie auf **MwSt.-Bericht laden**, um eine Aufschlüsselung nach MwSt.-Satz anzuzeigen:
   - Gesamt HT (ohne MwSt.)
   - TVA (MwSt.-Betrag)
   - Gesamt TTC (einschließlich MwSt.)
3. Unter der Tabelle wird eine Aufschlüsselung nach Kategorie (Tischzeit, Getränke, Rabatte, Sonstiges) angezeigt.

### Zeitraum abschließen

Nachdem Sie Ihre Erklärung für einen Zeitraum bei den Steuerbehörden eingereicht haben, klicken Sie auf **Zeitraum schließen**. Dadurch:
- werden die Summen des Zeitraums als Nachweis gespeichert.
- wird verhindert, dass **Gesamten Sitzungsverlauf löschen** jemals Verkäufe innerhalb dieses Zeitraums löscht. So bleiben Ihre eingereichten Zahlen in der Datenbank jederzeit nachvollziehbar.

Abgeschlossene Zeiträume erscheinen unter dem Bericht in einer Verlaufsliste mit Zeitraum, Summen und der Person, die den Abschluss vorgenommen hat.

### Daten für Ihre Steuerberatung exportieren

Klicken Sie auf **CSV-Journal exportieren**, um jede einzelne Verkaufsposition des ausgewählten Zeitraums herunterzuladen (Datum, Tisch/Sitzung, Beschreibung, Menge, Stückpreis, MwSt.-Satz, MwSt.-Betrag, HT-Betrag) – praktisch zur Weitergabe an Ihre Steuerberatung oder zur langfristigen Archivierung.

### MwSt.-Berichte korrekt halten

- Legen Sie den MwSt.-Satz für jedes Getränk und jeden Tischtyp unter Admin korrekt fest (siehe [Getränkekarte verwalten](#drink-menu-management) und [Tischtypen & Inventar](#table-types--inventory)).
- Verwenden Sie zum Beenden von Sitzungen mit Umsätzen **immer „✓ Kassieren“ → Zahlung abschließen** – dadurch wird die Tischzeitgebühr erfasst und ein fortlaufend nummerierter Beleg ausgestellt. Wenn Sie eine Sitzung auf andere Weise beenden, fehlt diese Tischzeitgebühr im MwSt.-Bericht.
- Tragen Sie Ihre **Steuer- / Rechtsangaben** in den Einstellungen ein (SIRET, TVA-Nummer, MwSt.-Regelung usw.), damit sie beim Einreichen verfügbar sind.

---

## Tipps und bewährte Vorgehensweisen

### Für den täglichen Betrieb

1. **Tagesbeginn:**
   - Prüfen Sie, ob Tische versehentlich noch als „belegt“ markiert sind
   - Prüfen Sie den Bericht des Vortags
   - Stellen Sie sicher, dass alle Tische als „verfügbar“ markiert sind

2. **Während des Betriebs:**
   - Nutzen Sie die Schnellzugriffsschaltflächen für Getränke, um Zeit zu sparen
   - Prüfen Sie die PIN mit den Spielern, wenn sie ihre Rechnung aufrufen möchten
   - Behalten Sie lange laufende Sitzungen im Blick

3. **Tagesende:**
   - Kassieren Sie alle noch laufenden Sitzungen ab
   - Erstellen Sie den Tagesbericht
   - Prüfen Sie Probleme oder Anpassungen

### Bei Spielerabrechnungen

- Prüfen Sie vor dem Abrechnen immer die Spielerzahl
- Drucken Sie Belege für die Unterlagen der Kunden
- Prüfen Sie genau, ob die ausgewählten Artikel dem Verbrauch des Spielers entsprechen

### Für korrekte Daten

- Fügen Sie Artikel sofort zur Rechnung hinzu (warten Sie nicht bis zum Kassieren)
- Verwenden Sie benutzerdefinierte Gebühren für Artikel, die nicht auf der Karte stehen
- Prüfen Sie zu Sitzungsbeginn, ob die Spielerzahl stimmt

### Für guten Kundenservice

- Teilen Sie den Spielern frühzeitig während der Sitzung die Tisch-URLs mit
- Bringen Sie QR-Codes für einen einfachen Zugriff in Tischnähe an
- Erläutern Sie die Vorteile eines Abonnements, um Anmeldungen zu fördern

---

## Tastenkombinationen

Derzeit wird die Anwendung mit Maus und Touch bedient; Tastenkombinationen gibt es nicht. Alle Aktionen erfolgen durch Klicken auf Schaltflächen.

---

## Zugriff über Mobilgeräte

Die Anwendung ist vollständig responsiv und funktioniert auf:
- Desktop-Browsern
- Tablets
- Smartphones

**Empfohlen für:**
- Personal: Desktop/Tablet für die Übersicht
- Spieler: Smartphones für die Tischansicht

---

## Fehlerbehebung

### Häufige Probleme

**„Sitzung konnte nicht gestartet werden“**
- Prüfen Sie, ob der Tisch tatsächlich verfügbar ist
- Stellen Sie sicher, dass die Zahl der Abonnenten nicht größer als die Gesamtspielerzahl ist
- Aktualisieren Sie die Seite und versuchen Sie es erneut
- Wenden Sie sich an den Administrator, falls das Problem weiterhin besteht

**PIN funktioniert nicht**
- Prüfen Sie, ob die PIN mit der in der Übersicht angezeigten übereinstimmt
- Prüfen Sie, ob die Tischnummer korrekt ist
- Die PIN läuft ab, wenn die Sitzung endet

**Artikel erscheinen nicht auf der Rechnung**
- Prüfen Sie, ob der Artikel hinzugefügt wurde (achten Sie auf eine Erfolgsmeldung)
- Warten Sie etwa 10 Sekunden auf die automatische Aktualisierung (öffentliche Ansicht) oder kehren Sie zum Tab zurück, um sofort zu aktualisieren
- Aktualisieren Sie die Übersicht manuell

**Falsche Beträge werden angezeigt**
- Prüfen Sie die Währungseinstellung
- Prüfen Sie, ob Spielerabrechnungen vorgenommen wurden
- Prüfen Sie die einzelnen Positionen in den Sitzungsdetails

### Hilfe erhalten

Wenn das Problem weiterhin besteht:
1. Notieren Sie Tischnummer und Uhrzeit
2. Erstellen Sie nach Möglichkeit einen Screenshot
3. Wenden Sie sich an den Systemadministrator
4. Prüfen Sie die Docker-Protokolle (für Administratoren)

---

## Häufig gestellte Fragen

**F: Kann ich eine Sitzung bearbeiten, nachdem sie gestartet wurde?**
A: Ja, während der Sitzung können Sie Artikel hinzufügen/entfernen und die Spielerzahl anpassen.

**F: Was passiert, wenn ich eine Sitzung versehentlich beende?**
A: Beendete Sitzungen können nicht wieder geöffnet werden. Sie müssen eine neue Sitzung starten.

**F: Können Spieler selbst Artikel hinzufügen?**
A: Nein, nur das Personal kann Artikel hinzufügen. Spieler können ihre Rechnung lediglich einsehen.

**F: Wie gehe ich mit Freispielen um?**
A: Starten Sie eine Sitzung mit 1 Spieler, fügen Sie Artikel hinzu, kassieren Sie anschließend ab und berechnen Sie nichts.

**F: Kann ich den Stundensatz während einer Sitzung ändern?**
A: Nein, Änderungen des Stundensatzes gelten nur für neue Sitzungen. Für laufende Sitzungen gilt der ursprüngliche Satz.

**F: Was passiert, wenn das Internet ausfällt?**
A: Das System benötigt Netzwerkzugriff. Laufende Sitzungen bleiben bestehen, aber Aktualisierungen pausieren, bis die Verbindung wiederhergestellt ist.

**F: Kann ich Berichtsdaten exportieren?**
A: Derzeit können Berichte nur angezeigt werden. Verwenden Sie zum Speichern den Browserdruck oder den PDF-Export.

**F: Wie weit zurück kann ich Berichte anzeigen?**
A: Solange der Sitzungsverlauf aufbewahrt wird (bis er manuell über die Einstellungen gelöscht wird).

---

## Funktionsübersicht

### Kernfunktionen
✓ Sitzungen in Echtzeit überwachen
✓ Automatische zeitbasierte Abrechnung
✓ Unterstützung mehrerer Spieler mit Einzelabrechnungen
✓ PIN-geschützte Spieleransichten
✓ Verwaltung von Getränken und Artikeln
✓ Unterstützung benutzerdefinierter Gebühren
✓ Tischwechsel
✓ Belege drucken
✓ Selbstbedienungsbestellung von Getränken durch Spieler mit akustisch signalisierten offenen Bestellungen
✓ QR-Codes für den direkten Tischzugriff per Smartphone

### Admin-Funktionen
✓ Verwaltung von Tischtypen und Inventar
✓ Tische gesammelt anlegen
✓ Getränkekarte mit MwSt.-Sätzen konfigurieren
✓ Abonnements verwalten
✓ Finanzberichte für verschiedene Zeiträume
✓ MwSt.-Berichte (TVA), CSV-Export und Periodenabschlüsse für die französischen Vorschriften
✓ Unterstützung mehrerer Währungen
✓ Rabattsystem für Abonnenten
✓ Sitzungsverlauf verwalten
✓ Öffentliche Basis-URL für QR-Codes konfigurierbar
✓ Steuer- und Rechtsangaben des Unternehmens

### Spielerfunktionen
✓ Rechnungen in Echtzeit anzeigen
✓ Automatische Aktualisierung der Anzeige
✓ Für Mobilgeräte optimierte Oberfläche
✓ PIN-geschützter Zugriff
✓ Getränke per QR-Code selbst bestellen

---

## Support

Bei technischem Supportbedarf oder für Funktionswünsche wenden Sie sich an Ihren Systemadministrator.

---

**Version:** 1.0  
**Zuletzt aktualisiert:** Dezember 2025

---

Vielen Dank, dass Sie Pool Tables Manager verwenden! Wir hoffen, dieses Handbuch hilft Ihnen dabei, die Anwendung optimal zu nutzen. Entwickler finden technische Dokumentation in `DEVELOPER_README.md`.
