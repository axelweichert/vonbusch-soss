---
title: Datenmodell
status: current
updated: 2026-05-20
owner: Enterprise Network Architect
---

# Datenmodell

Dieser Abschnitt beschreibt das Datenmodell von SoSS. Zielgruppe:
integrierende Entwickler:innen.

## D1: `SOSS_DB` (`vonbusch-soss-eu`)

Eigene Datenbank von SoSS. Kanonisches Schema:
`migrations/0001_initial.sql`. Alle Zeitstempel sind ISO-8601-Strings.

### Tabelle `soss_sessions` — Kunden-Auth-Sessions

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | TEXT PK | Session-UUID |
| `company_id` | TEXT | CRM-Firmen-ID |
| `document_id` | TEXT | CRM-Dokument-ID (Angebot) |
| `erp_id` | TEXT | Kundennummer |
| `offer_number` | TEXT | normalisierte Angebotsnummer |
| `contact_id` | TEXT | primärer Kontakt |
| `created_at` | TEXT | Erstellungszeitpunkt |
| `expires_at` | TEXT | Ablauf (48 h nach Erstellung) |
| `ip_address` | TEXT | IP des Kunden |
| `used` | INTEGER | `0` = aktiv, `1` = nach Auftragsabschluss gesperrt |

Index: `idx_sessions_expires (expires_at)`.

### Tabelle `soss_orders` — abgeschlossene Aufträge

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | TEXT PK | Order-UUID |
| `session_id` | TEXT | Referenz auf Session |
| `company_id` | TEXT | CRM-Firmen-ID |
| `document_id` | TEXT | CRM-Dokument-ID |
| `erp_id` | TEXT | Kundennummer |
| `offer_number` | TEXT | Angebotsnummer |
| `contact_name` | TEXT | Name des Unterzeichners |
| `contact_email` | TEXT | E-Mail für Bestätigung |
| `financing_type` | TEXT | `kauf` / `miete` / `leasing` |
| `financing_partner` | TEXT | `BFL` / `DLL` / `GRENKE` / `MLF` / `vonBusch` |
| `monthly_rate` | REAL | monatliche Rate |
| `total_value` | REAL | Gesamtbetrag |
| `contract_months` | INTEGER | Laufzeit in Monaten |
| `service_included` | INTEGER | `0`/`1` |
| `service_interest` | INTEGER | `0`/`1` (siehe Migration 0002) |
| `signature_r2_key` | TEXT | R2-Key der Signatur bzw. des Bestell-PDF |
| `signed_at` | TEXT | Zeitstempel der Unterschrift |
| `ip_address` | TEXT | IP des Kunden |
| `user_agent` | TEXT | User-Agent des Kunden |
| `status` | TEXT | `pending` / `credit_check` / `approved` / `rejected` |
| `crm_deal_id` | TEXT | angelegter Won-Deal im CRM |
| `crm_activity_id` | TEXT | angelegte Aktivität im CRM |
| `created_at` | TEXT | Erstellungszeitpunkt |

Indizes: `idx_orders_company (company_id)`, `idx_orders_status (status)`.

### Tabelle `soss_credit_checks` — Bonitätsprüfungen

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | TEXT PK | UUID |
| `order_id` | TEXT | Referenz auf Order |
| `refinanzierer` | TEXT | `BFL` / `DLL` / `GRENKE` / `MLF` / `vonBusch` |
| `status` | TEXT | `pending` / `approved` / `rejected` |
| `checked_by` | TEXT | User-ID aus CRM (Administration) |
| `checked_at` | TEXT | Zeitstempel der Prüfung |
| `document_r2_key` | TEXT | Bestätigungsdokument des Refinanzierers |
| `archive_key` | TEXT | revisionssicher archiviert |
| `notes` | TEXT | Anmerkungen |
| `created_at` | TEXT | Erstellungszeitpunkt |

Indizes: `idx_credit_order (order_id)`, `idx_credit_status (status)`.

### Migrationsstand

- `0001_initial.sql` — Basis-Schema (drei Tabellen oben).
- `0002` — Spalte `service_interest INTEGER DEFAULT 0` auf `soss_orders`.
  Diese Migration wurde historisch **direkt in D1** ausgeführt und ist in
  `0001_initial.sql` nur als Kommentar vermerkt. Künftige Migrationen sollten
  als eigene nummerierte Datei in `migrations/` abgelegt werden.

## D1: `CRM_DB` (`vonbusch-crm-eu`) — geteilte CRM-Datenbank

SoSS besitzt dieses Schema **nicht**; es gehört zum vonBuschOS-CRM. SoSS greift
auf folgende Tabellen zu (verifiziert aus `src/index.ts`):

| Tabelle | Zugriff | Genutzte Felder (Auszug) |
|---|---|---|
| `companies` | lesen | `id`, `name`, `erp_id`, `street`, `zip`, `city`, `email` |
| `contacts` | lesen | `id`, `first_name`, `last_name`, `email`, `company_id` |
| `documents` | lesen + schreiben | `id`, `r2_key`, `r2_key_text`, `subject`, `summary`, `tags`, `doc_type`, `fin_data`, `fulltext_idx`, `mime_type`, `original_name`, `is_archived` |
| `users` | lesen | `id`, `role`, `active` |
| `deals` | schreiben | Won-Deal nach Auftragsabschluss |
| `activities` | schreiben | Sales- und Bonitätsanfrage-Aktivitäten |

## R2-Buckets

| Bucket (Binding) | Key-Schema | Inhalt |
|---|---|---|
| `vonbusch-crm-docs-eu` (`STORAGE`) | CRM-vergebene Keys (`docs/...`) | Angebots-PDFs (gelesen) |
| `vonbusch-crm-archiv-eu` (`ARCHIVE`) | `signatures/YYYY/MM/<orderId>-signature.png` | Unterschriften-PNG |
| `vonbusch-crm-archiv-eu` (`ARCHIVE`) | `bestellungen/YYYY/MM/<orderId>-bestellung.pdf` | generierte Bestell-PDFs |

Archiv-Objekte tragen `customMetadata` (`orderId`, `companyId`, `erpId`,
`offerNumber`, `signedAt` u. a.) und sind durch Bucket Lock unveränderlich —
siehe [security.md](./security.md).

## KV / Queues / Durable Objects

Nicht verwendet.
