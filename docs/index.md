---
title: Dokumentation — vonBusch SoSS
status: current
updated: 2026-05-20
owner: Enterprise Network Architect
---

# Dokumentation — vonBusch Sales Offer Self Service (SoSS)

Diese Seite ist der Einstiegspunkt (Map of Content) für die vollständige
Dokumentation des SoSS-Worker. Zielgruppe: Entwickler:innen und Betreiber:innen
der von-Busch-Cloud-Infrastruktur.

SoSS ist ein Cloudflare Worker, der von-Busch-Kunden den digitalen
Angebotsabschluss ermöglicht. Eine Kurzbeschreibung steht im
[README](../README.md).

## Abschnitte

| Abschnitt | Inhalt |
|---|---|
| [overview.md](./overview.md) | Zweck, Kontext, Stakeholder, Status |
| [architecture.md](./architecture.md) | Architektur & Cloudflare-Edge-Komponenten (Bindings) |
| [local-dev.md](./local-dev.md) | Lokale Entwicklung & Setup |
| [deployment.md](./deployment.md) | Deployment, Umgebungen, Rollback |
| [configuration.md](./configuration.md) | Konfiguration & Secrets (nur Namen/Platzhalter) |
| [api.md](./api.md) | HTTP-API & Integrationen |
| [data-model.md](./data-model.md) | Datenmodell (D1-Schema, R2-Buckets) |
| [operations.md](./operations.md) | Betrieb / Runbook |
| [security.md](./security.md) | Security & Compliance |
| [changelog.md](./changelog.md) | Änderungshistorie |
| [adr/index.md](./adr/index.md) | Architecture Decision Records |

## Doku-Pflege (Definition of Done)

Diese Doku folgt dem owlOS-Dokumentations-Standard (OWL-40). Verbindliche
Pflege-Regeln — Teil der DoD jeder Code-Änderung:

- **Doku-Touch-Pflicht** — Jede PR, die Verhalten, API, Konfiguration,
  Datenmodell oder Deployment ändert, aktualisiert die betroffene
  `docs/`-Datei in derselben PR. „Docs unchanged" muss begründet werden.
- **Verifizierungspflicht** — Kommandos und Code-Beispiele werden bei jeder
  Berührung gegen den aktuellen Stand verifiziert, nicht geraten.
- **`updated:`-Frontmatter** wird bei jedem Touch aktualisiert.
- **Review** — Doku-Änderungen durchlaufen denselben Review wie Code.
- **ADR-Pflicht** — strukturelle/architektonische Entscheidungen werden als
  neues [ADR](./adr/index.md) festgehalten, nicht in bestehende Docs eingefügt.

## Konventionen

Reines CommonMark + GFM-Tabellen, keine Plugin-abhängigen Embeds. Repo-interne
Links sind relative Pfade (`./architecture.md`). `configuration.md` und
`security.md` enthalten ausschließlich Variablennamen und Platzhalter — niemals
echte Secrets, Tokens oder interne URLs.
