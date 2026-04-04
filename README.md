# vonBusch SoSS — Sales Offer Self Service

> Digitaler Auftragsabschluss für von Busch Kunden  
> **Live:** https://soss.vonbusch.app

## Funktionsweise

1. Kunde erhält Angebot per Mail mit Link zu `soss.vonbusch.app`
2. Login mit Kundennummer + Angebotsnummer (z.B. `10051` + `413251`)
3. Angebot wird angezeigt (PDF eingebettet + Übersicht)
4. Finanzierungsart wählen (Kauf / Miete / Leasing)
5. Refinanzierer wählen (BFL / DLL / GRENKE / MLF / von Busch)
6. Servicevertrag optional einschließen
7. Digital unterschreiben (Maus oder Touch)
8. Verbindlich beauftragen → Bestätigungsmail

## Was danach passiert

- Unterschrift wird revisionssicher in `vonbusch-crm-archiv` gespeichert
- CRM: Won-Deal wird angelegt
- CRM: Aktivität "Auftrag erteilt" für Sales Manager
- CRM: Aktivität "Bonitätsprüfung" für Administration
- SOSS_DB: Bonitätsprüfungs-Eintrag (pending)
- Kunde: Bestätigungsmail via Mailchannels

## Infrastruktur

| Resource | Name | Zweck |
|---|---|---|
| Worker | vonbusch-soss | Dieser Worker |
| Domain | soss.vonbusch.app | Kundenzugang |
| D1 | vonbusch-soss (20c8ca7a-...) | Sessions, Orders, Bonitätsprüfungen |
| D1 | vonbusch-crm (shared, read+write) | Firmen, Dokumente, Deals, Aktivitäten |
| R2 | vonbusch-crm-docs (read) | Angebots-PDFs |
| R2 | vonbusch-crm-archiv (write) | Unterschriften revisionssicher |

## Deployment

GitHub Upload → Cloudflare CI/CD  
Repo: axelweichert/vonbusch-soss (neu anlegen)

## Secrets (Cloudflare Workers)

Keine zwingend — Mailchannels läuft ohne API-Key auf Workers.  
Optional: `MS_CLIENT_ID`, `MS_TENANT_ID`, `MS_CLIENT_SECRET` für MS Graph Email

## Bonitätsprüfung (CRM-Seite)

In CRM → Aktivitäten erscheint eine Aufgabe "Bonitätsprüfung" für Administration.  
Refinanzierer: BFL / DLL / GRENKE / MLF (Mercator) / von Busch

TODO: Bonitätsprüfungs-Tab in CRM-Einstellungen oder eigenem Bereich (v2)

## Auth-Logik

- Kundennummer: `erp_id` in companies-Tabelle
- Angebotsnummer: Nummer ohne Suffix (413251-7 → 413251), Suche via `LIKE '%413251%'` in documents.subject
- Session: JWT-Cookie, 48h gültig, einmalig verwendbar
