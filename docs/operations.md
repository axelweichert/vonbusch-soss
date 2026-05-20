---
title: Betrieb / Runbook
status: current
updated: 2026-05-20
owner: Enterprise Network Architect
---

# Betrieb / Runbook

Dieser Abschnitt ist das Runbook für den laufenden Betrieb von SoSS.
Zielgruppe: Betreiber:innen und On-Call.

## Health & Monitoring

- **Health-Check:** `GET https://soss.vonbusch.app/health` → `{"status":"ok",...}`.
- **Observability:** in `wrangler.toml` aktiviert — Logs (inkl.
  `invocation_logs`) und Traces. Logs live ansehen:

  ```bash
  npx wrangler tail vonbusch-soss-eu
  ```

  Alternativ Cloudflare-Dashboard → Workers → `vonbusch-soss-eu` →
  Observability/Logs.

## Routineaufgaben

| Aufgabe | Vorgehen |
|---|---|
| Logs prüfen | `wrangler tail` oder Dashboard-Logs |
| Order-Status einsehen | `SOSS_DB.soss_orders` abfragen (`status`-Spalte) |
| Abgelaufene Sessions | `soss_sessions` mit `expires_at < now` — kein Auto-Cleanup, kein Cron |

## Häufige Störungen

### Login schlägt durchgehend fehl

Bekannte Ursache (v1.2.1): fehlende Tabelle `soss_sessions` in der Ziel-D1
oder fehlerhafte `wrangler.toml`-Bindings nach einer Migration. Prüfen:

```bash
npx wrangler d1 execute SOSS_DB --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table';"
```

Fehlt eine Tabelle → `migrations/0001_initial.sql` gegen `--remote` ausführen
(siehe [deployment.md](./deployment.md)).

### „Internal Server Error", keine statischen Dateien

Ursache: In `wrangler.toml` steht `assets = {...}` **nach** `[placement]` und
wird als `placement.assets` fehlinterpretiert. Fix: `assets`-Zeile vor
`[placement]` ziehen, neu deployen.

### Angebot-PDF wird nicht angezeigt

`GET /api/offer/pdf` greift auf einen Demo-PDF-Fallback zurück, wenn das
echte Objekt in `STORAGE` fehlt. Liefert auch der Fallback nichts → R2-Key
des Dokuments in `CRM_DB.documents.r2_key` prüfen und Objekt im Bucket
`vonbusch-crm-docs-eu` verifizieren.

### Bestell-PDF nicht abrufbar

`GET /api/bestellung/:orderId` braucht eine gültige (nicht abgelaufene)
Session — auch `used=1` ist erlaubt. Nach 48 h ist das PDF nur noch direkt
über R2 (`ARCHIVE`, Key `bestellungen/YYYY/MM/...`) erreichbar.

## Nachgelagerter Prozess: Bonitätsprüfung

Nach jedem Auftrag entsteht in `CRM_DB.activities` eine Aktivität
„Bonitätsanfrage" und ein Eintrag in `SOSS_DB.soss_credit_checks`
(`status='pending'`). Die von-Busch-Administration bearbeitet diese manuell.
Es gibt keinen automatischen Trigger und keinen Cron.

## Eskalation

- Worker-/Cloudflare-Infrastruktur: owlOS Enterprise (Network Architect).
- CRM-Datenbankschema (`CRM_DB`): vonBuschOS-CRM-Team.
- Rollback: siehe [deployment.md](./deployment.md).
