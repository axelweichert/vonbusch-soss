---
title: Changelog
status: current
updated: 2026-05-20
owner: Enterprise Network Architect
---

# Changelog

Kanonische Änderungshistorie von SoSS. Neueste Einträge oben. Inhalt
übernommen aus der bisherigen `README.md`.

## v1.2.1 — 2026-04-20 — Fix Login nach EU-Migration

- Tabelle `soss_sessions` fehlte in `vonbusch-soss-eu` (bei der EU-Migration
  nicht mitgewandert). Tabelle nachgebaut, Test-Sessions zurückgespielt — ohne
  Fix lief jeder `INSERT INTO soss_sessions` gegen eine nicht existente
  Tabelle, jeder Login schlug fehl.
- Login-Query prüfte `d.is_archived=0`. Der CRM-Cron archiviert Dokumente nach
  3 Tagen → Angebote waren für den SoSS-Login unauffindbar. `is_archived=0`
  entfernt; Doppelbestellungen verhindert weiterhin der `existing`-Check auf
  `soss_orders`.
- `wrangler.toml`: R2-Bindings um `jurisdiction = "eu"` ergänzt — ohne Flag
  findet der Worker die EU-Buckets nicht.
- Version einheitlich auf v1.2.1 (`src/index.ts` `/health`,
  `public/index.html`, `package.json`).

## v1.2.0 — 2026-04-09 — Fix `wrangler.toml` assets-Binding

- `assets = { directory = public }` muss vor `[placement]` stehen
  (TOML-Reihenfolge); danach wird alles als `placement.assets`
  fehlinterpretiert → Worker sah keine statischen Dateien.

## v1.1.9 — 2026-04-09 — Smart Placement aktiviert

- `wrangler.toml`: `[placement] mode = "smart"`.

## v1.1.8 — 2026-04-09 — Observability aktiviert

- `wrangler.toml`: `[observability]` Logs (`enabled` + `invocation_logs`) und
  Traces aktiviert.

## v1.1.7 — 2026-04-04 — PDF-Fallback für Testkunden

- Fehlt das Angebots-PDF in R2, wird automatisch ein Demo-PDF gezeigt.

## v1.1.6 — 2026-04-04 — Fix Bestelldokument-Link

- `bestellung_url` im Order-Response ergänzt
  (`/api/bestellung/{orderId}?sid={session_id}`).
- Bestelldokument-Endpoint erlaubt Sessions mit `used=1`.
- Doppeltes `display`-Property im Frontend bereinigt.

## v1.1.5 — 2026-04-04 — Fix Unterschriften-Canvas

- Canvas wurde initialisiert, während das Angebot-View noch `display:none`
  war → Breite 0. Fix: Lazy Init (`ensureCanvas`).

## v1.1.4 — 2026-04-04 — Bestelldokument als PDF

- Bestelldokument als DIN-A4-PDF via pdf-lib (statt HTML), mit Logo,
  eingebetteter Signatur, Bestätigungsstempel und GoBD-Hinweis.
- Ablage im Archiv-Bucket, Endpoint `GET /api/bestellung/{orderId}`.

## v1.1.3 — 2026-04-04 — Bestelldokument (HTML, archiviert)

- Erste Variante des automatisch erzeugten Bestelldokuments (HTML),
  revisionssicher im Archiv-Bucket, als CRM-Dokument registriert.

## v1.1.2 — 2026-04-04 — Finanzdaten aus D1 statt Regex

- Neues Feld `documents.fin_data` (JSON); Financials-Endpoint liest dieses
  zuerst, Regex-Extraktion nur noch Fallback.

## v1.1.1 — 2026-04-04 — Fix ReferenceError in `extractFinancials`

- `totalValue`/`contractMonths` wurden zurückgegeben, aber nie deklariert →
  500-Fehler. Korrekt extrahiert, `loadFinancials()` mit try/catch abgesichert.

## v1.1.0 — 2026-04-04 — Fix Finanzierungswerte

- Regex traf nicht, weil „84 Monate" zwischen „Preis/Monat" und Betrag stand.
  Neue Extraktion mit Kontextfenster + zusätzliche Fallback-Patterns.

## v1.0.9 — 2026-04-04 — Finanzierungsoptionen verbessert

- Miete + Leasing zu einer Karte „Finanzierung" zusammengefasst; Karten nur
  bei vorhandenen Werten.

## v1.0.8 — 2026-04-04 — Refinanzierer-Logik

- Refinanzierer wird intern festgelegt, keine Kundenwahl mehr; Rate Miete =
  Rate Leasing direkt aus dem Angebot.

## v1.0.7 — 2026-04-04 — Architektur-Umbau

- HTML aus TypeScript-Template-Literals gelöst: `public/index.html` (statisch)
  + `src/index.ts` (nur API). `wrangler.toml`: assets-Binding ergänzt.

## v1.0.6 / v1.0.5 — 2026-04-04 — Build-Fixes

- Backtick-Literals und ein Unicode-Sonderzeichen (U+00B7) verursachten
  esbuild-/wrangler-Build-Fehler — beseitigt.

## v1.0.4 — 2026-04-04 — Light/Dark Mode

- Light/Dark-Mode-Toggle, persistente Wahl, Build-Nummer-Anzeige.

## v1.0.3 — 2026-04-04 — Finanzextraktion & Servicevertrag

- Endpoint `/api/offer/financials` liest R2-Textdatei, parst deutsche
  Zahlenformate. Servicevertrag-Sektion überarbeitet, `service_interest`.

## v1.0.1 — 2026-04-04

- Echtes vonBusch-Logo (SVG), Titel „Sales Offer Self Service".

## v1.0.0 — 2026-04-04

- Erstversion: Auth, Angebot, Signatur, Order, CRM-Integration.
