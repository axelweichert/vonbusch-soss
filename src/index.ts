import { Hono } from 'hono'
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
  const obj = await c.env.STORAGE.get(doc.r2_key)
  if (!obj) return c.json({ error: 'Datei nicht gefunden' }, 404)
  return new Response(obj.body as ReadableStream, {
    headers: { 'Content-Type': doc.mime_type || 'application/pdf', 'Content-Disposition': 'inline; filename="angebot.pdf"', 'Cache-Control': 'private, max-age=3600' }
  })
})

app.get('/api/offer/financials', async (c) => {
  const sid = c.req.query('sid') || ''
  const s = await c.env.SOSS_DB.prepare('SELECT * FROM soss_sessions WHERE id=? AND expires_at>?').bind(sid, nowIso()).first() as any
  if (!s) return c.json({ error: 'Ungueltige Sitzung' }, 401)
  const doc = await c.env.CRM_DB.prepare('SELECT r2_key_text, subject, summary, fulltext_idx FROM documents WHERE id=?').bind(s.document_id).first() as any
  if (!doc) return c.json({ error: 'Nicht gefunden' }, 404)
  // Beste Textquelle: R2-Textdatei > fulltext_idx > summary
  let fullText = (doc.fulltext_idx || '') + ' ' + (doc.summary || '')
  if (doc.r2_key_text) {
    try {
      const o = await c.env.STORAGE.get(doc.r2_key_text)
      if (o) { const txt = await o.text(); if (txt && txt.length > 50) fullText = txt }
    } catch (_) {}
  }
  return c.json({ ...extractFinancials(fullText), subject: doc.subject, summary: doc.summary })
})

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
  return c.json({ success: true, order_id: orderId })
})

app.get('/health', (c) => c.json({ status: 'ok', service: 'vonbusch-soss', version: '1.0.7' }))

export default app
