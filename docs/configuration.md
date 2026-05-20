---
title: Konfiguration & Secrets
status: current
updated: 2026-05-20
owner: Enterprise Network Architect
---

# Konfiguration & Secrets

Dieser Abschnitt listet alle Konfigurationsvariablen und Secrets. Zielgruppe:
integrierende Entwickler:innen und Betreiber:innen.

> **Keine echten Werte hier.** Diese Datei enthält ausschließlich
> Variablennamen und Platzhalter. Echte Werte stehen im Cloudflare-Dashboard
> bzw. in `wrangler.toml` (für nicht-geheime Vars).

## Klartext-Variablen (`[vars]` in `wrangler.toml`)

Diese Werte sind nicht geheim und im Repo eingecheckt.

| Variable | Zweck | Beispiel-Platzhalter |
|---|---|---|
| `APP_URL` | Öffentliche Basis-URL der Anwendung | `https://<app-host>` |
| `MAIL_FROM` | Absender-E-Mail-Adresse | `noreply@<domain>` |
| `MAIL_FROM_NAME` | Absender-Anzeigename | `<Firmenname>` |

## Bindings (`wrangler.toml`)

Bindings sind keine Secrets, aber Teil der Konfiguration. Details und Zugriff:
[architecture.md](./architecture.md).

| Binding | Typ | Ressource (Platzhalter) |
|---|---|---|
| `ASSETS` | Static Assets | Verzeichnis `public/` |
| `SOSS_DB` | D1 | `vonbusch-soss-eu` |
| `CRM_DB` | D1 | `vonbusch-crm-eu` |
| `STORAGE` | R2 (lesen) | `vonbusch-crm-docs-eu`, Jurisdiktion `eu` |
| `ARCHIVE` | R2 (schreiben) | `vonbusch-crm-archiv-eu`, Jurisdiktion `eu` |

## Secrets (Cloudflare Workers Secrets)

Der aktuelle Quellcode (`src/index.ts`, v1.2.1) liest **keine** Secrets über
`env` aus. Es ist also kein Secret zwingend erforderlich, damit der Worker
läuft.

Secrets werden grundsätzlich über `wrangler secret put <NAME>` gesetzt und
nie im Repo abgelegt. Falls künftig E-Mail-Versand oder ein
Microsoft-Graph-Pfad aktiviert wird (Roadmap, siehe
[overview.md](./overview.md)), kämen folgende Secret-Namen infrage — derzeit
**nicht** verwendet:

| Secret-Name (Platzhalter) | Zweck | Status |
|---|---|---|
| `MS_CLIENT_ID` | Microsoft-Graph-Client-ID (E-Mail-Alternative) | nicht verwendet |
| `MS_CLIENT_SECRET` | Microsoft-Graph-Client-Secret | nicht verwendet |

```bash
# Secret setzen (Wert wird interaktiv abgefragt, nie im Repo speichern):
npx wrangler secret put <SECRET_NAME>
```

## Verifizierung

`wrangler.toml` ist die einzige Quelle der Vars und Bindings im Repo. Bei
Änderungen diese Datei und [architecture.md](./architecture.md) im selben PR
aktualisieren.
