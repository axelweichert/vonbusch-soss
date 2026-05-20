---
title: Deployment
status: current
updated: 2026-05-20
owner: Enterprise Network Architect
---

# Deployment

Dieser Abschnitt beschreibt, wie SoSS nach Cloudflare ausgerollt wird.
Zielgruppe: Betreiber:innen.

## Umgebungen

Es ist genau **eine** Umgebung definiert (kein `[env.*]`-Block in
`wrangler.toml`): der produktive Worker `vonbusch-soss-eu` unter
`https://soss.vonbusch.app`. Lokales Testen erfolgt über `wrangler dev`
(siehe [local-dev.md](./local-dev.md)).

## Deploy

```bash
npm run deploy   # entspricht: wrangler deploy
```

`wrangler deploy` bündelt `src/index.ts`, lädt die statischen Assets aus
`public/` hoch und verbindet die Bindings aus `wrangler.toml`. Voraussetzung:
`wrangler login` mit einem Account, der Zugriff auf die `vonbusch-*`-Ressourcen
hat.

## Vor dem Deploy prüfen

- Versionsnummer einheitlich gepflegt: `package.json`, `src/index.ts`
  (`/health`-Route) und `public/index.html`.
- `wrangler.toml`: Reihenfolge beachten — `assets = {...}` muss **vor**
  `[placement]` stehen, sonst werden Assets als `placement.assets`
  fehlinterpretiert (siehe [changelog.md](./changelog.md), v1.2.0).
- R2-Bindings tragen `jurisdiction = "eu"`.

## Datenbank-Migrationen ausrollen

Schema-Änderungen werden gegen die Remote-D1 ausgeführt:

```bash
npx wrangler d1 execute SOSS_DB --remote --file=migrations/000X_*.sql
```

Neue Migrationen als nummerierte Datei in `migrations/` ablegen und im selben
PR dokumentieren ([data-model.md](./data-model.md)).

## Rollback

Der Worker hat keine eingebaute Versionsverwaltung im Repo. Rollback-Pfade:

1. **Code-Rollback** — den letzten funktionierenden Commit auf `main`
   auschecken und `npm run deploy` erneut ausführen.
2. **Cloudflare-Dashboard** — Workers → `vonbusch-soss-eu` → Deployments:
   eine frühere Version als aktiv setzen (`wrangler rollback` bzw.
   Dashboard-Funktion).
3. **Datenbank** — D1-Schemaänderungen sind nicht automatisch reversibel; vor
   destruktiven Migrationen einen D1-Export ziehen (`wrangler d1 export`).

R2-Objekte im Archiv-Bucket sind durch Bucket Lock unveränderlich und können
nicht zurückgerollt werden — das ist beabsichtigt (Revisionssicherheit, siehe
[security.md](./security.md)).

## Health-Check

Nach dem Deploy:

```bash
curl https://soss.vonbusch.app/health
# erwartet: {"status":"ok","service":"vonbusch-soss","version":"1.2.1"}
```

Weiteres zum Betrieb: [operations.md](./operations.md).
