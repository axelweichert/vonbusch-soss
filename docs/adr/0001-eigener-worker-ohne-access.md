---
title: ADR-0001 — Eigener Worker ohne Cloudflare Access
status: accepted
updated: 2026-05-20
owner: Enterprise Network Architect
---

# ADR-0001 — Eigener Worker ohne Cloudflare Access

## Status

accepted

## Kontext

Das vonBuschOS-CRM läuft hinter Cloudflare Access (Zero Trust). Jeder Zugriff
dort benötigt eine Zero-Trust-Lizenz. Der Angebotsabschluss soll aber von
externen von-Busch-Kunden ohne jegliche Lizenz oder Account-Anlage genutzt
werden können.

## Entscheidung

SoSS wird als **eigenständiger Cloudflare Worker** (`vonbusch-soss-eu`) unter
einer eigenen Domain (`soss.vonbusch.app`) betrieben — **ohne** Cloudflare
Access. Die Authentifizierung erfolgt anwendungsintern über Kundennummer
(`erp_id`) + Angebotsnummer und eine 48-Stunden-Session mit Einmal-Nutzung.

Der Worker greift lesend/schreibend auf die geteilte CRM-Datenbank
(`CRM_DB`) zu, läuft aber als separater Deploy-Artefakt.

## Konsequenzen

- Kunden können ohne Lizenz und ohne Account beauftragen.
- Der Schutz hängt an der eigenen Auth-Schicht statt an Cloudflare Access —
  Sessions sind kurzlebig, einmalig und IP-protokolliert (siehe
  [../security.md](../security.md)).
- SoSS teilt die CRM-Datenbank: Schreibfehler können das CRM beeinflussen;
  Schreibpfade sind in `POST /api/order` gekapselt.
- Zwei getrennte Deploy-Artefakte (CRM und SoSS) erhöhen den Pflegeaufwand
  gegenüber einer Integration ins CRM, isolieren aber den öffentlich
  erreichbaren Teil.

## Alternativen

- **SoSS als Teil des CRM-Worker** — verworfen, weil das CRM hinter Access
  liegt und Kunden dort nicht ohne Lizenz hineinkönnen.
