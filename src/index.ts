import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'

type Env = {
  SOSS_DB:  D1Database
  CRM_DB:   D1Database
  STORAGE:  R2Bucket
  ARCHIVE:  R2Bucket
  APP_URL:  string
  CRM_URL:  string
  MAIL_FROM: string
  MAIL_FROM_NAME: string
  MAILCHANNELS_API_KEY?: string
  MS_CLIENT_ID?: string
  MS_TENANT_ID?: string
  MS_CLIENT_SECRET?: string
}

const app = new Hono<{ Bindings: Env }>()

// ── HELPERS ──────────────────────────────────────────────────────────────────

function sessionId(): string { return crypto.randomUUID() }
function nowIso(): string { return new Date().toISOString() }
function addHours(h: number): string {
  return new Date(Date.now() + h * 3600000).toISOString()
}

async function getSession(c: any): Promise<any> {
  const sid = getCookie(c, 'soss_session')
  if (!sid) return null
  const s = await c.env.SOSS_DB.prepare(
    `SELECT * FROM soss_sessions WHERE id=? AND expires_at>? AND used=0`
  ).bind(sid, nowIso()).first()
  return s || null
}

// Angebotsnummer extrahieren (413251-7 → 413251)
function normalizeOfferNr(raw: string): string {
  return raw.trim().replace(/-\d+$/, '').replace(/\s/g, '')
}

// ── HTML TEMPLATES ────────────────────────────────────────────────────────────

const BASE_STYLE = `
  *{box-sizing:border-box;margin:0;padding:0}
  :root{--ac:#00C2FF;--tx:#1a1a2e;--tx2:#4a4a6a;--bd:#e2e8f0;--bg:#f8fafc;--sf:#ffffff;--err:#dc2626;--ok:#16a34a}
  body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:var(--bg);color:var(--tx);font-size:15px;line-height:1.5;min-height:100vh}
  .wrap{max-width:960px;margin:0 auto;padding:24px 16px}
  .card{background:var(--sf);border:1px solid var(--bd);border-radius:14px;padding:28px;margin-bottom:20px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
  .logo{display:flex;align-items:center;gap:6px;font-size:20px;font-weight:700;color:var(--tx);margin-bottom:32px}
  .logo span{color:var(--ac)}
  h1{font-size:22px;font-weight:700;margin-bottom:8px}
  h2{font-size:17px;font-weight:600;margin-bottom:14px;color:var(--tx)}
  h3{font-size:14px;font-weight:600;margin-bottom:8px;color:var(--tx2);text-transform:uppercase;letter-spacing:.04em}
  .inp{width:100%;padding:10px 14px;border:1.5px solid var(--bd);border-radius:9px;font-size:15px;font-family:inherit;outline:none;transition:border-color .15s;background:var(--sf)}
  .inp:focus{border-color:var(--ac);box-shadow:0 0 0 3px rgba(0,194,255,.12)}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;background:var(--ac);color:#fff;border:none;border-radius:9px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;transition:opacity .15s;text-decoration:none;white-space:nowrap}
  .btn:hover{opacity:.9}
  .btn:active{opacity:.8}
  .btn-sec{background:var(--sf);color:var(--tx);border:1.5px solid var(--bd)}
  .btn-ok{background:var(--ok)}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .field{margin-bottom:16px}
  .label{display:block;font-size:13px;font-weight:600;color:var(--tx2);margin-bottom:5px}
  .val{font-size:15px;color:var(--tx)}
  .badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600}
  .badge-blue{background:rgba(0,194,255,.12);color:#0077aa}
  .badge-ok{background:rgba(22,163,74,.1);color:var(--ok)}
  .err-box{background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.2);border-radius:9px;padding:12px 16px;color:var(--err);font-size:14px;margin-bottom:16px}
  .tab-bar{display:flex;gap:0;border-bottom:2px solid var(--bd);margin-bottom:20px}
  .tab-btn{padding:10px 18px;background:none;border:none;font-family:inherit;font-size:14px;font-weight:500;cursor:pointer;color:var(--tx2);border-bottom:2px solid transparent;margin-bottom:-2px;transition:color .15s}
  .tab-btn.active{color:var(--ac);border-bottom-color:var(--ac)}
  .fin-card{border:2px solid var(--bd);border-radius:12px;padding:18px;cursor:pointer;transition:border-color .2s,background .2s;position:relative}
  .fin-card:hover{border-color:var(--ac)}
  .fin-card.selected{border-color:var(--ac);background:rgba(0,194,255,.05)}
  .fin-card input[type=radio]{position:absolute;opacity:0;width:0;height:0}
  .fin-title{font-weight:700;font-size:15px;margin-bottom:4px}
  .fin-sub{font-size:13px;color:var(--tx2)}
  .fin-price{font-size:20px;font-weight:700;color:var(--ac);margin-top:8px}
  #sig-canvas{border:2px dashed var(--bd);border-radius:10px;cursor:crosshair;touch-action:none;display:block;width:100%;background:#fff}
  #sig-canvas.signed{border-color:var(--ac);border-style:solid}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{text-align:left;padding:8px 12px;background:var(--bg);color:var(--tx2);font-weight:600;border-bottom:1px solid var(--bd)}
  td{padding:8px 12px;border-bottom:1px solid var(--bd);color:var(--tx)}
  .step{display:flex;align-items:center;gap:12px;padding:8px 0}
  .step-num{width:28px;height:28px;border-radius:50%;background:var(--ac);color:#fff;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .ref-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  @media(max-width:600px){.grid2{grid-template-columns:1fr}.ref-grid{grid-template-columns:1fr 1fr}}
`

function page(title: string, body: string, scripts = ''): Response {
  const html = `<!DOCTYPE html><html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — vonBusch SoSS</title>
<style>${BASE_STYLE}</style>
</head>
<body>
<div class="wrap">
  <div class="logo">von<span>Busch</span> · Angebot &amp; Auftrag</div>
  ${body}
</div>
${scripts}
</body></html>`
  return new Response(html, { headers: { 'Content-Type': 'text/html;charset=utf-8' } })
}

// ── LOGIN PAGE ────────────────────────────────────────────────────────────────

app.get('/', async (c) => {
  const s = await getSession(c)
  if (s) return c.redirect('/angebot')

  const err = c.req.query('err')
  const errMsg: Record<string,string> = {
    notfound: 'Kundennummer oder Angebotsnummer nicht gefunden. Bitte prüfen Sie Ihre Eingabe.',
    expired:  'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.',
    used:     'Dieses Angebot wurde bereits beauftragt.',
  }

  return page('Anmelden', `
    <div style="max-width:420px;margin:40px auto">
      <h1>Ihr Angebot</h1>
      <p style="color:var(--tx2);margin-bottom:24px;font-size:14px">
        Bitte geben Sie Ihre Kundennummer und die Angebotsnummer ein, um Ihr Angebot anzusehen und zu beauftragen.
      </p>
      ${err ? `<div class="err-box">${errMsg[err]||err}</div>` : ''}
      <div class="card" style="padding:24px">
        <form method="POST" action="/api/auth/login">
          <div class="field">
            <label class="label" for="erp_id">Ihre Kundennummer</label>
            <input class="inp" id="erp_id" name="erp_id" type="text" placeholder="z.B. 10051" required autocomplete="off">
          </div>
          <div class="field" style="margin-bottom:20px">
            <label class="label" for="offer_nr">Angebotsnummer</label>
            <input class="inp" id="offer_nr" name="offer_nr" type="text" placeholder="z.B. 413251" required autocomplete="off">
            <div style="font-size:12px;color:var(--tx2);margin-top:4px">Die Angebotsnummer finden Sie in Ihrer Angebotsmail (ohne den Suffix nach dem Bindestrich).</div>
          </div>
          <button class="btn" type="submit" style="width:100%">Angebot anzeigen →</button>
        </form>
      </div>
      <p style="font-size:12px;color:var(--tx2);text-align:center;margin-top:16px">
        Bei Fragen wenden Sie sich an <a href="mailto:vertrieb@vonbusch.digital" style="color:var(--ac)">vertrieb@vonbusch.digital</a>
      </p>
    </div>
  `)
})

// ── AUTH ──────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (c) => {
  const form = await c.req.formData()
  const erpId  = (form.get('erp_id')   as string || '').trim()
  const offerNr = normalizeOfferNr(form.get('offer_nr') as string || '')
  const ip = c.req.header('CF-Connecting-IP') || ''

  if (!erpId || !offerNr) return c.redirect('/?err=notfound')

  // Firma via Kundennummer
  const co = await c.env.CRM_DB.prepare(
    `SELECT id, name, erp_id FROM companies WHERE TRIM(erp_id)=?`
  ).bind(erpId).first() as any
  if (!co) return c.redirect('/?err=notfound')

  // Angebot via Angebotsnummer
  const doc = await c.env.CRM_DB.prepare(
    `SELECT d.id, d.subject, d.r2_key, d.company_id, d.doc_type
     FROM documents d
     WHERE d.company_id=? AND d.doc_type='Angebot' AND d.is_archived=0
       AND (d.subject LIKE ? OR d.subject LIKE ?)
     ORDER BY d.created_at DESC LIMIT 1`
  ).bind(co.id, `%${offerNr}%`, `%${offerNr}-%`).first() as any

  if (!doc) return c.redirect('/?err=notfound')

  // Prüfen ob schon beauftragt
  const existing = await c.env.SOSS_DB.prepare(
    `SELECT id FROM soss_orders WHERE document_id=? AND status!='rejected'`
  ).bind(doc.id).first()
  if (existing) return c.redirect('/?err=used')

  // Primären Kontakt laden
  const contact = await c.env.CRM_DB.prepare(
    `SELECT id, first_name, last_name, email FROM contacts WHERE company_id=? LIMIT 1`
  ).bind(co.id).first() as any

  const sid = sessionId()
  await c.env.SOSS_DB.prepare(
    `INSERT INTO soss_sessions (id,company_id,document_id,erp_id,offer_number,contact_id,created_at,expires_at,ip_address)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).bind(sid, co.id, doc.id, erpId, offerNr, contact?.id||null, nowIso(), addHours(48), ip).run()

  setCookie(c, 'soss_session', sid, {
    httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 48*3600
  })
  return c.redirect('/angebot')
})

app.get('/api/auth/logout', (c) => {
  deleteCookie(c, 'soss_session')
  return c.redirect('/')
})

// ── ANGEBOT PAGE ──────────────────────────────────────────────────────────────

app.get('/angebot', async (c) => {
  const s = await getSession(c)
  if (!s) return c.redirect('/?err=expired')

  // Firmendaten
  const co = await c.env.CRM_DB.prepare(
    `SELECT co.*, ct.first_name, ct.last_name, ct.email as ct_email, ct.phone as ct_phone
     FROM companies co
     LEFT JOIN contacts ct ON ct.company_id=co.id
     WHERE co.id=? LIMIT 1`
  ).bind(s.company_id).first() as any

  // Dokumentdaten + KI-Extraktion
  const doc = await c.env.CRM_DB.prepare(
    `SELECT * FROM documents WHERE id=?`
  ).bind(s.document_id).first() as any

  const firma = co?.name || '–'
  const kontakt = co ? `${co.first_name||''} ${co.last_name||''}`.trim() || '–' : '–'
  const email = co?.ct_email || co?.email || '–'
  const adresse = [co?.street, co?.zip && co?.city ? `${co.zip} ${co.city}` : co?.city].filter(Boolean).join(', ') || '–'
  const today = new Date().toLocaleDateString('de-DE', {day:'2-digit',month:'long',year:'numeric'})

  // Finanzierungsoptionen aus KI-Extraktion
  const monthlyRate    = doc?.summary ? extractNumber(doc.summary, 'monatlich|rate|mtl') : null
  const totalValue     = doc?.summary ? extractNumber(doc.summary, 'gesamt|summe|netto') : null
  const contractMonths = doc?.summary ? extractNumber(doc.summary, 'laufzeit|monate') : null
  const oneTimeCost    = doc?.summary ? extractNumber(doc.summary, 'einmalk|kauf') : null

  const kaufPreis = oneTimeCost || totalValue || 0
  const mieteRate = monthlyRate || (kaufPreis / 48)
  const leasingRate = mieteRate ? mieteRate * 0.92 : 0
  const monate = contractMonths || 36

  return page('Ihr Angebot', `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px">
      <h1 style="margin:0">Ihr Angebot</h1>
      <a href="/api/auth/logout" style="font-size:13px;color:var(--tx2);text-decoration:none">Abmelden</a>
    </div>

    <!-- Kundendaten -->
    <div class="card">
      <h3>Angebot für</h3>
      <div class="grid2">
        <div>
          <div class="field"><span class="label">Firma</span><span class="val" style="font-weight:600">${firma}</span></div>
          <div class="field"><span class="label">Ansprechpartner</span><span class="val">${kontakt}</span></div>
          <div class="field"><span class="label">E-Mail</span><span class="val">${email}</span></div>
        </div>
        <div>
          <div class="field"><span class="label">Adresse</span><span class="val">${adresse}</span></div>
          <div class="field"><span class="label">Kundennummer</span><span class="val">${s.erp_id}</span></div>
          <div class="field"><span class="label">Angebotsnummer</span><span class="val">${s.offer_number}</span></div>
        </div>
      </div>
      <div style="font-size:13px;color:var(--tx2)">Datum: ${today}</div>
    </div>

    <!-- Angebot PDF + Daten Tabs -->
    <div class="card" style="padding:0;overflow:hidden">
      <div class="tab-bar" style="padding:0 24px;margin:0">
        <button class="tab-btn active" onclick="showTab('overview',this)">📋 Übersicht</button>
        <button class="tab-btn" onclick="showTab('pdf',this)">📄 Angebot (PDF)</button>
      </div>

      <!-- Tab: Übersicht -->
      <div id="tab-overview" style="padding:24px">
        <h3>Angebotsinhalt</h3>
        <p style="font-size:14px;color:var(--tx2);margin-bottom:16px">${doc?.subject || 'Ihr Angebot'}</p>
        ${doc?.summary ? `<div style="background:var(--bg);border-radius:8px;padding:14px;font-size:13px;color:var(--tx2);margin-bottom:16px">${doc.summary}</div>` : ''}
        ${doc?.tags ? `<div style="margin-bottom:8px">${(JSON.parse(doc.tags||'[]') as string[]).map(t=>`<span class="badge badge-blue" style="margin-right:4px">${t}</span>`).join('')}</div>` : ''}
      </div>

      <!-- Tab: PDF -->
      <div id="tab-pdf" style="display:none;padding:0">
        <iframe id="pdf-frame" src="/api/offer/pdf?sid=${s.id}"
          style="width:100%;height:680px;border:none;display:block"
          title="Angebot PDF">
        </iframe>
      </div>
    </div>

    <!-- Finanzierungsoptionen -->
    <div class="card">
      <h2>Finanzierungsart wählen</h2>
      <p style="font-size:13px;color:var(--tx2);margin-bottom:20px">Bitte wählen Sie, wie Sie das Angebot finanzieren möchten:</p>

      <div id="fin-options" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:20px">
        <label class="fin-card" id="card-kauf">
          <input type="radio" name="fin_type" value="kauf" onchange="selectFin('kauf')">
          <div class="fin-title">💳 Kauf</div>
          <div class="fin-sub">Einmalige Zahlung</div>
          <div class="fin-price">${fEu(kaufPreis)}</div>
          <div style="font-size:12px;color:var(--tx2);margin-top:4px">Netto zzgl. MwSt.</div>
        </label>
        <label class="fin-card" id="card-miete">
          <input type="radio" name="fin_type" value="miete" onchange="selectFin('miete')">
          <div class="fin-title">📅 Miete</div>
          <div class="fin-sub">${monate} Monate Laufzeit</div>
          <div class="fin-price">${fEu(mieteRate)}/Monat</div>
          <div style="font-size:12px;color:var(--tx2);margin-top:4px">Netto zzgl. MwSt.</div>
        </label>
        <label class="fin-card" id="card-leasing">
          <input type="radio" name="fin_type" value="leasing" onchange="selectFin('leasing')">
          <div class="fin-title">🔑 Leasing</div>
          <div class="fin-sub">${monate} Monate Laufzeit</div>
          <div class="fin-price">${fEu(leasingRate)}/Monat</div>
          <div style="font-size:12px;color:var(--tx2);margin-top:4px">Netto zzgl. MwSt.</div>
        </label>
      </div>

      <!-- Refinanzierer (nur bei Miete/Leasing) -->
      <div id="ref-section" style="display:none">
        <h3 style="margin-bottom:10px">Finanzierungspartner</h3>
        <div class="ref-grid" id="ref-grid">
          ${['BFL','DLL','GRENKE','MLF (Mercator)','von Busch'].map(r=>`
          <label style="display:flex;align-items:center;gap:8px;padding:10px 14px;border:1.5px solid var(--bd);border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">
            <input type="radio" name="refinanzierer" value="${r}"> ${r}
          </label>`).join('')}
        </div>
      </div>
    </div>

    <!-- Servicevertrag -->
    <div class="card">
      <h2>Servicevertrag</h2>
      <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer">
        <input type="checkbox" id="service-included" style="margin-top:3px;width:18px;height:18px;accent-color:var(--ac)">
        <div>
          <div style="font-weight:600;margin-bottom:3px">Servicevertrag einschließen</div>
          <div style="font-size:13px;color:var(--tx2)">Umfasst Wartung, Support und Betrieb gemäß Angebot. Laufzeit entspricht der gewählten Finanzierungsart.</div>
        </div>
      </label>
    </div>

    <!-- Digitale Unterschrift -->
    <div class="card">
      <h2>Digitale Unterschrift</h2>
      <p style="font-size:13px;color:var(--tx2);margin-bottom:16px">
        Mit Ihrer Unterschrift erteilen Sie verbindlich den Auftrag für das oben ausgewählte Angebot in der gewählten Finanzierungsform.
        Eine Auftragsbestätigung erhalten Sie per E-Mail.
      </p>

      <div style="margin-bottom:12px">
        <label class="label">Unterschrift (Maus oder Touch)</label>
        <canvas id="sig-canvas" width="800" height="160"></canvas>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:20px">
        <button class="btn btn-sec" onclick="clearSig()" type="button" style="font-size:13px;padding:8px 16px">Löschen</button>
        <span id="sig-hint" style="font-size:13px;color:var(--tx2);line-height:1.4;align-self:center">Bitte unterschreiben Sie im Feld oben</span>
      </div>

      <div style="background:rgba(0,194,255,.06);border:1px solid rgba(0,194,255,.2);border-radius:9px;padding:14px 16px;font-size:13px;margin-bottom:20px">
        Mit dem Absenden bestätigen ich / wir die <strong>verbindliche Beauftragung</strong> und stimme den 
        <a href="https://vonbusch.digital/agb" target="_blank" style="color:var(--ac)">AGB der von Busch GmbH</a> zu.
        Eine Bonitätsprüfung wird im Hintergrund durchgeführt.
      </div>

      <button class="btn btn-ok" onclick="submitOrder()" id="submit-btn" style="width:100%;font-size:16px;padding:14px">
        ✓ Auftrag verbindlich erteilen
      </button>
      <div id="submit-err" style="display:none" class="err-box" style="margin-top:12px"></div>
    </div>

    <div style="font-size:12px;color:var(--tx2);text-align:center;padding:20px 0">
      von Busch GmbH · <a href="https://vonbusch.digital" style="color:var(--ac)">vonbusch.digital</a> ·
      <a href="mailto:vertrieb@vonbusch.digital" style="color:var(--ac)">vertrieb@vonbusch.digital</a>
    </div>
  `, `
  <script>
  const SID = '${s.id}'
  const SESSION_DATA = ${JSON.stringify({
    company_id: s.company_id,
    document_id: s.document_id,
    erp_id: s.erp_id,
    offer_number: s.offer_number,
  })}

  // Euros formatieren
  function fEu(n){return n?new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(n):'–'}

  // Tabs
  function showTab(id, btn){
    document.getElementById('tab-overview').style.display='none'
    document.getElementById('tab-pdf').style.display='none'
    document.getElementById('tab-'+id).style.display='block'
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'))
    btn.classList.add('active')
  }

  // Finanzierung wählen
  function selectFin(type){
    document.querySelectorAll('.fin-card').forEach(c=>c.classList.remove('selected'))
    document.getElementById('card-'+type)?.classList.add('selected')
    const showRef = type==='miete'||type==='leasing'
    document.getElementById('ref-section').style.display = showRef?'block':'none'
  }

  // ── SIGNATURE PAD ──────────────────────────────────────────────────────────
  const canvas = document.getElementById('sig-canvas')
  const ctx = canvas.getContext('2d')
  let drawing = false, hasSig = false

  function resizeCanvas(){
    const rect = canvas.parentElement.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = 160 * dpr
    canvas.style.width = rect.width + 'px'
    canvas.style.height = '160px'
    ctx.scale(dpr, dpr)
    ctx.strokeStyle='#1a1a2e'
    ctx.lineWidth=2.5
    ctx.lineCap='round'
    ctx.lineJoin='round'
  }
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  function getPos(e){
    const rect = canvas.getBoundingClientRect()
    const src = e.touches?.[0] || e
    return {x: src.clientX-rect.left, y: src.clientY-rect.top}
  }

  canvas.addEventListener('mousedown', e=>{drawing=true; const p=getPos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y)})
  canvas.addEventListener('mousemove', e=>{if(!drawing)return; const p=getPos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); hasSig=true; canvas.classList.add('signed'); document.getElementById('sig-hint').textContent='Unterschrift gesetzt ✓'})
  canvas.addEventListener('mouseup', ()=>drawing=false)
  canvas.addEventListener('mouseleave', ()=>drawing=false)
  canvas.addEventListener('touchstart', e=>{e.preventDefault(); drawing=true; const p=getPos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y)},{passive:false})
  canvas.addEventListener('touchmove', e=>{e.preventDefault(); if(!drawing)return; const p=getPos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); hasSig=true; canvas.classList.add('signed'); document.getElementById('sig-hint').textContent='Unterschrift gesetzt ✓'},{passive:false})
  canvas.addEventListener('touchend', ()=>drawing=false)

  function clearSig(){
    const dpr=window.devicePixelRatio||1
    ctx.clearRect(0,0,canvas.width/dpr,canvas.height/dpr)
    hasSig=false; canvas.classList.remove('signed')
    document.getElementById('sig-hint').textContent='Bitte unterschreiben Sie im Feld oben'
  }

  // ── SUBMIT ─────────────────────────────────────────────────────────────────
  async function submitOrder(){
    const finType = document.querySelector('input[name=fin_type]:checked')?.value
    if(!finType){ alert('Bitte wählen Sie eine Finanzierungsart.'); return }

    const needsRef = finType==='miete'||finType==='leasing'
    const refinanzierer = needsRef ? document.querySelector('input[name=refinanzierer]:checked')?.value : null
    if(needsRef && !refinanzierer){ alert('Bitte wählen Sie einen Finanzierungspartner.'); return }

    if(!hasSig){ alert('Bitte unterschreiben Sie das Angebot.'); return }

    const btn = document.getElementById('submit-btn')
    btn.disabled=true; btn.textContent='⏳ Wird übertragen…'

    // Signatur als PNG exportieren
    const sigDataUrl = canvas.toDataURL('image/png')

    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          session_id: SID,
          financing_type: finType,
          financing_partner: refinanzierer||'vonBusch',
          service_included: document.getElementById('service-included').checked?1:0,
          signature_png: sigDataUrl,
        })
      })
      const data = await res.json()
      if(data.success){
        window.location.href = '/bestaetigung?order=' + data.order_id
      } else {
        document.getElementById('submit-err').style.display='block'
        document.getElementById('submit-err').textContent = 'Fehler: ' + (data.error||'Unbekannter Fehler')
        btn.disabled=false; btn.textContent='✓ Auftrag verbindlich erteilen'
      }
    } catch(e){
      btn.disabled=false; btn.textContent='✓ Auftrag verbindlich erteilen'
      alert('Verbindungsfehler. Bitte versuchen Sie es erneut.')
    }
  }

  function fEu(n){if(!n)return'0,00 €';return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(n)}
  </script>
  `)
})

// Hilfsfunktion: Zahlen aus Summary-Text extrahieren
function extractNumber(text: string, pattern: string): number | null {
  const re = new RegExp(`(${pattern})[^\\d]*(\\d[\\d.,]*)`, 'i')
  const m = text.match(re)
  if (!m) return null
  return parseFloat(m[2].replace(/\./g,'').replace(',','.'))
}

function fEu(n: number): string {
  if (!n) return '0,00 €'
  return new Intl.NumberFormat('de-DE', { style:'currency', currency:'EUR' }).format(n)
}

// ── PDF PROXY ─────────────────────────────────────────────────────────────────

app.get('/api/offer/pdf', async (c) => {
  const sid = c.req.query('sid') || ''
  const s = await c.env.SOSS_DB.prepare(
    `SELECT * FROM soss_sessions WHERE id=? AND expires_at>?`
  ).bind(sid, nowIso()).first() as any
  if (!s) return c.json({ error: 'Ungültige Sitzung' }, 401)

  const doc = await c.env.CRM_DB.prepare(
    `SELECT r2_key, mime_type, original_name FROM documents WHERE id=?`
  ).bind(s.document_id).first() as any
  if (!doc) return c.json({ error: 'Dokument nicht gefunden' }, 404)

  const obj = await c.env.STORAGE.get(doc.r2_key)
  if (!obj) return c.json({ error: 'Datei nicht gefunden' }, 404)

  return new Response(obj.body, {
    headers: {
      'Content-Type': doc.mime_type || 'application/pdf',
      'Content-Disposition': `inline; filename="${encodeURIComponent(doc.original_name)}"`,
      'Cache-Control': 'private, max-age=3600',
    }
  })
})

// ── ORDER SUBMIT ──────────────────────────────────────────────────────────────

app.post('/api/order', async (c) => {
  const body = await c.req.json() as any
  const { session_id, financing_type, financing_partner, service_included, signature_png } = body

  // Session validieren
  const s = await c.env.SOSS_DB.prepare(
    `SELECT * FROM soss_sessions WHERE id=? AND expires_at>? AND used=0`
  ).bind(session_id, nowIso()).first() as any
  if (!s) return c.json({ error: 'Ungültige oder abgelaufene Sitzung', success: false }, 401)

  // Nochmal prüfen ob schon bestellt
  const existing = await c.env.SOSS_DB.prepare(
    `SELECT id FROM soss_orders WHERE document_id=? AND status!='rejected'`
  ).bind(s.document_id).first()
  if (existing) return c.json({ error: 'Dieses Angebot wurde bereits beauftragt.', success: false }, 409)

  const now = nowIso()
  const orderId = crypto.randomUUID()

  // Firmendaten laden
  const co = await c.env.CRM_DB.prepare(
    `SELECT co.*, ct.first_name, ct.last_name, ct.email as ct_email
     FROM companies co LEFT JOIN contacts ct ON ct.company_id=co.id
     WHERE co.id=? LIMIT 1`
  ).bind(s.company_id).first() as any

  // Angebotsdaten laden
  const doc = await c.env.CRM_DB.prepare(`SELECT * FROM documents WHERE id=?`).bind(s.document_id).first() as any

  // Finanzierungswerte aus Dokument
  const monthlyRate    = doc?.summary ? extractNumber(doc.summary, 'monatlich|rate|mtl') : null
  const totalValue     = doc?.summary ? extractNumber(doc.summary, 'gesamt|summe|netto') : null
  const contractMonths = doc?.summary ? extractNumber(doc.summary, 'laufzeit|monate') : null

  // Signatur als PNG in Archiv speichern
  let sigKey: string | null = null
  if (signature_png && signature_png.startsWith('data:image/png;base64,')) {
    const b64 = signature_png.replace('data:image/png;base64,', '')
    const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    const d = new Date(now)
    sigKey = `signatures/${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${orderId}-signature.png`
    await c.env.ARCHIVE.put(sigKey, binary, {
      httpMetadata: { contentType: 'image/png' },
      customMetadata: {
        orderId, companyId: s.company_id, erpId: s.erp_id,
        offerNumber: s.offer_number, signedAt: now,
        financingType: financing_type, financingPartner: financing_partner||'',
      }
    })
  }

  // Order in SOSS_DB speichern
  await c.env.SOSS_DB.prepare(`
    INSERT INTO soss_orders (id,session_id,company_id,document_id,erp_id,offer_number,
      contact_name,contact_email,financing_type,financing_partner,monthly_rate,total_value,
      contract_months,service_included,signature_r2_key,signed_at,ip_address,status,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?)
  `).bind(
    orderId, session_id, s.company_id, s.document_id, s.erp_id, s.offer_number,
    co ? `${co.first_name||''} ${co.last_name||''}`.trim() : null,
    co?.ct_email || co?.email || null,
    financing_type, financing_partner || 'vonBusch',
    monthlyRate, totalValue, contractMonths,
    service_included ? 1 : 0,
    sigKey, now,
    c.req.header('CF-Connecting-IP') || null,
    now
  ).run()

  // Session als genutzt markieren
  await c.env.SOSS_DB.prepare(`UPDATE soss_sessions SET used=1 WHERE id=?`).bind(session_id).run()

  // ── CRM: Aktivität anlegen ─────────────────────────────────────────────────
  const akId = crypto.randomUUID()
  const dealId = crypto.randomUUID()
  const finLabel: Record<string,string> = {kauf:'Kauf (Einmalzahlung)', miete:'Miete', leasing:'Leasing'}
  const body_text = [
    `Auftrag über SoSS erteilt am ${new Date(now).toLocaleString('de-DE')}`,
    `Angebotsnummer: ${s.offer_number}`,
    `Kundennummer: ${s.erp_id}`,
    `Finanzierung: ${finLabel[financing_type]||financing_type} via ${financing_partner||'vonBusch'}`,
    monthlyRate ? `Monatliche Rate: ${fEu(monthlyRate)}` : '',
    totalValue  ? `Gesamtwert: ${fEu(totalValue)}` : '',
    `Servicevertrag: ${service_included?'Ja':'Nein'}`,
    sigKey ? `Unterschrift archiviert: ${sigKey}` : '',
  ].filter(Boolean).join('\n')

  // Verantwortlichen Sales Manager ermitteln
  const ownerUser = await c.env.CRM_DB.prepare(
    `SELECT id FROM users WHERE team='ITS' AND role IN ('sales_manager','sales') AND active=1 LIMIT 1`
  ).first() as any
  const ownerId = ownerUser?.id || 'usr-aw'

  try {
    // Deal anlegen (won)
    await c.env.CRM_DB.prepare(`
      INSERT INTO deals (id,title,company_id,owner_id,bereich,stage,value,cost_value,margin_value,margin_percent,status,notes,created_at,updated_at)
      VALUES (?,?,?,?,'Cloudflare','won',?,0,0,0,'open',?,?,?)
    `).bind(dealId, `Auftrag ${s.offer_number} — ${co?.name||s.erp_id}`,
      s.company_id, ownerId, totalValue||0, body_text, now, now).run()

    // Aktivität für Sales Manager
    await c.env.CRM_DB.prepare(`
      INSERT INTO activities (id,type,subject,body,company_id,owner_id,status,due_at,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).bind(akId, 'Lead',
      `🎯 Auftrag erteilt: Angebot ${s.offer_number} — ${co?.name||s.erp_id}`,
      body_text, s.company_id, ownerId, 'open',
      new Date(Date.now() + 86400000).toISOString(), now, now).run()

    // Aktivität für Administration (Bonitätsprüfung)
    const adminUser = await c.env.CRM_DB.prepare(
      `SELECT id FROM users WHERE role='admin' AND active=1 LIMIT 1`
    ).first() as any
    const bonitätAkId = crypto.randomUUID()
    await c.env.CRM_DB.prepare(`
      INSERT INTO activities (id,type,subject,body,company_id,owner_id,status,due_at,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).bind(bonitätAkId, 'Bonitätsanfrage',
      `🔍 Bonitätsprüfung: ${co?.name||s.erp_id} — Angebot ${s.offer_number}`,
      `Refinanzierer: ${financing_partner||'vonBusch'}\nBitte Bonitätsanfrage stellen und Bestätigung hochladen.\n\n${body_text}`,
      s.company_id, adminUser?.id || ownerId, 'open',
      new Date(Date.now() + 86400000).toISOString(), now, now).run()

    // Bonitätsprüfung in SOSS_DB
    await c.env.SOSS_DB.prepare(`
      INSERT INTO soss_credit_checks (id,order_id,refinanzierer,status,created_at)
      VALUES (?,?,?,'pending',?)
    `).bind(crypto.randomUUID(), orderId, financing_partner||'vonBusch', now).run()

    // Order mit CRM-IDs aktualisieren
    await c.env.SOSS_DB.prepare(
      `UPDATE soss_orders SET crm_deal_id=?, crm_activity_id=? WHERE id=?`
    ).bind(dealId, akId, orderId).run()

  } catch (e) {
    console.error('CRM write error:', e)
    // Nicht fatal — Order ist gespeichert
  }

  // ── E-Mail an Kunden ───────────────────────────────────────────────────────
  const customerEmail = co?.ct_email || co?.email
  if (customerEmail) {
    try {
      await sendEmail(c.env, {
        to: customerEmail,
        toName: co ? `${co.first_name||''} ${co.last_name||''}`.trim() : 'Kunde',
        subject: `Auftragsbestätigung: Angebot ${s.offer_number}`,
        html: orderConfirmationEmail({
          firma: co?.name || s.erp_id,
          kontakt: co ? `${co.first_name||''} ${co.last_name||''}`.trim() : '',
          offerNr: s.offer_number,
          finType: finLabel[financing_type] || financing_type,
          finPartner: financing_partner || 'vonBusch',
          monthlyRate: monthlyRate || 0,
          totalValue: totalValue || 0,
          contractMonths: contractMonths || 0,
          serviceIncluded: !!service_included,
          orderId,
          signedAt: now,
        })
      })
    } catch (e) {
      console.error('Email error:', e)
    }
  }

  return c.json({ success: true, order_id: orderId })
})

// ── BESTÄTIGUNG PAGE ──────────────────────────────────────────────────────────

app.get('/bestaetigung', (c) => {
  const orderId = c.req.query('order') || ''
  deleteCookie(c, 'soss_session')

  return page('Auftrag bestätigt', `
    <div style="max-width:560px;margin:40px auto;text-align:center">
      <div style="font-size:64px;margin-bottom:20px">✅</div>
      <h1 style="color:var(--ok)">Auftrag erteilt!</h1>
      <p style="font-size:16px;color:var(--tx2);margin:16px 0 24px">
        Vielen Dank für Ihren Auftrag. Wir haben Ihre Bestellung erhalten und werden uns umgehend bei Ihnen melden.
      </p>
      <div class="card" style="text-align:left">
        <div class="step"><div class="step-num">1</div><div><strong>Auftragsbestätigung per Mail</strong><br><span style="font-size:13px;color:var(--tx2)">Sie erhalten in Kürze eine Bestätigungsmail mit allen Details.</span></div></div>
        <div class="step"><div class="step-num">2</div><div><strong>Bonitätsprüfung</strong><br><span style="font-size:13px;color:var(--tx2)">Unser Team führt im Hintergrund eine Bonitätsprüfung durch.</span></div></div>
        <div class="step"><div class="step-num">3</div><div><strong>Auftragsbearbeitung</strong><br><span style="font-size:13px;color:var(--tx2)">Nach Freigabe beginnen wir umgehend mit der Auftragsbearbeitung.</span></div></div>
        <div class="step"><div class="step-num">4</div><div><strong>Ihr Ansprechpartner meldet sich</strong><br><span style="font-size:13px;color:var(--tx2)">Ihr Sales Manager bei von Busch nimmt persönlich Kontakt auf.</span></div></div>
      </div>
      <p style="font-size:13px;color:var(--tx2);margin-top:20px">
        Referenznummer: <strong>${orderId.substring(0,8).toUpperCase()}</strong><br>
        Bei Fragen: <a href="mailto:vertrieb@vonbusch.digital" style="color:var(--ac)">vertrieb@vonbusch.digital</a>
      </p>
    </div>
  `)
})

// ── E-MAIL ────────────────────────────────────────────────────────────────────

async function sendEmail(env: Env, opts: {
  to: string; toName: string; subject: string; html: string
}): Promise<void> {
  // Mailchannels (Cloudflare Workers Email)
  await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: opts.to, name: opts.toName }] }],
      from: { email: env.MAIL_FROM || 'noreply@vonbusch.app', name: env.MAIL_FROM_NAME || 'von Busch GmbH' },
      subject: opts.subject,
      content: [{ type: 'text/html', value: opts.html }],
    })
  })
}

function orderConfirmationEmail(d: {
  firma: string; kontakt: string; offerNr: string; finType: string; finPartner: string;
  monthlyRate: number; totalValue: number; contractMonths: number;
  serviceIncluded: boolean; orderId: string; signedAt: string;
}): string {
  const date = new Date(d.signedAt).toLocaleString('de-DE', {dateStyle:'long', timeStyle:'short'})
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:system-ui,sans-serif;color:#1a1a2e;max-width:600px;margin:0 auto;padding:24px">
<div style="background:#00C2FF;border-radius:8px 8px 0 0;padding:20px 24px">
  <h1 style="color:#fff;margin:0;font-size:20px">Auftragsbestätigung</h1>
  <p style="color:rgba(255,255,255,.85);margin:4px 0 0;font-size:14px">von Busch GmbH</p>
</div>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:24px">
  <p>Sehr geehrte/r ${d.kontakt||'Damen und Herren'},</p>
  <p>vielen Dank für Ihren Auftrag! Wir bestätigen den Eingang Ihrer verbindlichen Bestellung.</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
    <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#4a4a6a;width:160px">Firma</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-weight:600">${d.firma}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#4a4a6a">Angebotsnummer</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-weight:600">${d.offerNr}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#4a4a6a">Finanzierungsart</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0">${d.finType}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#4a4a6a">Finanzierungspartner</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0">${d.finPartner}</td></tr>
    ${d.monthlyRate ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#4a4a6a">Monatliche Rate</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-weight:600;color:#00C2FF">${fEu(d.monthlyRate)}/Monat zzgl. MwSt.</td></tr>` : ''}
    ${d.totalValue ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#4a4a6a">Gesamtbetrag</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-weight:600">${fEu(d.totalValue)} zzgl. MwSt.</td></tr>` : ''}
    <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#4a4a6a">Servicevertrag</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0">${d.serviceIncluded?'Ja':'Nein'}</td></tr>
    <tr><td style="padding:8px 0;color:#4a4a6a">Beauftragt am</td><td style="padding:8px 0">${date}</td></tr>
  </table>
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px;font-size:13px;color:#4a4a6a">
    Im Hintergrund wird eine Bonitätsprüfung durchgeführt. Ihr Ansprechpartner meldet sich bei Ihnen sobald alles geprüft wurde.
  </div>
  <p style="margin-top:20px;font-size:14px">Mit freundlichen Grüßen,<br><strong>von Busch GmbH</strong><br>vertrieb@vonbusch.digital</p>
</div>
</body></html>`
}

// ── HEALTH ────────────────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({ status: 'ok', service: 'vonbusch-soss', version: '1.0.0' }))

export default app
