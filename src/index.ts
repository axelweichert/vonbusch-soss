import { Hono } from 'hono'
import { PDFDocument, rgb, StandardFonts, PageSizes, grayscale } from 'pdf-lib'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'

type Env = {
  SOSS_DB: D1Database
  CRM_DB: D1Database
  STORAGE: R2Bucket
  ARCHIVE: R2Bucket
  APP_URL: string
  MAIL_FROM: string
  MAIL_FROM_NAME: string
  ASSETS: Fetcher
}

// vonBusch Logo (PNG, schwarz) als Base64
const LOGO_PNG_B64 = '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'

const app = new Hono<{ Bindings: Env }>()

const nowIso = () => new Date().toISOString()
const addHours = (h: number) => new Date(Date.now() + h * 3600000).toISOString()
const uuid = () => crypto.randomUUID()

function parseDE(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.'))
}

function fEu(n: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)
}

function extractFinancials(text: string) {
  const t = text || ''
  let monthlyRate: number | null = null

  // Alle Euro-Beträge im Text
  const allAmounts = [...t.matchAll(/((?:\d{1,3}\.)*\d{1,3},\d{2})\s*\u20ac/g)]
    .map(m => parseDE(m[1])).filter(v => v > 100)

  // Preis/Monat mit Kontext
  const preisMonate = t.match(/Preis\/Monat[\s\S]{0,80}?((?:\d{1,3}\.)*\d{1,3},\d{2})\s*\u20ac/i)
  if (preisMonate) monthlyRate = parseDE(preisMonate[1])

  // Miete-Block
  if (!monthlyRate) {
    const mieteMatch = t.match(/Miete[\s\S]{0,200}?((?:\d{1,3}\.)*\d{1,3},\d{2})\s*\u20ac/i)
    if (mieteMatch) monthlyRate = parseDE(mieteMatch[1])
  }

  // "X Monate ... Y,YY €"
  if (!monthlyRate) {
    const lzRate = t.match(/(\d{2,3})\s+Monate[\s\S]{0,50}?((?:\d{1,3}\.)*\d{1,3},\d{2})\s*\u20ac/i)
    if (lzRate) monthlyRate = parseDE(lzRate[2])
  }

  // Fallback: groesster Betrag wenn Miete/Rate erwaehnt
  if (!monthlyRate && allAmounts.length && /Miete|Rate|Laufzeit/i.test(t)) {
    monthlyRate = allAmounts[0]
  }

  // Laufzeit in Monaten
  let contractMonths: number | null = null
  const lz = t.match(/Laufzeit[\s\S]{0,30}?(\d{2,3})\s*Monate/i) || t.match(/(\d{2,3})\s+Monate/i)
  if (lz) contractMonths = parseInt(lz[1])

  // Kaufpreis
  let totalValue: number | null = null
  const kaufPat = [/Kauf[\s\S]{0,100}?((?:\d{1,3}\.)*\d{1,3},\d{2})\s*\u20ac/i, /Gesamtpreis[\s\S]{0,30}?((?:\d{1,3}\.)*\d{1,3},\d{2})\s*\u20ac/i]
  for (const re of kaufPat) {
    const m = t.match(re)
    if (m) { const v = parseDE(m[1]); if (v > 0) { totalValue = v; break } }
  }
  const financingTypes: string[] = []
  if (/\bKauf\b/i.test(t)) financingTypes.push('kauf')
  if (/\bMiete\b/i.test(t)) financingTypes.push('miete')
  if (/\bLeasing\b/i.test(t)) financingTypes.push('leasing')
  if (!financingTypes.length) financingTypes.push('kauf', 'miete', 'leasing')
  const hasServiceContract = /Servicevertrag|SLA|Wartungsvertrag/i.test(t) && !/kein Servicevertrag/i.test(t)
  let billingCycle: string | null = null
  const bc = t.match(/Pauschalturnus[\s\S]{0,20}?(\w+)/i)
  if (bc) billingCycle = bc[1]
  return { monthlyRate, totalValue, contractMonths, hasServiceContract, billingCycle, financingTypes }
}

async function getSessionFromCookie(c: any): Promise<any> {
  const sid = getCookie(c, 'soss_session')
  if (!sid) return null
  return await c.env.SOSS_DB.prepare(
    'SELECT * FROM soss_sessions WHERE id=? AND expires_at>? AND used=0'
  ).bind(sid, nowIso()).first()
}

app.get('/', (c) => c.env.ASSETS.fetch(c.req.raw))
app.get('/favicon.ico', (c) => new Response(null, { status: 204 }))

app.post('/api/auth/login', async (c) => {
  let erpId = '', offerNr = ''
  const ct = c.req.header('content-type') || ''
  if (ct.includes('application/json')) {
    const b = await c.req.json() as any
    erpId = (b.erp_id || '').trim()
    offerNr = (b.offer_nr || '').trim().replace(/-\d+$/, '').replace(/\s/g, '')
  } else {
    const fd = await c.req.formData()
    erpId = ((fd.get('erp_id') as string) || '').trim()
    offerNr = ((fd.get('offer_nr') as string) || '').trim().replace(/-\d+$/, '').replace(/\s/g, '')
  }
  if (!erpId || !offerNr) return c.json({ error: 'notfound' }, 400)
  const co = await c.env.CRM_DB.prepare(
    'SELECT id, name, erp_id, street, zip, city, email FROM companies WHERE TRIM(erp_id)=?'
  ).bind(erpId).first() as any
  if (!co) return c.json({ error: 'notfound' }, 404)
  const doc = await c.env.CRM_DB.prepare(
    "SELECT d.id, d.subject, d.r2_key, d.r2_key_text, d.summary, d.tags FROM documents d WHERE d.company_id=? AND d.doc_type='Angebot' AND d.is_archived=0 AND (d.subject LIKE ? OR d.subject LIKE ?) ORDER BY d.created_at DESC LIMIT 1"
  ).bind(co.id, '%' + offerNr + '%', '%' + offerNr + '-%').first() as any
  if (!doc) return c.json({ error: 'notfound' }, 404)
  const existing = await c.env.SOSS_DB.prepare(
    "SELECT id FROM soss_orders WHERE document_id=? AND status!='rejected'"
  ).bind(doc.id).first()
  if (existing) return c.json({ error: 'used' }, 409)
  const contact = await c.env.CRM_DB.prepare(
    'SELECT id, first_name, last_name, email FROM contacts WHERE company_id=? LIMIT 1'
  ).bind(co.id).first() as any
  const sid = uuid()
  await c.env.SOSS_DB.prepare(
    'INSERT INTO soss_sessions (id,company_id,document_id,erp_id,offer_number,contact_id,created_at,expires_at,ip_address) VALUES (?,?,?,?,?,?,?,?,?)'
  ).bind(sid, co.id, doc.id, erpId, offerNr, contact?.id || null, nowIso(), addHours(48), c.req.header('CF-Connecting-IP') || null).run()
  setCookie(c, 'soss_session', sid, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 48 * 3600 })
  const kontakt = contact ? ((contact.first_name || '') + ' ' + (contact.last_name || '')).trim() : ''
  const adresse = [co.street, (co.zip && co.city) ? co.zip + ' ' + co.city : co.city].filter(Boolean).join(', ')
  return c.json({ session_id: sid, firma: co.name, kontakt: kontakt || '-', email: contact?.email || co.email || '-', adresse: adresse || '-', erp_id: erpId, offer_number: offerNr, subject: doc.subject || '', summary: doc.summary || '', tags: doc.tags || '[]' })
})

app.get('/api/session/check', async (c) => {
  const s = await getSessionFromCookie(c) as any
  if (!s) return c.json({ valid: false })
  const co = await c.env.CRM_DB.prepare(
    'SELECT co.name, co.erp_id, co.street, co.zip, co.city, co.email, ct.first_name, ct.last_name, ct.email as ct_email FROM companies co LEFT JOIN contacts ct ON ct.company_id=co.id WHERE co.id=? LIMIT 1'
  ).bind(s.company_id).first() as any
  const doc = await c.env.CRM_DB.prepare('SELECT subject, summary, tags FROM documents WHERE id=?').bind(s.document_id).first() as any
  const kontakt = co ? ((co.first_name || '') + ' ' + (co.last_name || '')).trim() : ''
  const adresse = co ? [co.street, (co.zip && co.city) ? co.zip + ' ' + co.city : co.city].filter(Boolean).join(', ') : ''
  return c.json({ valid: true, session_id: s.id, firma: co?.name || '-', kontakt: kontakt || '-', email: co?.ct_email || co?.email || '-', adresse: adresse || '-', erp_id: s.erp_id, offer_number: s.offer_number, subject: doc?.subject || '', summary: doc?.summary || '', tags: doc?.tags || '[]' })
})

app.get('/api/auth/logout', (c) => {
  deleteCookie(c, 'soss_session')
  return c.redirect('/')
})

app.get('/api/offer/pdf', async (c) => {
  const sid = c.req.query('sid') || ''
  const s = await c.env.SOSS_DB.prepare('SELECT * FROM soss_sessions WHERE id=? AND expires_at>?').bind(sid, nowIso()).first() as any
  if (!s) return c.json({ error: 'Ungueltige Sitzung' }, 401)
  const doc = await c.env.CRM_DB.prepare('SELECT r2_key, mime_type, original_name FROM documents WHERE id=?').bind(s.document_id).first() as any
  if (!doc) return c.json({ error: 'Nicht gefunden' }, 404)
  let obj = await c.env.STORAGE.get(doc.r2_key)
  // Fallback: Demo-PDF (Nielsen) wenn Datei nicht im R2 vorhanden (z.B. Testkunden)
  if (!obj) {
    const fallbackKey = 'docs/732fd7ac-696e-4a44-9972-b28d1c42396d/2025/12/c6a69bf7-6d25-4a13-8d5d-a63969aa7fd5.pdf'
    if (doc.r2_key !== fallbackKey) obj = await c.env.STORAGE.get(fallbackKey)
  }
  if (!obj) return c.json({ error: 'Datei nicht gefunden' }, 404)
  return new Response(obj.body as ReadableStream, {
    headers: { 'Content-Type': doc.mime_type || 'application/pdf', 'Content-Disposition': 'inline; filename="angebot.pdf"', 'Cache-Control': 'private, max-age=3600' }
  })
})

app.get('/api/offer/financials', async (c) => {
  const sid = c.req.query('sid') || ''
  const s = await c.env.SOSS_DB.prepare('SELECT * FROM soss_sessions WHERE id=? AND expires_at>?').bind(sid, nowIso()).first() as any
  if (!s) return c.json({ error: 'Ungueltige Sitzung' }, 401)
  const doc = await c.env.CRM_DB.prepare('SELECT r2_key_text, subject, summary, fulltext_idx, fin_data FROM documents WHERE id=?').bind(s.document_id).first() as any
  if (!doc) return c.json({ error: 'Nicht gefunden' }, 404)

  // Direktdaten aus D1 haben absolute Prioritaet - kein Regex noetig
  if (doc.fin_data) {
    try {
      const fin = JSON.parse(doc.fin_data)
      return c.json({ ...fin, subject: doc.subject, summary: doc.summary })
    } catch (_) {}
  }

  // Fallback: Textextraktion
  let fullText = (doc.fulltext_idx || '') + ' ' + (doc.summary || '')
  if (doc.r2_key_text) {
    try {
      const o = await c.env.STORAGE.get(doc.r2_key_text)
      if (o) { const txt = await o.text(); if (txt && txt.length > 50) fullText = txt }
    } catch (_) {}
  }
  return c.json({ ...extractFinancials(fullText), subject: doc.subject, summary: doc.summary })
})



// ── BESTELLDOKUMENT PDF GENERATOR ────────────────────────────────────────────

async function generateBestellungPDF(d: {
  orderId: string, firma: string, adresse: string, kontakt: string, email: string,
  erpId: string, offerNr: string, finType: string,
  monthlyRate: number|null, totalValue: number|null, contractMonths: number|null,
  billingCycle: string|null, serviceIncluded: boolean, serviceInterest: boolean,
  signaturePng: string, signedAt: string, ipAddress: string
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89]) // A4
  const { width, height } = page.getSize()

  const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Farben
  const black    = rgb(0.05, 0.10, 0.08)   // #0d1a14 vonBusch Schwarz
  const darkGray = rgb(0.30, 0.30, 0.30)
  const gray     = rgb(0.55, 0.55, 0.55)
  const lightBg  = rgb(0.96, 0.97, 0.97)
  const accentLine = rgb(0.05, 0.10, 0.08)

  const ml = 52   // Margin left
  const mr = 52   // Margin right
  const cw = width - ml - mr  // Content width

  let y = height - 44  // Start oben

  // ── LOGO ─────────────────────────────────────────────────────────────────
  try {
    const logoBytes = Uint8Array.from(atob(LOGO_PNG_B64), c => c.charCodeAt(0))
    const logoImg = await pdfDoc.embedPng(logoBytes)
    const logoDims = logoImg.scaleToFit(160, 40)
    page.drawImage(logoImg, { x: ml, y: y - logoDims.height + 8, width: logoDims.width, height: logoDims.height })
  } catch (_) {
    // Fallback: Text-Logo
    page.drawText('vonBusch', { x: ml, y: y - 10, size: 22, font: fontBold, color: black })
  }

  // Rechts: Titel und Referenz
  const dateStr = new Date(d.signedAt).toLocaleString('de-DE', { dateStyle: 'long', timeStyle: 'short' })
  page.drawText('BESTELLUNG', { x: width - mr - 120, y: y, size: 14, font: fontBold, color: black })
  page.drawText('Angebotsnr.: ' + d.offerNr, { x: width - mr - 120, y: y - 16, size: 8, font: fontReg, color: gray })
  page.drawText('Ref.: ' + d.orderId.substring(0,8).toUpperCase(), { x: width - mr - 120, y: y - 26, size: 8, font: fontReg, color: gray })
  page.drawText(dateStr, { x: width - mr - 120, y: y - 36, size: 8, font: fontReg, color: gray })

  // Trennlinie
  y -= 52
  page.drawLine({ start: {x:ml, y}, end: {x:width-mr, y}, thickness: 2, color: accentLine })
  y -= 14

  // Absender klein
  page.drawText('von Busch GmbH  ·  Alfred-Bozi-Str. 12  ·  33602 Bielefeld  ·  Tel.: 0521-9624-0', { x: ml, y, size: 7, font: fontReg, color: gray })
  y -= 20

  // ── AUFTRAGGEBER ─────────────────────────────────────────────────────────
  page.drawText('AUFTRAGGEBER', { x: ml, y, size: 7.5, font: fontBold, color: gray })
  y -= 14

  const rows1: [string, string][] = [
    ['Firma', d.firma],
    ['Adresse', d.adresse],
    ['Ansprechpartner', d.kontakt],
    ['E-Mail', d.email],
    ['Kundennummer', d.erpId],
  ]
  for (const [label, val] of rows1) {
    page.drawText(label, { x: ml, y, size: 9, font: fontReg, color: gray })
    page.drawText(val || '–', { x: ml + 115, y, size: 9, font: val ? fontBold : fontReg, color: black })
    y -= 14
  }
  y -= 8

  // ── AUFTRAGSDETAILS ───────────────────────────────────────────────────────
  // Hintergrundbox
  page.drawRectangle({ x: ml, y: y - 4, width: cw, height: 13, color: lightBg })
  page.drawText('AUFTRAGSDETAILS', { x: ml + 4, y: y + 1, size: 7.5, font: fontBold, color: gray })
  y -= 14

  const finLabel = d.finType === 'kauf' ? 'Kauf (Einmalzahlung)' : 'Finanzierung'
  const svText   = d.serviceIncluded ? 'Ja – im Angebot enthalten' : d.serviceInterest ? 'Interesse geäußert (Angebot folgt)' : 'Nein'
  const fmt = (n: number) => new Intl.NumberFormat('de-DE', {style:'currency',currency:'EUR'}).format(n)

  const rows2: [string, string][] = [
    ['Angebotsnummer', d.offerNr],
    ['Beauftragungsdatum', dateStr],
    ['Finanzierungsart', finLabel],
    ['Finanzierungspartner', 'Wird nach Bonitätsprüfung mitgeteilt'],
    ...(d.monthlyRate ? [['Monatliche Rate', fmt(d.monthlyRate) + ' / Monat zzgl. MwSt.'] as [string,string]] : []),
    ...(d.contractMonths ? [['Laufzeit', d.contractMonths + ' Monate' + (d.billingCycle ? '  ·  Abrechnung: ' + d.billingCycle : '')] as [string,string]] : []),
    ...(d.totalValue ? [['Gesamtbetrag', fmt(d.totalValue) + ' zzgl. MwSt.'] as [string,string]] : []),
    ['Servicevertrag', svText],
  ]

  for (const [label, val] of rows2) {
    page.drawLine({ start: {x:ml, y: y+10}, end: {x:width-mr, y: y+10}, thickness: 0.3, color: rgb(0.88,0.88,0.88) })
    page.drawText(label, { x: ml, y, size: 9, font: fontReg, color: gray })
    // Monatliche Rate hervorheben
    const isBold = label === 'Monatliche Rate' || label === 'Gesamtbetrag'
    page.drawText(val || '–', { x: ml + 170, y, size: isBold ? 10 : 9, font: isBold ? fontBold : fontReg, color: black })
    y -= 14
  }
  y -= 12

  // ── UNTERSCHRIFT ──────────────────────────────────────────────────────────
  page.drawText('DIGITALE UNTERSCHRIFT DES AUFTRAGGEBERS', { x: ml, y, size: 7.5, font: fontBold, color: gray })
  y -= 10

  // Unterschriften-Box
  const sigBoxH = 80
  page.drawRectangle({ x: ml, y: y - sigBoxH, width: cw, height: sigBoxH, color: rgb(0.98,0.98,0.98), borderColor: accentLine, borderWidth: 1 })

  // Signatur-PNG einbetten
  if (d.signaturePng && d.signaturePng.startsWith('data:image/png;base64,')) {
    try {
      const sigB64 = d.signaturePng.replace('data:image/png;base64,', '')
      const sigBytes = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0))
      const sigImg = await pdfDoc.embedPng(sigBytes)
      const sigDims = sigImg.scaleToFit(280, 60)
      page.drawImage(sigImg, { x: ml + 10, y: y - 8 - sigDims.height, width: sigDims.width, height: sigDims.height })
    } catch (_) {
      page.drawText('[Unterschrift digital erfasst]', { x: ml + 10, y: y - 40, size: 9, font: fontReg, color: gray })
    }
  }

  // Unterschriften-Metadaten rechts
  page.drawText('Unterzeichnet am:', { x: ml + 310, y: y - 20, size: 8, font: fontReg, color: gray })
  page.drawText(dateStr, { x: ml + 310, y: y - 32, size: 8, font: fontBold, color: black })
  page.drawText('IP: ' + (d.ipAddress||'unbekannt'), { x: ml + 310, y: y - 46, size: 7, font: fontReg, color: gray })

  y -= sigBoxH + 14

  // ── BESTÄTIGUNGS-STEMPEL ──────────────────────────────────────────────────
  page.drawRectangle({ x: ml, y: y - 22, width: 220, height: 22, borderColor: black, borderWidth: 1.5, color: rgb(1,1,1) })
  page.drawText('✓  Verbindliche Beauftragung', { x: ml + 10, y: y - 15, size: 10, font: fontBold, color: black })
  y -= 36

  // ── RECHTLICHER HINWEIS ───────────────────────────────────────────────────
  const legal = 'Mit dieser digitalen Unterschrift erteilt der Auftraggeber der von Busch GmbH den verbindlichen Auftrag zur Lieferung und Erbringung der im Angebot ' + d.offerNr + ' beschriebenen Leistungen und Produkte. Es gelten die Allgemeinen Vertragsbedingungen der von Busch GmbH. Die Preise verstehen sich netto zzgl. der gesetzlich gueltigen Mehrwertsteuer. Alle Zahlungen fuer Lieferungen und Leistungen sind ohne Abzug sofort faellig. Dieses Dokument ist digital signiert und revisionssicher archiviert (GoBD, §147 AO).'

  page.drawRectangle({ x: ml, y: y - 44, width: cw, height: 44, color: lightBg })
  // Zeilenumbruch manuell bei ~105 Zeichen
  const legalLines: string[] = []
  let remaining = legal
  while (remaining.length > 0) {
    let cut = Math.min(remaining.length, 105)
    if (cut < remaining.length && remaining[cut] !== ' ') {
      const sp = remaining.lastIndexOf(' ', cut)
      if (sp > 0) cut = sp
    }
    legalLines.push(remaining.substring(0, cut).trim())
    remaining = remaining.substring(cut).trim()
  }
  for (let i = 0; i < Math.min(legalLines.length, 4); i++) {
    page.drawText(legalLines[i], { x: ml + 6, y: y - 10 - i * 9, size: 7, font: fontReg, color: darkGray })
  }
  y -= 58

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const footerY = 28
  page.drawLine({ start: {x:ml, y:footerY+16}, end: {x:width-mr, y:footerY+16}, thickness: 0.5, color: rgb(0.80,0.80,0.80) })
  page.drawText('von Busch GmbH  ·  Alfred-Bozi-Str. 12  ·  33602 Bielefeld  ·  Tel.: 0521-9624-0  ·  Fax: 0521-9624-359  ·  www.vonbusch.digital', { x: ml, y: footerY + 6, size: 7, font: fontReg, color: gray })
  page.drawText('Dok-ID: ' + d.orderId + '  ·  Archiviert: ' + dateStr, { x: ml, y: footerY - 4, size: 6.5, font: fontReg, color: rgb(0.70,0.70,0.70) })

  return await pdfDoc.save()
}


app.post('/api/order', async (c) => {
  const body = await c.req.json() as any
  const { session_id, financing_type, financing_partner, service_included, service_interest, signature_png, monthly_rate, total_value, contract_months } = body
  const s = await c.env.SOSS_DB.prepare('SELECT * FROM soss_sessions WHERE id=? AND expires_at>? AND used=0').bind(session_id, nowIso()).first() as any
  if (!s) return c.json({ error: 'Ungueltige Sitzung', success: false }, 401)
  const existing = await c.env.SOSS_DB.prepare("SELECT id FROM soss_orders WHERE document_id=? AND status!='rejected'").bind(s.document_id).first()
  if (existing) return c.json({ error: 'Bereits beauftragt', success: false }, 409)
  const now = nowIso()
  const orderId = uuid()
  const co = await c.env.CRM_DB.prepare('SELECT co.*, ct.first_name, ct.last_name, ct.email as ct_email FROM companies co LEFT JOIN contacts ct ON ct.company_id=co.id WHERE co.id=? LIMIT 1').bind(s.company_id).first() as any
  const mRate = monthly_rate || null
  const tValue = total_value || null
  const cMonths = contract_months || null
  let sigKey: string | null = null
  if (signature_png && signature_png.startsWith('data:image/png;base64,')) {
    try {
      const b64 = signature_png.replace('data:image/png;base64,', '')
      const binary = Uint8Array.from(atob(b64), (ch: string) => ch.charCodeAt(0))
      const d = new Date(now)
      sigKey = 'signatures/' + d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + orderId + '-signature.png'
      await c.env.ARCHIVE.put(sigKey, binary, { httpMetadata: { contentType: 'image/png' }, customMetadata: { orderId, companyId: s.company_id, erpId: s.erp_id, offerNumber: s.offer_number, signedAt: now } })
    } catch (_) {}
  }
  await c.env.SOSS_DB.prepare('INSERT INTO soss_orders (id,session_id,company_id,document_id,erp_id,offer_number,contact_name,contact_email,financing_type,financing_partner,monthly_rate,total_value,contract_months,service_included,service_interest,signature_r2_key,signed_at,ip_address,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(orderId, session_id, s.company_id, s.document_id, s.erp_id, s.offer_number, co ? ((co.first_name || '') + ' ' + (co.last_name || '')).trim() : null, co?.ct_email || co?.email || null, financing_type, financing_partner || 'von Busch', mRate, tValue, cMonths, service_included ? 1 : 0, service_interest ? 1 : 0, sigKey, now, c.req.header('CF-Connecting-IP') || null, 'pending', now).run()
  await c.env.SOSS_DB.prepare('UPDATE soss_sessions SET used=1 WHERE id=?').bind(session_id).run()

  // ── BESTELLDOKUMENT GENERIEREN + ARCHIVIEREN ─────────────────────────────
  let bestellungKey: string | null = null
  let bestellungDocId: string | null = null
  try {
    const adresse = co ? [co.street, (co.zip && co.city) ? co.zip + ' ' + co.city : co.city].filter(Boolean).join(', ') : ''
    // Finanzdaten aus D1 laden für billingCycle
    let billingCycleForDoc: string|null = null
    try {
      const finDoc = await c.env.CRM_DB.prepare('SELECT fin_data FROM documents WHERE id=?').bind(s.document_id).first() as any
      if (finDoc?.fin_data) { const fd = JSON.parse(finDoc.fin_data); billingCycleForDoc = fd.billingCycle || null }
    } catch(_) {}

    const pdfBytes = await generateBestellungPDF({
      orderId, firma: co?.name || s.erp_id,
      adresse, kontakt: co ? ((co.first_name||'') + ' ' + (co.last_name||'')).trim() : '',
      email: co?.ct_email || co?.email || '',
      erpId: s.erp_id, offerNr: s.offer_number,
      finType: financing_type,
      monthlyRate: mRate, totalValue: tValue, contractMonths: cMonths,
      billingCycle: billingCycleForDoc,
      serviceIncluded: !!service_included, serviceInterest: !!service_interest,
      signaturePng: (signature_png && signature_png.startsWith('data:image/png;base64,')) ? signature_png : '',
      signedAt: now, ipAddress: c.req.header('CF-Connecting-IP') || ''
    })
    const d = new Date(now)
    const ym = d.getFullYear() + '/' + String(d.getMonth()+1).padStart(2,'0')
    bestellungKey = 'bestellungen/' + ym + '/' + orderId + '-bestellung.pdf'
    // PDF bereits als Uint8Array
    await c.env.ARCHIVE.put(bestellungKey, pdfBytes, {
      httpMetadata: { contentType: 'application/pdf' },
      customMetadata: {
        orderId, type: 'Bestellung', offerNumber: s.offer_number,
        companyId: s.company_id, erpId: s.erp_id, signedAt: now,
        firma: co?.name || s.erp_id
      }
    })

    // Als Dokument im CRM registrieren
    bestellungDocId = uuid()
    await c.env.CRM_DB.prepare(
      "INSERT INTO documents (id,r2_key,original_name,mime_type,size,doc_type,subject,company_id,uploaded_by,is_archived,archive_r2_key,archived_at,archived_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,1,?,?,?,?,?)"
    ).bind(
      bestellungDocId, bestellungKey,
      'Bestellung-' + s.offer_number + '-' + (co?.name||s.erp_id).replace(/[^a-zA-Z0-9]/g,'-') + '.pdf',
      'application/pdf', pdfBytes.length,
      'Bestellung',
      'Bestellung ' + s.offer_number + ' - ' + (co?.name||s.erp_id),
      s.company_id, 'soss',
      bestellungKey, now, 'soss',
      now, now
    ).run()

    // Order mit Bestelldokument-Referenz aktualisieren
    await c.env.SOSS_DB.prepare('UPDATE soss_orders SET signature_r2_key=? WHERE id=?')
      .bind(bestellungKey, orderId).run()

  } catch (e) { console.error('Bestellung doc error:', e) }
  const finLabel = financing_type === 'kauf' ? 'Kauf' : financing_type === 'miete' ? 'Miete' : 'Leasing'
  const svSt = service_included ? 'Im Angebot enthalten' : service_interest ? 'Interesse' : 'Nein'
  const bText = 'Auftrag ' + s.offer_number + ' - ' + (co?.name || s.erp_id) + ' - ' + finLabel + ' via ' + (financing_partner || 'von Busch') + (mRate ? ' - Rate: ' + fEu(mRate) : '') + ' - SV: ' + svSt
  try {
    const ownerUser = await c.env.CRM_DB.prepare("SELECT id FROM users WHERE role IN ('sales_manager','sales') AND active=1 LIMIT 1").first() as any
    const ownerId = ownerUser?.id || null
    const dealId = uuid()
    const akId = uuid()
    await c.env.CRM_DB.prepare("INSERT INTO deals (id,title,company_id,owner_id,bereich,stage,value,cost_value,margin_value,margin_percent,status,notes,created_at,updated_at) VALUES (?,?,?,?,'ITS','won',?,0,0,0,'open',?,?,?)").bind(dealId, 'Auftrag ' + s.offer_number + ' - ' + (co?.name || s.erp_id), s.company_id, ownerId, tValue || 0, bText, now, now).run()
    await c.env.CRM_DB.prepare("INSERT INTO activities (id,type,subject,body,company_id,owner_id,status,due_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(akId, 'Lead', 'Auftrag erteilt: ' + s.offer_number, bText, s.company_id, ownerId, 'open', new Date(Date.now() + 86400000).toISOString(), now, now).run()
    const adminUser = await c.env.CRM_DB.prepare("SELECT id FROM users WHERE role='admin' AND active=1 LIMIT 1").first() as any
    await c.env.CRM_DB.prepare("INSERT INTO activities (id,type,subject,body,company_id,owner_id,status,due_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(uuid(), 'Bonitaetsanfrage', 'Bonitaetspruefung: ' + (co?.name || s.erp_id), 'Refinanzierer: ' + (financing_partner || 'von Busch') + '\n' + bText, s.company_id, adminUser?.id || ownerId, 'open', new Date(Date.now() + 86400000).toISOString(), now, now).run()
    await c.env.SOSS_DB.prepare('INSERT INTO soss_credit_checks (id,order_id,refinanzierer,status,created_at) VALUES (?,?,?,?,?)').bind(uuid(), orderId, financing_partner || 'von Busch', 'pending', now).run()
    await c.env.SOSS_DB.prepare('UPDATE soss_orders SET crm_deal_id=?,crm_activity_id=? WHERE id=?').bind(dealId, akId, orderId).run()
  } catch (_) {}
  const bestellungUrl = bestellungKey
    ? '/api/bestellung/' + orderId + '?sid=' + session_id
    : null
  return c.json({ success: true, order_id: orderId, bestellung_url: bestellungUrl })
})


// ── BESTELLDOKUMENT ANZEIGEN ──────────────────────────────────────────────────
app.get('/api/bestellung/:orderId', async (c) => {
  // Session-Check: used=1 erlaubt (Session nach Bestellung verbraucht aber PDF noch abrufbar)
  const sid = c.req.query('sid') || ''
  let session: any = null
  if (sid) {
    // Direkter sid-Parameter: auch used=1 erlaubt, aber Ablauf prüfen
    session = await c.env.SOSS_DB.prepare(
      'SELECT * FROM soss_sessions WHERE id=? AND expires_at>?'
    ).bind(sid, nowIso()).first() as any
  }
  if (!session) {
    // Cookie-Fallback (auch used=1 erlaubt)
    const cookieSid = require ? null : null  // Cookie-Header manuell lesen
    const cookieHeader = c.req.header('Cookie') || ''
    const cm = cookieHeader.match(/soss_session=([^;]+)/)
    const cookieVal = cm ? cm[1] : ''
    if (cookieVal) {
      session = await c.env.SOSS_DB.prepare(
        'SELECT * FROM soss_sessions WHERE id=? AND expires_at>?'
      ).bind(cookieVal, nowIso()).first() as any
    }
  }
  if (!session) return new Response('Nicht authentifiziert', { status: 401 })

  const order = await c.env.SOSS_DB.prepare('SELECT * FROM soss_orders WHERE id=? AND company_id=?').bind(c.req.param('orderId'), session.company_id).first() as any
  if (!order) return c.json({ error: 'Nicht gefunden' }, 404)

  // Bestelldokument aus Archiv lesen
  const key = order.signature_r2_key || ('bestellungen/' + order.signed_at.substring(0,7).replace('-','/') + '/' + order.id + '-bestellung.html')
  if (!key.startsWith('bestellungen/')) return c.json({ error: 'Kein Bestelldokument' }, 404)

  const obj = await c.env.ARCHIVE.get(key)
  if (!obj) return c.json({ error: 'Dokument nicht gefunden' }, 404)

  return new Response(obj.body as ReadableStream, {
    headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'private, max-age=3600' }
  })
})

app.get('/health', (c) => c.json({ status: 'ok', service: 'vonbusch-soss', version: '1.0.7' }))

// TEMP: Musterdaten anlegen
app.post('/api/seed-testdata', async (c) => {
  if (c.req.query('secret') !== 'vbmigrate2026eu') return c.json({ error: 'Unauthorized' }, 401)
  const now = new Date().toISOString()
  const companyId = 'test-company-80576'
  const docId     = 'test-doc-131313'
  try {
    await c.env.CRM_DB.prepare(`
      INSERT OR REPLACE INTO companies (id,name,status,erp_id,street,zip,city,country,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).bind(companyId,'von Busch Test GmbH','customer','80576','Eckendorfer Str. 125','33609','Bielefeld','DE',now,now).run()

    await c.env.CRM_DB.prepare(`
      INSERT OR REPLACE INTO documents (id,company_id,doc_type,subject,r2_key,r2_key_text,summary,tags,is_archived,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).bind(docId,companyId,'Angebot','Angebot 131313 - Testangebot Musterdaten',null,null,'Musterdaten für SoSS-Test','[]',0,now,now).run()

    return c.json({ ok: true, company_id: companyId, doc_id: docId })
  } catch(e:any) { return c.json({ error: e?.message }, 500) }
})
// END TEMP

export default app
