#!/usr/bin/env node
/**
 * chua-deploy.mjs — puts the temple on tuvi.terranimus.com/chua/, a tab of Tử Vi (vault action `deploy`). Idempotent.
 *
 *   node scripts/vault-sync.mjs pull --action deploy
 *   node scripts/chua-deploy.mjs [--dry-run]
 *
 * What it publishes: ONLY index.html and the files under assets/ (an allow-list). live/ (the TikTok LIVE kit, a Node
 * server meant for the streamer's own machine) and everything else in the repository are never uploaded.
 *
 * Steps: the Content-Security-Policy is built with the sha256 of each inline <script> and <style> in index.html; the
 * files are uploaded as Workers static assets (assets-upload-session, then the buckets Cloudflare asks for); the Worker
 * "chua" (ops/chua.worker.mjs) is uploaded through the Cloudflare API (never wrangler) with the assets, CSP and COMMIT;
 * any custom domain of the Worker is removed; the routes tuvi.terranimus.com/chua and /chua/* are kept; then the live
 * checks: /chua/health/ready names this commit, /chua/ answers 200 with the CSP and HSTS, /chua/live/* answers 404,
 * Tử Vi's own /health/ready still answers from Tử Vi. Prints names and counts, never a secret.
 */
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative, sep } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { vaultGate } from './lib/vault-gate.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC_HOST = 'tuvi.terranimus.com'
const BASE = '/chua'
const ROUTES = [`${PUBLIC_HOST}${BASE}`, `${PUBLIC_HOST}${BASE}/*`]
const SITE = `https://${PUBLIC_HOST}${BASE}`
const SCRIPT = 'chua'
const DRY = process.argv.includes('--dry-run')

const TYPES = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg' }

/** The allow-list: index.html and assets/** (only known media types). */
function publishedFiles() {
  const files = [{ path: '/index.html', abs: join(ROOT, 'index.html') }]
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (name.startsWith('.')) continue
      const abs = join(dir, name)
      if (statSync(abs).isDirectory()) walk(abs)
      else if (TYPES[extname(name).toLowerCase()]) files.push({ path: '/' + relative(ROOT, abs).split(sep).join('/'), abs })
      else { console.error(`chua-deploy: refusing unknown file type in assets/: ${relative(ROOT, abs)}`); process.exit(1) }
    }
  }
  walk(join(ROOT, 'assets'))
  for (const f of files) if (!f.path.startsWith('/assets/') && f.path !== '/index.html') throw new Error(`not allowed: ${f.path}`)
  return files.map((f) => {
    const buf = readFileSync(f.abs)
    const ext = extname(f.path).toLowerCase()
    return { ...f, buf, size: buf.length, type: TYPES[ext], hash: createHash('sha256').update(buf.toString('base64') + ext.slice(1)).digest('hex').slice(0, 32) }
  })
}

/** CSP with the hashes of the page's inline script and style blocks (the page is served unchanged). */
function buildCsp(raw) {
  const html = raw.replace(/\r\n?/g, '\n') // browsers hash inline blocks after normalising newlines to LF
  const sha = (s) => `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => sha(m[1]))
  const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => sha(m[1]))
  if (/<script\s+[^>]*src=/i.test(html)) throw new Error('index.html loads an external script; review it before allowing it in the CSP')
  if (/\son[a-z]+=/i.test(html.replace(/<script>[\s\S]*?<\/script>/g, ''))) throw new Error('index.html has an inline event handler; the CSP would block it')
  return [
    "default-src 'none'",
    `script-src 'self' ${scripts.join(' ')}`,
    `style-src 'self' ${styles.join(' ')} https://fonts.googleapis.com`,
    'font-src https://fonts.gstatic.com',
    "img-src 'self' data:",
    "media-src 'self'",
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ')
}

function readEnv(file) {
  const out = {}
  for (const line of readFileSync(join(ROOT, file), 'utf8').split(/\r?\n/)) {
    const i = line.indexOf('=')
    if (i > 0 && !line.startsWith('#')) out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"(.*)"$/, '$1')
  }
  return out
}

function cloudflare(env) {
  return async (method, path, body) => {
    const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
      method,
      headers: { Authorization: `Bearer ${env.CF_API_TOKEN}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || j.success === false) {
      const msg = (j.errors || []).map((e) => `${e.code} ${e.message}`).join('; ') || res.statusText
      throw new Error(`${method} ${path.replace(/[0-9a-f]{32}/g, '…')}: ${res.status} ${msg}`)
    }
    return j.result
  }
}

let commit = 'dev'
try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim() } catch { /* no commit yet */ }
const dirty = (() => { try { return execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim() !== '' } catch { return true } })()

const files = publishedFiles()
const csp = buildCsp(readFileSync(join(ROOT, 'index.html'), 'utf8'))
const code = readFileSync(join(ROOT, 'ops', 'chua.worker.mjs'))
const total = files.reduce((n, f) => n + f.size, 0)
console.log(`chua-deploy: commit ${commit.slice(0, 12)}${dirty ? ' (uncommitted changes)' : ''}, ${files.length} files, ${(total / 1048576).toFixed(1)} MB, worker ${(code.length / 1024).toFixed(1)} KB`)
console.log(`CSP: ${csp}`)

if (DRY) {
  for (const f of files) console.log(`  ${f.path} ${f.size} B`)
  console.log(`[dry run] would upload ${files.length} assets and the Worker "${SCRIPT}", remove any custom domain, routes ${ROUTES.join(', ')}`)
  process.exit(0)
}
if (dirty) { console.error('chua-deploy: the working tree has uncommitted changes; commit first so the live commit is real'); process.exit(1) }

{
  const gate = await vaultGate({ root: ROOT, action: 'deploy' })
  if (!gate.ok) process.exit(gate.code)
}
const env = readEnv('.env.chua-cf')
const cf = cloudflare(env)
const ACCOUNT = env.CF_ACCOUNT_ID

// 1. Static assets: Cloudflare answers with the buckets of files it does not hold yet.
const manifest = Object.fromEntries(files.map((f) => [f.path, { hash: f.hash, size: f.size }]))
const session = await cf('POST', `/accounts/${ACCOUNT}/workers/scripts/${SCRIPT}/assets-upload-session`, { manifest })
let completion = session.jwt
const byHash = new Map(files.map((f) => [f.hash, f]))
for (const bucket of session.buckets || []) {
  const fd = new FormData()
  for (const h of bucket) {
    const f = byHash.get(h)
    fd.append(h, new File([f.buf.toString('base64')], h, { type: f.type }))
  }
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/assets/upload?base64=true`, { method: 'POST', headers: { Authorization: `Bearer ${session.jwt}` }, body: fd })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || j.success === false) { console.error(`chua-deploy: asset upload failed: ${res.status} ${(j.errors || []).map((e) => `${e.code} ${e.message}`).join('; ')}`); process.exit(1) }
  if (j.result?.jwt) completion = j.result.jwt
}
console.log(`assets: ${(session.buckets || []).flat().length} uploaded, ${files.length - (session.buckets || []).flat().length} already held`)

// 2. The Worker with its assets and bindings.
const metadata = {
  main_module: 'chua.worker.mjs',
  compatibility_date: '2026-09-01',
  assets: { jwt: completion, config: { run_worker_first: true, html_handling: 'auto-trailing-slash', not_found_handling: 'none' } },
  bindings: [
    { type: 'assets', name: 'ASSETS' },
    { type: 'plain_text', name: 'CSP', text: csp },
    { type: 'plain_text', name: 'COMMIT', text: commit },
    { type: 'plain_text', name: 'PUBLIC_HOST', text: PUBLIC_HOST },
    { type: 'plain_text', name: 'BASE', text: BASE },
  ],
}
const fd = new FormData()
fd.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
fd.append('chua.worker.mjs', new Blob([code], { type: 'application/javascript+module' }), 'chua.worker.mjs')
const up = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${SCRIPT}`, { method: 'PUT', headers: { Authorization: `Bearer ${env.CF_API_TOKEN}` }, body: fd })
const upj = await up.json().catch(() => ({}))
if (!up.ok || upj.success === false) { console.error('chua-deploy: worker upload failed:', (upj.errors || []).map((e) => `${e.code} ${e.message}`).join('; ')); process.exit(1) }
console.log(`worker ${SCRIPT} uploaded`)

// 3. No custom domain: the owner, 2 Nov 2026, removed chua.terranimus.com (the temple is only a tab of Tử Vi).
const domains = await cf('GET', `/accounts/${ACCOUNT}/workers/domains`)
for (const d of (domains || []).filter((x) => x.service === SCRIPT)) {
  await cf('DELETE', `/accounts/${ACCOUNT}/workers/domains/${d.id}`)
  console.log(`custom domain ${d.hostname} removed (the temple lives only at ${SITE}/)`)
}

// 4. The tab: Worker routes for /chua and /chua/* on TuVi's name (more specific than TuVi's own tuvi.terranimus.com/*,
// so only these paths reach this Worker). A route held by another script is refused, never taken over.
const routes = await cf('GET', `/zones/${env.CF_ZONE_ID}/workers/routes`)
for (const pattern of ROUTES) {
  const r = routes.find((x) => x.pattern === pattern)
  if (r && r.script !== SCRIPT) { console.error(`chua-deploy: route ${pattern} belongs to ${r.script}; refusing`); process.exit(1) }
  if (!r) { await cf('POST', `/zones/${env.CF_ZONE_ID}/workers/routes`, { pattern, script: SCRIPT }); console.log(`route ${pattern}: created`) }
  else console.log(`route ${pattern}: present`)
}

// 5. Live checks.
async function live() {
  const h = await fetch(`${SITE}/health/ready`, { cache: 'no-store' })
  const hj = await h.json().catch(() => ({}))
  if (!(h.status === 200 && hj.service === 'terranimus-chua' && hj.commit === commit)) return `health ${h.status} ${String(hj.commit || '').slice(0, 12)}`
  const page = await fetch(`${SITE}/`)
  const body = await page.text()
  if (page.status !== 200 || !body.includes('Chánh Điện Online')) return `${BASE}/ ${page.status}`
  if (page.headers.get('content-security-policy') !== csp) return `${BASE}/ CSP missing or stale`
  if (!page.headers.get('strict-transport-security')) return `${BASE}/ HSTS missing`
  const bare = await fetch(SITE, { redirect: 'manual' })
  if (bare.status !== 301 || !(bare.headers.get('location') || '').endsWith(`${BASE}/`)) return `${BASE} answered ${bare.status}, expected 301 to ${BASE}/`
  for (const p of ['/live/', '/live/server.mjs', '/live/overlay.html', '/live/control.html', '/live/package.json', '/README.md', '/LICENSE', '/_headers', '/.git/config', '/scripts/chua-deploy.mjs']) {
    const r = await fetch(`${SITE}${p}`)
    if (r.status !== 404) return `${BASE}${p} answered ${r.status}, expected 404`
  }
  const a = await fetch(`${SITE}/assets/hall.jpg`, { method: 'HEAD' })
  if (a.status !== 200 || !/max-age=86400/.test(a.headers.get('cache-control') || '')) return `${BASE}/assets/hall.jpg ${a.status} ${a.headers.get('cache-control')}`
  // TuVi itself must still answer from TuVi.
  const t = await fetch(`https://${PUBLIC_HOST}/health/ready`, { cache: 'no-store' })
  const tj = await t.json().catch(() => ({}))
  if (tj.service !== 'terranimus-tuvi') return `TuVi /health/ready answered ${t.status} ${tj.service || ''}: STOP and check the routes`
  return null
}
let last = ''
for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 4000))
  try { last = await live() } catch (e) { last = e.message }
  if (last === null) { console.log(`chua-deploy: ok (${SITE}/ on ${commit.slice(0, 12)}; live/ answers 404; TuVi untouched)`); process.exit(0) }
  if (i % 3 === 0) console.log(`waiting: ${last}`)
}
console.error(`chua-deploy: live checks did not pass in two minutes (${last})`)
process.exit(1)
