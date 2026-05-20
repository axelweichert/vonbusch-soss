# von Busch — Sales Offer Self Service (SoSS)

Digitales Angebots-/Auftragsportal: von-Busch-Kunden melden sich mit Kunden- und
Angebotsnummer an, prüfen ihr Angebot, unterschreiben digital und beauftragen
verbindlich — der Rest läuft automatisch ins CRM.

**Status:** active — v1.2.1 · Live: `https://soss.vonbusch.app`

## Quickstart

Voraussetzung: Node.js ≥ 18 und ein Cloudflare-Account mit Zugriff auf die
`vonbusch-*`-Ressourcen (D1, R2). `wrangler` wird über die devDependencies
installiert.

```bash
git clone https://github.com/axelweichert/vonbusch-soss.git
cd vonbusch-soss
npm install
npm run dev      # startet wrangler dev (lokaler Worker auf http://localhost:8787)
```

Deploy nach Cloudflare:

```bash
npm run deploy   # wrangler deploy
```

Details zu Setup, Bindings und Migrationen: [docs/local-dev.md](docs/local-dev.md).

## Dokumentation

Vollständige Dokumentation: **[docs/index.md](docs/index.md)**

## Tech-Stack

Cloudflare Workers · Cloudflare Assets (statisches Frontend) · D1 (2× SQLite) ·
R2 (2× Objektspeicher, EU-Jurisdiktion) · Hono 4 · pdf-lib · TypeScript ·
Wrangler.

> Doku-Pflege: Jede Änderung an Verhalten, API, Konfiguration, Datenmodell oder
> Deployment aktualisiert die betroffene `docs/`-Datei in derselben PR. Siehe
> [docs/index.md](docs/index.md) → „Doku-Pflege".
