---
title: Architektur
status: current
updated: 2026-05-20
owner: Enterprise Network Architect
---

# Architektur

Dieser Abschnitt beschreibt den Aufbau des SoSS-Worker und seine
Cloudflare-Edge-Komponenten. Zielgruppe: Entwickler:innen und Betreiber:innen.

Alle Bindings sind aus [`wrangler.toml`](../wrangler.toml) und dem Quellcode
`src/index.ts` verifiziert (Stand v1.2.1).

## Topologie

```
                soss.vonbusch.app  (öffentlich, KEIN Cloudflare Access)
                          │
                          ▼
        ┌─────────────────────────────────────────────┐
        │  Worker: vonbusch-soss-eu                     │
        │  src/index.ts — Hono 4 (Routing + API)        │
        │  Smart Placement aktiv                        │
        └───────────────┬──────────────────────────────┘
                         │
   ┌─────────────────────┼───────────────────────────────────────┐
   │                     │                                       │
   ▼                     ▼                                       ▼
ASSETS               D1-Datenbanken                          R2-Buckets
(public/)        ┌────────────────────┐               ┌────────────────────┐
index.html       │ SOSS_DB            │  schreibt     │ STORAGE            │ liest
(SPA-Frontend)   │ vonbusch-soss-eu   │◄──────────────│ vonbusch-crm-docs-eu│
                 │ Sessions, Orders,  │               │ Angebots-PDFs       │
                 │ Credit-Checks      │               └────────────────────┘
                 ├────────────────────┤               ┌────────────────────┐
                 │ CRM_DB             │  liest +      │ ARCHIVE            │ schreibt
                 │ vonbusch-crm-eu    │  schreibt     │ vonbusch-crm-      │ + liest
                 │ Firmen, Dokumente, │◄──────────────│   archiv-eu         │
                 │ Deals, Aktivitäten │               │ Signaturen,         │
                 └────────────────────┘               │ Bestell-PDFs        │
                                                       └────────────────────┘
```

## Cloudflare-Edge-Komponenten

Quelle: `wrangler.toml`. Verwendet werden ausschließlich die folgenden
Komponenten — **kein** KV, **keine** Queues, **keine** Durable Objects,
**kein** Cron-Trigger.

### Worker

| Eigenschaft | Wert |
|---|---|
| Name | `vonbusch-soss-eu` |
| Entrypoint | `src/index.ts` |
| Framework | Hono 4 |
| `compatibility_date` | `2024-09-23` |
| `compatibility_flags` | `nodejs_compat` |
| Placement | `mode = "smart"` (Smart Placement) |

### Static Assets

| Binding | Verzeichnis | Zweck |
|---|---|---|
| `ASSETS` | `public/` | Statisches SPA-Frontend (`public/index.html`). Route `GET /` liefert die Assets direkt aus. |

### D1-Datenbanken

| Binding | Datenbank | Zugriff | Zweck |
|---|---|---|---|
| `SOSS_DB` | `vonbusch-soss-eu` | lesen + schreiben | SoSS-eigene Daten: Sessions, Orders, Bonitätsprüfungen |
| `CRM_DB` | `vonbusch-crm-eu` | lesen + schreiben | Geteilte CRM-Datenbank: Firmen, Kontakte, Dokumente liest SoSS; Deals und Aktivitäten schreibt SoSS |

Die konkreten `database_id`-Werte stehen in `wrangler.toml` und sind nicht
geheim, werden hier aber nicht dupliziert (Single Source: `wrangler.toml`).
Das Schema ist in [data-model.md](./data-model.md) beschrieben.

### R2-Buckets

| Binding | Bucket | Jurisdiktion | Zugriff | Zweck |
|---|---|---|---|---|
| `STORAGE` | `vonbusch-crm-docs-eu` | `eu` | lesen | Angebots-PDFs aus dem CRM |
| `ARCHIVE` | `vonbusch-crm-archiv-eu` | `eu` | schreiben + lesen | Revisionssichere Ablage von Signaturen und Bestell-PDFs |

Beide Buckets sind in der **EU-Jurisdiktion** angelegt (`jurisdiction = "eu"`);
ohne dieses Flag findet der Worker die EU-Buckets nicht (siehe
[changelog.md](./changelog.md), v1.2.1).

### Plattformvariablen & Observability

- `[vars]` — Klartext-Variablen `APP_URL`, `MAIL_FROM`, `MAIL_FROM_NAME`
  (keine Secrets, siehe [configuration.md](./configuration.md)).
- `[observability]` — Logs (`enabled`, `invocation_logs`) und Traces aktiviert.

## Datenflüsse

| Schritt | Komponente | Aktion |
|---|---|---|
| Login | `CRM_DB` | Firma über `erp_id`, Angebotsdokument über `subject` suchen |
| Login | `SOSS_DB` | Session anlegen (`soss_sessions`) |
| Angebot anzeigen | `STORAGE` | Angebots-PDF lesen (Fallback: Demo-PDF) |
| Auftrag | `ARCHIVE` | Signatur-PNG + Bestell-PDF schreiben |
| Auftrag | `SOSS_DB` | Order + Credit-Check schreiben, Session auf `used=1` |
| Auftrag | `CRM_DB` | Bestell-Dokument, Won-Deal, Aktivitäten anlegen |

## Frontend

`public/index.html` ist eine Single-Page-Application. Die „Seiten" `/angebot`
und `/bestaetigung` sind **client-seitige Views** (`showView(...)`), keine
Worker-Routen. Der Worker liefert nur statische Assets und die JSON-/PDF-API
(siehe [api.md](./api.md)).

## Architekturentscheidungen

Strukturelle Entscheidungen sind als ADR dokumentiert — siehe
[adr/index.md](./adr/index.md).
