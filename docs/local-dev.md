---
title: Lokale Entwicklung
status: current
updated: 2026-05-20
owner: Enterprise Network Architect
---

# Lokale Entwicklung

Dieser Abschnitt führt neue Entwickler:innen vom Clone bis zum lauffähigen
lokalen Worker. Zielgruppe: Erstkontakt.

## Voraussetzungen

- Node.js ≥ 18 (für `nodejs_compat`).
- npm.
- Ein Cloudflare-Account mit Zugriff auf die `vonbusch-*`-Ressourcen, sobald
  gegen echte D1/R2-Daten getestet wird (`wrangler login`).

`wrangler` wird über die devDependencies installiert — keine globale
Installation nötig.

## Setup

```bash
git clone https://github.com/axelweichert/vonbusch-soss.git
cd vonbusch-soss
npm install
```

## Lokal starten

```bash
npm run dev      # entspricht: wrangler dev
```

`wrangler dev` startet den Worker lokal (Standard: `http://localhost:8787`).
Die Bindings (`SOSS_DB`, `CRM_DB`, `STORAGE`, `ARCHIVE`, `ASSETS`) werden aus
[`wrangler.toml`](../wrangler.toml) gelesen.

- Ohne `--remote` arbeitet `wrangler dev` mit lokalen D1-/R2-Emulatoren — die
  Datenbanken sind dann leer und müssen migriert/befüllt werden.
- Mit `wrangler dev --remote` läuft der Worker gegen die echten
  Cloudflare-Ressourcen (Login erforderlich, Vorsicht: Produktivdaten).

## Datenbank-Migrationen

Das SoSS-Schema liegt in `migrations/0001_initial.sql`. Für eine lokale
D1-Instanz:

```bash
npx wrangler d1 execute SOSS_DB --local --file=migrations/0001_initial.sql
```

Gegen die Remote-Datenbank `--remote` statt `--local` verwenden — siehe
[deployment.md](./deployment.md). Hinweis: Migration `0002` (Spalte
`service_interest`) wurde historisch direkt in D1 ausgeführt und ist im
Migrationsordner nur als Kommentar vermerkt; siehe
[data-model.md](./data-model.md).

## Projektstruktur

```
src/index.ts          # Worker: Hono-App, alle API-Routen, PDF-Generator
public/index.html     # SPA-Frontend (Login, Angebot, Bestätigung)
migrations/            # D1-Schema (SOSS_DB)
wrangler.toml          # Worker-Konfiguration & Bindings
package.json           # Dependencies & Scripts
tsconfig.json          # TypeScript-Konfiguration
```

## Typecheck

Es gibt kein eigenes Build-Script; `wrangler` bündelt mit esbuild. Für einen
reinen Typecheck:

```bash
npx tsc --noEmit
```

## Nächste Schritte

- Konfiguration & Variablen: [configuration.md](./configuration.md)
- API-Routen testen: [api.md](./api.md)
- Deployment: [deployment.md](./deployment.md)
