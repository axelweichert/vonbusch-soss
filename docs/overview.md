---
title: Überblick
status: current
updated: 2026-05-20
owner: Enterprise Network Architect
---

# Überblick

Dieser Abschnitt erklärt Zweck, Kontext und Status von SoSS für alle, die das
System neu kennenlernen — Onboarding und Reviewer.

## Zweck

SoSS (Sales Offer Self Service) ersetzt den analogen Angebotsabschluss
„Angebot per Mail → Kunde druckt → unterschreibt → scannt → schickt zurück"
durch einen vollständig digitalen Ablauf. Kunden öffnen einen Link, prüfen ihr
Angebot, unterschreiben digital im Browser und beauftragen verbindlich; der
Auftrag wird automatisch im CRM weiterverarbeitet.

## Kundenprozess

1. **E-Mail erhalten** — Angebot von von Busch mit Link auf `soss.vonbusch.app`.
2. **Anmelden** — Kundennummer (`erp_id`) + Angebotsnummer.
3. **Angebot prüfen** — eingebettetes PDF + strukturierte Finanzübersicht.
4. **Finanzierungsart wählen** — Kauf / Miete / Leasing.
5. **Servicevertrag** — optional einschließen oder Interesse bekunden.
6. **Digital unterschreiben** — Signatur-Pad (Maus oder Touch).
7. **Verbindlich beauftragen** — ein Klick erzeugt Auftrag, Bestell-PDF und
   CRM-Einträge.
8. **Bestätigungsseite** — mit Referenznummer und Link auf das Bestell-PDF.

## Kontext: warum ein eigener Worker

Das von-Busch-CRM läuft hinter Cloudflare Access (Zero Trust). Kunden dürfen
dort nicht ohne Lizenz hinein. SoSS läuft als eigenständiger Worker **ohne**
Cloudflare Access, mit einer eigenen, einfachen Authentifizierung
(Kundennummer + Angebotsnummer, siehe [api.md](./api.md)). SoSS liest und
schreibt jedoch die geteilte CRM-Datenbank, siehe
[architecture.md](./architecture.md).

## Stakeholder

| Rolle | Interesse |
|---|---|
| von-Busch-Kunden | Angebot prüfen und beauftragen |
| von-Busch-Vertrieb | Won-Deals und Auftragsaktivitäten im CRM |
| von-Busch-Administration | Bonitätsprüfung nach Auftragseingang |
| owlOS Enterprise (Betrieb) | Worker-Betrieb, Cloudflare-Infrastruktur |

## Status

- **Version:** v1.2.1 (2026-04-20) — siehe [changelog.md](./changelog.md).
- **Betriebsstatus:** active, produktiv unter `https://soss.vonbusch.app`.
- **Daten:** seit der EU-Migration (2026-04-17) laufen alle D1-Datenbanken und
  R2-Buckets in der EU-Jurisdiktion (DSGVO).

## Bekannte Einschränkungen

- **E-Mail-Versand:** Die README früherer Stände beschreibt eine automatische
  Kundenbestätigung per E-Mail. Im aktuellen Quellcode (`src/index.ts`) ist
  **kein** E-Mail-Versand implementiert — nach Auftragseingang werden nur
  CRM-Einträge erzeugt. Siehe [api.md](./api.md) und
  [operations.md](./operations.md).
- Finanzdaten stammen aus der KI-Extraktion bzw. dem D1-Feld `fin_data`; ein
  JustIn-Sync ist Roadmap, nicht implementiert.
