---
title: Security & Compliance
status: current
updated: 2026-05-20
owner: Enterprise Network Architect
---

# Security & Compliance

Dieser Abschnitt beschreibt die sicherheitsrelevanten Eigenschaften von SoSS.
Zielgruppe: Betreiber:innen, Reviewer, Compliance.

> Diese Datei enthält keine echten Secrets, Tokens oder internen URLs — nur
> Variablennamen und Platzhalter. Secret-Handling: siehe
> [configuration.md](./configuration.md).
>
> **Hinweis:** Dies ist eine Architektur-/Beschreibungsdoku, kein
> Sicherheits-Audit. Eine Härtungs- bzw. Schwachstellenbewertung obliegt dem
> IT Security Consultant.

## Zugriffsmodell

- SoSS läuft **ohne** Cloudflare Access, damit Kunden ohne Zero-Trust-Lizenz
  zugreifen können. Das CRM selbst bleibt hinter Access.
- Eigene Authentifizierung: Kundennummer (`erp_id`) + Angebotsnummer. Beides
  ist kein hochsensibles Geheimnis — der Schutz liegt in der Kombination und
  in der Einmaligkeit der Session.

## Sessions

- Cookie `soss_session`: `httpOnly`, `Secure`, `SameSite=Lax`, `maxAge` 48 h.
- **Session-ID auch per URL-Query:** `GET /api/offer/pdf`,
  `GET /api/offer/financials` und `GET /api/bestellung/:orderId` akzeptieren die
  Session-ID zusätzlich als Query-Parameter `?sid=…` (siehe [api.md](./api.md)).
  Eine per URL übergebene Session-ID ist **nicht** durch `httpOnly` geschützt:
  Bei aktivem `observability.logs.invocation_logs` (`wrangler.toml`) landet die
  vollständige Request-URL inkl. `?sid=` in den Cloudflare-Request-Logs;
  zusätzlich kann sie über Referer-Header und Browser-History abfließen
  (STRIDE: *Information Disclosure*). Die `httpOnly`-Eigenschaft gilt nur für den
  Cookie-Transport, nicht für den `?sid=`-Pfad.
- Server-seitige Gültigkeitsprüfung bei jedem Request (`expires_at > now`).
- Einmal-Nutzung: nach Auftragsabschluss `used=1`; ein zweiter Auftrag zum
  selben Dokument wird zusätzlich über `soss_orders` blockiert.
- Sessions speichern die Client-IP zur Nachvollziehbarkeit.

## Revisionssicherheit

- Unterschriften (PNG) und Bestell-PDFs werden im R2-Bucket
  `vonbusch-crm-archiv-eu` abgelegt, der mit **Bucket Lock** geschützt ist.
  Archivierte Objekte können danach von niemandem mehr geändert oder gelöscht
  werden — auch nicht über CRM oder Cloudflare-Konsole.
- Bestell-PDFs tragen einen rechtlichen Hinweis (GoBD, § 147 AO) und
  unveränderliche `customMetadata`.

## Datenschutz / DSGVO

- Seit der EU-Migration (2026-04-17) liegen alle D1-Datenbanken und R2-Buckets
  in der **EU-Jurisdiktion** (`jurisdiction = "eu"`).
- Personenbezogene Daten: Firmen- und Kontaktdaten, Unterschrift, Client-IP,
  User-Agent.
- Eine NIS2-/ISO-27001-/TISAX-Bewertung ist nicht Gegenstand dieser Doku und
  liegt beim Compliance & Audit Lead.

## Secrets

Der Worker liest aktuell keine Secrets aus `env`. Sollten künftig welche
hinzukommen, werden sie ausschließlich über `wrangler secret put` gesetzt und
nie im Repo gespeichert (siehe [configuration.md](./configuration.md)).

## Bekannte sicherheitsrelevante Punkte

- **Geteilte CRM-Datenbank:** SoSS schreibt direkt in `CRM_DB` (`deals`,
  `activities`, `documents`). Ein Fehler hier wirkt auf das CRM. Schreibpfade
  sind in `src/index.ts` (`POST /api/order`) gekapselt.
- **PDF-Fallback entfernt (OWL-69):** `GET /api/offer/pdf` lieferte bei
  fehlendem eigenem R2-Objekt früher ein fest verdrahtetes „Demo-PDF" aus. Die
  Verifikation unter [OWL-69](/OWL/issues/OWL-69) ergab, dass dieses Objekt
  **ein reales Kunden-Angebot eines Drittkunden** war — d.h. eine
  Cross-Tenant Information Disclosure (OWASP A01 Broken Access Control). Der
  Fallback wurde entfernt: fehlt das eigene Dokument, antwortet der Endpunkt
  jetzt mit einem sauberen `404`. Frühere Doku-Behauptung („enthält keine
  echten Kundendaten") war **falsch** und ist hiermit korrigiert.
- **Session-ID nicht mehr in URL:** `/api/offer/pdf`, `/api/offer/financials`
  und `/api/bestellung/:orderId` akzeptierten die Session-ID als
  `?sid=`-Query-Parameter. Bei aktivem `invocation_logs` landete das
  Session-Token damit in den Request-Logs. Die Endpunkte lesen die Session
  jetzt ausschließlich aus dem `httpOnly`-Cookie (OWL-69).
- Eine vertiefte Härtungs-/Ruleset-Bewertung sollte vom IT Security Consultant
  durchgeführt werden.
