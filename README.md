## v1.1.8 - 2026-04-09
### Observability aktiviert
- wrangler.toml: [observability] logs (enabled + invocation_logs) + traces enabled

## v1.1.7 - 2026-04-04
### Neu: PDF-Fallback fuer Testkunden
- Wenn Angebots-PDF nicht in R2 vorhanden, wird automatisch das Demo-PDF gezeigt
  (noetig fuer Testkunden wie Weichert.at die kein eigenes PDF hochgeladen haben)

---

## v1.1.6 - 2026-04-04
### Behoben: Bestelldokument-Link fuehrte zur Anmeldemaske
- Bug 1: bestellung_url fehlte im Order-Response (war bestellung_key statt URL)
  Fix: Response gibt jetzt bestellung_url = /api/bestellung/{orderId}?sid={session_id}
- Bug 2: Session nach Bestellung als used=1 markiert, Auth-Check blockierte Endpoint
  Fix: Bestelldokument-Endpoint erlaubt Sessions mit used=1 (48h nach Bestellung)
- Bug 3: HTML hatte doppeltes display-Property (display:none und display:inline-flex)
  Fix: Wrapper-div steuert Sichtbarkeit, Link-Button immer display:inline-flex

---

## v1.1.5 - 2026-04-04
### Behoben
- Unterschriften-Canvas funktionierte nicht: Canvas wurde beim Seitenstart initialisiert,
  waehrend das Angebot-View noch ausgeblendet war (display:none).
  getBoundingClientRect() gab Breite 0 zurueck, Canvas hatte keine Zeichenflaeche.
- Fix: Lazy Init (ensureCanvas) - Canvas wird erst initialisiert wenn View sichtbar ist
  Aufruf via setTimeout(ensureCanvas, 50) nach showView('angebot')

---

## v1.1.4 - 2026-04-04
### Neu: Bestelldokument als PDF (statt HTML)
- Verwendet pdf-lib (rein JavaScript, laeuft nativ in Cloudflare Workers)
- DIN-A4 PDF mit professionellem vonBusch-Layout
- Echtes vonBusch Logo (PNG) eingebettet oben links
- Inhalte: Auftraggeber, Auftragsdetails, Rate/Laufzeit/Servicevertrag
- Digitale Unterschrift als eingebettetes PNG-Bild
- Bestaetigungsstempel "Verbindliche Beauftragung"
- Rechtlicher Hinweis (GoBD, Paragraph 147 AO)
- Footer mit von Busch Adressdaten und Dokument-ID
- Gespeichert in vonbusch-crm-archiv als .pdf (unveraenderlich, Bucket Lock)
- Endpoint: GET /api/bestellung/{orderId} liefert PDF direkt aus Archiv

---

## v1.1.3 - 2026-04-04
### Neu: Bestelldokument (HTML, revisionssicher archiviert)
- Bei jeder Auftragserteilung wird automatisch ein HTML-Bestelldokument erstellt
- Inhalt: Firmendaten, Angebotsnummer, Finanzierungsdetails, Servicevertrag, Datum
- Digitale Unterschrift wird direkt eingebettet (als base64-PNG)
- Gespeichert in vonbusch-crm-archiv (Bucket Lock: unveraenderlich)
  Pfad: bestellungen/YYYY/MM/{orderId}-bestellung.html
- Als Dokument im CRM registriert (doc_type: Bestellung, is_archived: 1)
- Neuer Endpoint: GET /api/bestellung/{orderId} - liest aus Archiv
- Bestaetigungsseite: Link zum Bestelldokument
- CRM SoSS-Detail: Link zum Bestelldokument aus dem Archiv

---

## v1.1.2 - 2026-04-04
### Grundsaetzliche Aenderung: Finanzdaten kommen aus D1, nicht aus Regex
- Neues Feld fin_data (JSON) in documents-Tabelle (direkt in D1 ausgefuehrt)
- Financials-Endpoint liest fin_data zuerst - keine Regex-Extraktion noetig
- Nielsen Angebot 413251: fin_data direkt gesetzt (4314.69 EUR/Monat, 84 Monate)
- Regex-Fallback bleibt fuer Dokumente ohne fin_data
- Fuer neue Angebote: fin_data kann im CRM beim Upload gesetzt werden

---

## v1.1.1 - 2026-04-04
### Behoben: Kritischer ReferenceError in extractFinancials
- totalValue und contractMonths wurden zurueckgegeben aber nie deklariert
  Das verursachte einen 500-Fehler, res.json() schlug fehl, die Seite blieb bei
  'Wird geladen...' eingefroren
- contractMonths und totalValue wieder korrekt extrahiert (Laufzeit + Kaufpreis)
- loadFinancials() mit try-catch abgesichert so dass Fehler sichtbar werden

---

## v1.1.0 - 2026-04-04
### Behoben: Finanzierungswerte wurden nicht angezeigt
- Root Cause: Regex traf nicht weil "84 Monate" zwischen "Preis/Monat" und "4.314,69 EUR" steht
- Neue Extraktion: Sucht Preis/Monat mit bis zu 80 Zeichen Kontext dazwischen
- Zusaetzlicher Fallback: Miete-Block, "X Monate ... Y,YY EUR" Pattern
- fulltext_idx wird jetzt auch als Textquelle genutzt (Prio: R2 > fulltext_idx > summary)
- D1: fulltext_idx fuer Nielsen Design Angebot 413251 mit Finanzdaten befuellt

---

## v1.0.9 - 2026-04-04
### Verbessert: Finanzierungsoptionen
- Miete + Leasing zu einer Karte "Finanzierung" zusammengefasst
- Laufzeit aus dem Angebot (z.B. 84 Monate) direkt in der Karte
- Kauf-Karte nur anzeigen wenn Kaufpreis im Angebot vorhanden
- Finanzierungs-Karte nur anzeigen wenn Rate im Angebot vorhanden
- Kein "auf Anfrage" mehr - fehlende Werte = Karte wird nicht angezeigt
- Fallback-Text wenn gar keine Werte extrahiert werden konnten

---

## v1.0.8 - 2026-04-04
### Behoben
- Refinanzierer: Kein Kundenwahl mehr - wird intern von von Busch festgelegt
  Hinweistext bei Miete/Leasing: "Finanzierungspartner wird nach Bonitaetspruefung mitgeteilt"
- Rate Miete = Rate Leasing: Beide zeigen die Rate direkt aus dem Angebot (nicht 92% Faktor)
- Login-Seite: Platzhalter zeigt jetzt 12345 / 654321 statt echter Kundendaten

---

## v1.0.7 – 2026-04-04
### Architektur-Umbau (Build-Fix Root Cause)
- HTML aus TypeScript-Template-Literals herausgeloest -> keine verschachtelten Backticks mehr moeglich
- Neue Struktur: public/index.html (statische Datei) + src/index.ts (nur noch API-Routes)
- wrangler.toml: assets-Binding fuer Static Assets (public/ Ordner)
- Worker hat nur noch sauberes TypeScript ohne eingebettetes HTML/JS
- Alle bisherigen Features erhalten: Login, PDF, Finanzierungen, Servicevertrag, Signatur, CRM-Integration

---

## v1.0.6 – 2026-04-04
### Behoben
- Root-Ursache Build-Fehler behoben: Alle Backtick-Template-Literals im eingebetteten
  JavaScript-Script-Block durch String-Konkatenation ersetzt.
  Backticks innerhalb eines TypeScript-Template-Literals werden von esbuild als
  Abschluss des äußeren Literals interpretiert und crashen den Build.
- loadFinancials(): finCard()-Hilfsfunktion nutzt jetzt DOM-Methoden statt Template-Strings

---

## v1.0.5 – 2026-04-04
### Behoben
- Build-Fehler: Sonderzeichen U+00B7 (·) in Template-Literal → durch ASCII-Bindestrich ersetzt
- esbuild/wrangler konnte diesen Unicode-Punkt nicht parsen

---

## v1.0.4 – 2026-04-04
### Neu
- Light/Dark Mode Toggle (oben rechts, neben Abmelden)
- Standard: Light Mode — gespeicherte Wahl bleibt über Sessions
- Build-Nummer v1.0.4 unten links auf allen Seiten (Login, Angebot, Bestätigung)

---

## v1.0.3 – 2026-04-04
### Behoben
- Finanzierungswerte wurden nicht aus dem PDF übernommen (standen auf 0,00 €)
  → Neuer Endpoint /api/offer/financials liest R2-Textdatei und extrahiert sauber:
    Rate, Laufzeit, Gesamtwert, Kaufpreis, Abrechnungsturnus, Finanzierungsarten
  → Deutsche Zahlenformate (4.314,69 €) werden korrekt geparst

### Verbessert
- Servicevertrag-Sektion komplett überarbeitet:
  → Wenn Servicevertrag im Angebot enthalten: Grüne Box + vorausgewählte Checkbox
  → Wenn KEIN Servicevertrag im Angebot: "–,– €" + Hinweis "Kein Servicevertrag enthalten"
    + gestrichelte Box: "Möchten Sie einen Servicevertrag hinzufügen?"
    → Haken setzen → Sales Mitarbeiter meldet sich
  → service_interest Feld in D1 + CRM-Aktivität

---

# von Busch — Sales Offer Self Service (SoSS)

> Digitaler Auftragsabschluss für von Busch Kunden  
> **Live:** https://soss.vonbusch.app

---

## Inhaltsverzeichnis

1. [Systemüberblick](#1-systemüberblick)
2. [Kundenprozess](#2-kundenprozess)
3. [Technische Architektur](#3-technische-architektur)
4. [Authentifizierung](#4-authentifizierung)
5. [Finanzierungsoptionen](#5-finanzierungsoptionen)
6. [Digitale Unterschrift & Revisionssicherheit](#6-digitale-unterschrift--revisionssicherheit)
7. [Automatisierung im CRM](#7-automatisierung-im-crm)
8. [Bonitätsprüfung](#8-bonitätsprüfung)
9. [E-Mail-Benachrichtigungen](#9-e-mail-benachrichtigungen)
10. [Infrastruktur & Datenbank](#10-infrastruktur--datenbank)
11. [Offene Punkte & Roadmap](#11-offene-punkte--roadmap)

---

## 1. Systemüberblick

SoSS ersetzt den analogen Prozess „Angebot per Mail → Kunde druckt → unterschreibt → scannt → schickt zurück" durch einen vollständig digitalen Auftragsabschluss.

**Vorher:**
```
Angebot per Mail → Kunde druckt AB → unterschreibt → scannt → mailt zurück
→ Sachbearbeiter trägt manuell ein → Auftrag erteilt
```

**Mit SoSS:**
```
Angebot per Mail mit Link → Kunde öffnet soss.vonbusch.app → authentifiziert sich
→ sieht Angebot (PDF + Übersicht) → wählt Finanzierung → unterschreibt digital
→ beauftragt → alles läuft automatisch im Hintergrund
```

**Warum ein eigener Worker (nicht im CRM)?**

Das CRM läuft hinter Cloudflare Access — jeder Zugriff benötigt eine Zero-Trust-Lizenz. Kunden dürfen dort nicht ohne Lizenz rein. SoSS läuft ohne Access, mit eigener simpler Authentifizierung (Kundennummer + Angebotsnummer).

---

## 2. Kundenprozess

1. **E-Mail erhalten** — Angebot von von Busch mit Link zu `soss.vonbusch.app`
2. **Anmelden** — Kundennummer (z.B. `10051`) + Angebotsnummer (z.B. `413251`)
3. **Angebot prüfen** — PDF eingebettet + strukturierte Übersicht nebeneinander
4. **Finanzierungsart wählen** — Kauf / Miete / Leasing
5. **Refinanzierer wählen** — BFL / DLL / GRENKE / MLF (Mercator) / von Busch
6. **Servicevertrag** — optional einschließen
7. **Digital unterschreiben** — Maus oder Touch (Signatur-Pad direkt im Browser)
8. **Verbindlich beauftragen** — Ein Klick
9. **Bestätigungsmail** — sofort automatisch zugestellt
10. **Bestätigungsseite** — mit Referenznummer und nächsten Schritten

---

## 3. Technische Architektur

```
soss.vonbusch.app (öffentlich, kein Cloudflare Access)
      |
      v
Worker: vonbusch-soss (Cloudflare Workers + Hono.js)
      |
      |-- liest  --> D1: vonbusch-crm (Firmen, Dokumente, Deals)
      |-- liest  --> R2: vonbusch-crm-docs (Angebots-PDFs)
      |-- schreibt -> D1: vonbusch-soss (Sessions, Orders, Bonitätsprüfungen)
      |-- schreibt -> R2: vonbusch-crm-archiv (Unterschriften, revisionssicher)
      |-- schreibt -> D1: vonbusch-crm (Won-Deal, Aktivitäten)
```

| Resource | Name / ID | Zweck |
|---|---|---|
| Worker | vonbusch-soss | Dieser Worker |
| Domain | soss.vonbusch.app | Kundenzugang (kein CF Access) |
| D1 (eigen) | vonbusch-soss · `20c8ca7a-80ae-4df6-88eb-41c14ca6ebd2` | Sessions, Orders, Bonitätsprüfungen |
| D1 (shared) | vonbusch-crm · `da1d7413-7552-41c2-986d-e1ab43de972d` | Firmen, Dokumente, Deals, Aktivitäten |
| R2 (read) | vonbusch-crm-docs | Angebots-PDFs aus dem CRM |
| R2 (write) | vonbusch-crm-archiv | Unterschriften revisionssicher (Bucket Lock) |

### API-Routen

| Methode | Route | Beschreibung |
|---|---|---|
| GET | / | Login-Seite |
| POST | /api/auth/login | Authentifizierung (Kundennr. + Angebotsnr.) |
| GET | /api/auth/logout | Session beenden |
| GET | /angebot | Angebot + Signatur-Seite (Session erforderlich) |
| GET | /api/offer/pdf | PDF aus R2 (Session-gesichert) |
| POST | /api/order | Auftrag einreichen (Signatur + Finanzierung) |
| GET | /bestaetigung | Bestätigungsseite |
| GET | /health | Health-Check |

---

## 4. Authentifizierung

**Login:** Kundennummer + Angebotsnummer

| Eingabe | Beispiel | Quelle |
|---|---|---|
| Kundennummer | 10051 | Feld `erp_id` in CRM-companies |
| Angebotsnummer | 413251 | Zahl ohne Suffix (aus `413251-7`) |

**Matching-Logik:**
```
Kundennummer → companies WHERE erp_id = '10051'
Angebotsnummer → documents WHERE company_id = co.id
                             AND doc_type = 'Angebot'
                             AND subject LIKE '%413251%'
```

**Session:**
- JWT-Cookie `soss_session`, 48 Stunden gültig
- `httpOnly`, `Secure`, `SameSite=Lax`
- Einmalig verwendbar — nach Auftragsabschluss als `used=1` markiert
- Ablauf-Prüfung bei jedem Request via `expires_at > NOW()`

---

## 5. Finanzierungsoptionen

Die Finanzierungsdaten werden aus der KI-Extraktion des Angebots-PDFs gezogen (`documents.summary`). Im Live-Betrieb kommen die Daten aus JustIn (führendes System).

| Option | Beschreibung | Anzeige |
|---|---|---|
| Kauf | Einmalzahlung | Gesamtbetrag (netto zzgl. MwSt.) |
| Miete | Monatliche Rate | Rate/Monat, Laufzeit in Monaten |
| Leasing | Monatliche Rate | Rate/Monat (ca. 8% günstiger als Miete) |

**Refinanzierer** (bei Miete und Leasing):

| Kürzel | Name |
|---|---|
| BFL | BFL |
| DLL | DLL |
| GRENKE | Grenke |
| MLF | MLF (Mercator) |
| vonBusch | von Busch (Eigenfinanzierung) |

**Servicevertrag:** Optional zuschaltbar (Checkbox), wird im Auftrag protokolliert.

---

## 6. Digitale Unterschrift & Revisionssicherheit

### Unterschriften-Pad

- Technologie: HTML5 Canvas API
- Eingabe: Maus + Touch (Finger, Stift)
- DPI-skaliert für hochauflösende Displays
- Prüfung: Abschluss nur möglich wenn Unterschrift gesetzt

### Speicherung (revisionssicher)

Die Unterschrift wird als PNG in `vonbusch-crm-archiv` gespeichert — dem R2-Bucket mit **Bucket Lock: Indefinitely**.

```
Pfad: signatures/YYYY/MM/{order-id}-signature.png

Metadaten (unveränderlich mit Bucket Lock):
  orderId, companyId, erpId, offerNumber,
  signedAt, financingType, financingPartner
```

Das bedeutet: Die Unterschrift kann nach der Archivierung von niemandem gelöscht oder verändert werden — weder durch CRM-Nutzer, Administratoren noch über die Cloudflare-Konsole.

---

## 7. Automatisierung im CRM

Nach erfolgreichem Auftragsabschluss werden automatisch folgende Einträge im CRM angelegt:

| Was | Wo | Details |
|---|---|---|
| Won-Deal | CRM Deals | Stage = won, Wert aus Angebot, Notiz mit allen Details |
| Aktivität Sales Manager | CRM Aktivitäten | Typ: Lead, Titel: "Auftrag erteilt: [Angebot] — [Firma]" |
| Aktivität Administration | CRM Aktivitäten | Typ: Bonitätsanfrage, Refinanzierer angegeben |
| Bonitätsprüfungs-Eintrag | SOSS_DB soss_credit_checks | Status: pending |

---

## 8. Bonitätsprüfung

Nach dem Auftragsabschluss erhält die **Administration** automatisch eine Aktivität im CRM:

```
Typ: Bonitätsanfrage
Titel: "Bonitätsprüfung: [Firma] — Angebot [Nummer]"
Inhalt: Refinanzierer, alle Auftragsdetails
```

**Aktueller Prozess (v1):**
1. Administration sieht Aktivität im CRM
2. Kontaktiert Refinanzierer (BFL/DLL/GRENKE/MLF/von Busch)
3. Lädt Bestätigungsdokument hoch
4. Markiert Bonitätsprüfung als abgeschlossen

**Geplant (v2):** Eigener Bonitätsprüfungs-Tab im CRM mit Upload-Funktion und direkter Archivierung in `vonbusch-crm-archiv`.

---

## 9. E-Mail-Benachrichtigungen

### Kundenbestätigung

Wird sofort nach Auftragsabschluss versendet via **Mailchannels** (Cloudflare-nativ).

- **Absender:** noreply@vonbusch.app (alternativ: noreply@vonbusch.digital)
- **Inhalt:** Firma, Angebotsnummer, Finanzierungsart, Rate, Servicevertrag, Bestellzeitpunkt
- **Design:** Professionelles HTML-E-Mail mit vonBusch-Branding

### Secrets (Cloudflare Workers)

Keine zwingend erforderlichen Secrets — Mailchannels läuft ohne API-Key auf Cloudflare Workers.

| Secret | Zweck | Erforderlich |
|---|---|---|
| `MAIL_FROM` | Absender-E-Mail | Optional (Default: noreply@vonbusch.app) |
| `MAIL_FROM_NAME` | Absender-Name | Optional (Default: von Busch GmbH) |
| `MS_CLIENT_ID` | MS Graph (Alternative zu Mailchannels) | Nein |
| `MS_CLIENT_SECRET` | MS Graph | Nein |

---

## 10. Infrastruktur & Datenbank

### D1-Datenbank: vonbusch-soss

**ID:** `20c8ca7a-80ae-4df6-88eb-41c14ca6ebd2`

#### Tabellen

**soss_sessions** — Kunden-Auth-Sessions

| Spalte | Typ | Beschreibung |
|---|---|---|
| id | TEXT PK | Session-UUID |
| company_id | TEXT | CRM-Firmen-ID |
| document_id | TEXT | CRM-Dokument-ID (Angebot) |
| erp_id | TEXT | Kundennummer |
| offer_number | TEXT | Angebotsnummer (normalisiert) |
| contact_id | TEXT | Primärer Kontakt |
| created_at | TEXT | Erstellungszeitpunkt |
| expires_at | TEXT | Ablauf (48h) |
| ip_address | TEXT | IP des Kunden |
| used | INTEGER | 0 = aktiv, 1 = nach Auftragsabschluss gesperrt |

**soss_orders** — Abgeschlossene Aufträge

| Spalte | Typ | Beschreibung |
|---|---|---|
| id | TEXT PK | Order-UUID |
| session_id | TEXT | Referenz auf Session |
| company_id | TEXT | CRM-Firmen-ID |
| document_id | TEXT | CRM-Dokument-ID |
| erp_id | TEXT | Kundennummer |
| offer_number | TEXT | Angebotsnummer |
| contact_name | TEXT | Name des Unterzeichners |
| contact_email | TEXT | E-Mail für Bestätigung |
| financing_type | TEXT | kauf / miete / leasing |
| financing_partner | TEXT | BFL / DLL / GRENKE / MLF / vonBusch |
| monthly_rate | REAL | Monatliche Rate |
| total_value | REAL | Gesamtbetrag |
| contract_months | INTEGER | Laufzeit in Monaten |
| service_included | INTEGER | 0/1 |
| signature_r2_key | TEXT | Pfad zur Unterschrift in R2 |
| signed_at | TEXT | Zeitstempel der Unterschrift |
| ip_address | TEXT | IP des Kunden |
| status | TEXT | pending / credit_check / approved / rejected |
| crm_deal_id | TEXT | Angelegter Won-Deal im CRM |
| crm_activity_id | TEXT | Aktivität im CRM |

**soss_credit_checks** — Bonitätsprüfungen

| Spalte | Typ | Beschreibung |
|---|---|---|
| id | TEXT PK | UUID |
| order_id | TEXT | Referenz auf Order |
| refinanzierer | TEXT | BFL / DLL / GRENKE / MLF / vonBusch |
| status | TEXT | pending / approved / rejected |
| checked_by | TEXT | User-ID aus CRM (Administration) |
| checked_at | TEXT | Zeitstempel der Prüfung |
| document_r2_key | TEXT | Bestätigungsdokument vom Refinanzierer |
| archive_key | TEXT | Revisionssicher archiviert |
| notes | TEXT | Anmerkungen |

---

## 11. Offene Punkte & Roadmap

### Kurzfristig (v1.1)

| Punkt | Beschreibung |
|---|---|
| Bonitätsprüfungs-Tab im CRM | Upload Refinanzierer-Dokument, Status setzen, archivieren |
| E-Mail-Benachrichtigung intern | Sales Manager + Administration per Mail informieren |
| Angebotsnummer im Link | Link direkt mit Angebotsnummer vorausfüllen (z.B. `soss.vonbusch.app/?angebot=413251`) |

### Mittelfristig (v1.2)

| Punkt | Beschreibung |
|---|---|
| JustIn-Sync | Finanzierungsdaten direkt aus JustIn statt KI-Extraktion |
| PDF-Generierung | Unterschrift als Stempel auf AB-PDF drucken |
| Mehrsprachigkeit | Englisch für internationale Kunden |
| Admin-Dashboard | Übersicht aller SoSS-Orders + Status |

### Langfristig (v2)

| Punkt | Beschreibung |
|---|---|
| Angebots-Versionierung | Mehrere Versionen eines Angebots verwalten |
| Online-Verhandlung | Gegenvorschlag durch Kunden |
| Vollautomatische Bonitätsprüfung | API-Anbindung Refinanzierer |

---

## Changelog

| Version | Datum | Änderungen |
|---|---|---|
| v1.0.1 | 2026-04-04 | Echtes vonBusch Logo (SVG), Titel: Sales Offer Self Service |
| v1.0.0 | 2026-04-04 | Erstversion: Auth, Angebot, Signatur, Order, E-Mail, CRM-Integration |
