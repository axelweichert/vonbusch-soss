---
title: API & Integrationen
status: current
updated: 2026-05-20
owner: Enterprise Network Architect
---

# API & Integrationen

Dieser Abschnitt dokumentiert die HTTP-API des SoSS-Worker. Zielgruppe:
integrierende Entwickler:innen. Alle Routen sind aus `src/index.ts` (v1.2.1)
verifiziert.

## Routen-Übersicht

| Methode | Pfad | Auth | Zweck |
|---|---|---|---|
| GET | `/` | – | Liefert das SPA-Frontend (`public/index.html`) |
| GET | `/favicon.ico` | – | Leere Antwort (204) |
| POST | `/api/auth/login` | – | Anmeldung, legt Session an |
| GET | `/api/session/check` | Cookie | Prüft die aktuelle Session |
| GET | `/api/auth/logout` | Cookie | Beendet Session, Redirect auf `/` |
| GET | `/api/offer/pdf` | `sid` | Angebots-PDF aus R2 (`STORAGE`) |
| GET | `/api/offer/financials` | `sid` | Finanzdaten des Angebots als JSON |
| POST | `/api/order` | Session | Auftrag einreichen, erzeugt Order + PDF + CRM-Einträge |
| GET | `/api/bestellung/:orderId` | `sid`/Cookie | Bestell-PDF aus R2 (`ARCHIVE`) |
| GET | `/health` | – | Health-Check |

`/angebot` und `/bestaetigung` sind **keine** Worker-Routen, sondern
client-seitige Views der SPA.

## Authentifizierung

SoSS verwendet keine Cloudflare Access. Die Auth ist eigenständig:

- Login via Kundennummer (`erp_id`) + Angebotsnummer.
- Erfolgreicher Login setzt das Cookie `soss_session` (`httpOnly`, `Secure`,
  `SameSite=Lax`, `maxAge` 48 h).
- Sessions sind 48 Stunden gültig (`expires_at`) und nach Auftragsabschluss
  einmalig „verbraucht" (`used=1`).
- Mehrere Endpunkte akzeptieren die Session zusätzlich als Query-Parameter
  `?sid=<session-id>`.

## Endpunkte im Detail

### `POST /api/auth/login`

Body als JSON (`erp_id`, `offer_nr`) oder als `multipart/form-data`. Die
Angebotsnummer wird normalisiert (Suffix `-N` und Leerzeichen entfernt).

Ablauf: Firma in `CRM_DB.companies` über `erp_id` suchen → Angebotsdokument in
`CRM_DB.documents` (`doc_type='Angebot'`, `subject LIKE`) → prüfen, ob bereits
ein nicht-abgelehnter Auftrag existiert → Session in `SOSS_DB.soss_sessions`
anlegen.

Antworten: `200` mit Session- und Angebotsdaten · `400` (`notfound`, Eingabe
fehlt) · `404` (`notfound`, Firma/Angebot nicht gefunden) · `409` (`used`,
bereits beauftragt).

### `GET /api/session/check`

Liest das Cookie, lädt Firmen-/Angebotsdaten. Antwort: `{ valid: bool, ... }`.

### `GET /api/offer/pdf?sid=<id>`

Liefert das Angebots-PDF aus `STORAGE`. Fehlt das Objekt (z. B. Testkunden),
greift ein Demo-PDF-Fallback. `401` bei ungültiger Session.

### `GET /api/offer/financials?sid=<id>`

Liefert Finanzdaten als JSON. Priorität: Feld `documents.fin_data` (JSON) →
sonst Textextraktion (`extractFinancials`) aus R2-Textdatei / `fulltext_idx` /
`summary`.

### `POST /api/order`

Body (JSON): `session_id`, `financing_type`, `financing_partner`,
`service_included`, `service_interest`, `signature_png` (Data-URL),
`monthly_rate`, `total_value`, `contract_months`.

Wirkung:
1. Session validieren (`used=0`, nicht abgelaufen), Doppelauftrag verhindern.
2. Signatur-PNG nach `ARCHIVE` schreiben (`signatures/YYYY/MM/...`).
3. Order in `SOSS_DB.soss_orders` anlegen, Session auf `used=1`.
4. Bestell-PDF generieren (pdf-lib) und nach `ARCHIVE` schreiben
   (`bestellungen/YYYY/MM/...`), als Dokument in `CRM_DB.documents` registrieren.
5. In `CRM_DB`: Won-Deal, Sales-Aktivität und Bonitätsanfrage-Aktivität anlegen.
6. Credit-Check-Eintrag in `SOSS_DB.soss_credit_checks`.

Antwort: `{ success: true, order_id, bestellung_url }` · `401`/`409` bei
ungültiger/verbrauchter Session.

### `GET /api/bestellung/:orderId?sid=<id>`

Liefert das archivierte Bestell-PDF aus `ARCHIVE`. Akzeptiert Sessions mit
`used=1` (PDF bleibt nach Auftragsabschluss abrufbar), prüft aber den Ablauf.

### `GET /health`

`{ "status": "ok", "service": "vonbusch-soss", "version": "1.2.1" }`.

## Integrationen

- **CRM-Datenbank (`CRM_DB`)** — SoSS liest `companies`, `contacts`,
  `documents`, `users` und schreibt `deals`, `activities`, `documents`. Schema
  außerhalb dieses Repos; siehe [data-model.md](./data-model.md).
- **R2-Buckets** — Angebots-PDFs (lesen) und Archiv (schreiben).
- **E-Mail** — die README älterer Stände nennt eine automatische
  Kundenbestätigung. Im aktuellen Code ist **kein** E-Mail-Versand
  implementiert (siehe [overview.md](./overview.md)).
