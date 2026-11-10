#!/usr/bin/env node
// deploy-preflight: run BEFORE any deploy. Canonical copy lives in the vault repository; sync-vault-client copies it.
// Checks, in order (each prints one line, names only, never a value):
//   1. vault session   2. manifest check (every vaultGate action is declared)   3. transport side equals token side
//   4. SSH BatchMode to each origin (from deploy-preflight.json or the SSH_HOST_<NAME> settings in .env.local)
//   5. /health/ready of each origin and of the public name compared (commit when it is reported, else bootId)
// deploy-preflight.json (optional): { "origins": [{ "name": "sg1", "healthUrl": "https://..." }], "publicUrl": "https://..." }
// Exit 0 when nothing failed, 1 otherwise. Fix the first failure and run again; a deploy never starts on a red preflight.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const say = (ok, msg) => { if (!ok) failed += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); };

function readEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}

const run = (args) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', timeout: 60000, windowsHide: true });

// 1. vault session
const who = run(['scripts/vault-sync.mjs', 'whoami']);
say(who.status === 0, who.status === 0 ? 'vault session present' : 'no vault session (run: node scripts/vault-sync.mjs login, once per computer)');

// 2. manifest check
const mc = run(['scripts/vault-sync.mjs', 'manifest', 'check']);
say(mc.status === 0, (mc.stdout || mc.stderr || '').trim().split('\n').pop() || 'manifest check');

// 3. transport side equals token side: the token is sealed with Windows DPAPI, so a WSL/Linux process cannot read it.
const isWsl = process.platform === 'linux' && /microsoft/i.test(os.release());
const sealedWindows = /DPAPI/i.test(who.stdout || '');
say(!(isWsl && sealedWindows), isWsl && sealedWindows ? 'transport is WSL but the vault token is sealed on Windows: run the deploy from Windows PowerShell/Git Bash (npm run deploy:windows), not WSL' : `transport ${isWsl ? 'WSL' : process.platform} matches the token side`);

// 4. SSH BatchMode per origin
let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'deploy-preflight.json'), 'utf8')); } catch { /* optional */ }
const env = { ...readEnvFile(path.join(ROOT, '.env.local')), ...process.env };
const names = (cfg.origins || []).map((o) => o.name.toUpperCase());
if (!names.length) for (const k of Object.keys(env)) { const m = /^SSH_HOST_([A-Z0-9_]+)$/.exec(k); if (m) names.push(m[1]); }
for (const n of names) {
  const host = env[`SSH_HOST_${n}`]; const user = env[`SSH_USER_${n}`]; const port = env[`SSH_PORT_${n}`] || '22';
  const key = env[`SSH_KEY_FILE_${n}`];
  if (!host || !user) { say(false, `ssh ${n}: SSH_HOST_${n} / SSH_USER_${n} not set (run: node scripts/vault-sync.mjs pull --action deploy)`); continue; }
  const args = ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', '-o', 'StrictHostKeyChecking=accept-new', '-p', port, ...(key ? ['-i', key] : []), `${user}@${host}`, 'true'];
  const r = spawnSync('ssh', args, { encoding: 'utf8', timeout: 30000, windowsHide: true });
  say(r.status === 0, `ssh ${n} (${host}) BatchMode ${r.status === 0 ? 'works' : 'refused or unreachable'}`);
}

// 5. health compare
// Origins share their server's certificate (HARouter allowHostnameMismatch), so an origin name is probed with ONLY the name check
// relaxed: the chain and expiry are still verified (every registered origin's chain verified on 10 Nov 2026). `agent: false` opens a
// fresh connection per probe, so a socket the host closed while the preflight ran SSH is never reused.
function healthLax(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const req = https.request({ host: u.hostname, path: u.pathname, method: 'GET', timeout: 10000, agent: false, checkServerIdentity: () => undefined }, (res) => {
      let b = ''; res.setEncoding('utf8'); res.on('data', (c) => { if (b.length < 20000) b += c; });
      res.on('end', () => { let j = {}; try { j = JSON.parse(b); } catch { /* not json */ } resolve({ status: res.statusCode, stamp: j.commit || j.bootId || null, kind: j.commit ? 'commit' : 'bootId' }); });
    });
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, stamp: null }); });
    req.on('error', () => resolve({ status: 0, stamp: null }));
    req.end();
  });
}
async function health(url, lax = false) {
  if (lax) return healthLax(url);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const j = await res.json().catch(() => ({}));
    return { status: res.status, stamp: j.commit || j.bootId || null, kind: j.commit ? 'commit' : 'bootId' };
  } catch { return { status: 0, stamp: null }; }
}
// Hosts: deploy-preflight.json wins; otherwise the estate registry (AI.Template estate/hosts.json, the single source of truth).
function estateApp() {
  const bases = [process.env.ESTATE_HOSTS_FILE, path.resolve(ROOT, '..', 'AI.Template', 'estate', 'hosts.json'), path.join(os.homedir(), '.terranimus', 'estate-hosts.json'), 'D:/Git/_handover/estate-hosts.cache.json'].filter(Boolean);
  let reg = null;
  for (const b of bases) { try { reg = JSON.parse(fs.readFileSync(b, 'utf8')); break; } catch { /* next */ } }
  if (!reg) { const g = spawnSync('git', ['-C', path.resolve(ROOT, '..', 'AI.Template'), 'show', 'origin/main:estate/hosts.json'], { encoding: 'utf8', timeout: 15000, windowsHide: true }); try { reg = JSON.parse(g.stdout); } catch { /* none */ } }
  const me = path.basename(ROOT).toLowerCase();
  return reg && (reg.apps || []).find((a) => String(a.repoDir).toLowerCase() === me || a.name.toLowerCase() === me);
}
let fromEstate = false;
if (!(cfg.origins || []).some((o) => o.healthUrl) && !cfg.publicUrl) {
  const a = estateApp();
  if (a) {
    fromEstate = true;
    cfg = { origins: a.origins.filter((o) => o.status !== 'unverified').map((o) => ({ name: o.hostname.split('.')[0], healthUrl: `https://${o.hostname}${a.healthPath}` })), publicUrl: `https://${a.publicHost}${a.healthPath}` };
    console.log(`note hosts read from the estate registry (${a.name}: ${cfg.origins.length} origin(s) plus the public name)`);
  }
}
const targets = [...(cfg.origins || []).filter((o) => o.healthUrl).map((o) => [o.name, o.healthUrl, fromEstate]), ...(cfg.publicUrl ? [['public', cfg.publicUrl]] : [])];
const seen = new Map();
for (const [name, url, lax] of targets) {
  const h = await health(url, lax);
  seen.set(name, h);
  say(h.status === 200, `health ${name}: ${h.status}${h.stamp ? ` ${h.kind} ${String(h.stamp).slice(0, 12)}` : ''}`);
}
const commits = [...seen.values()].filter((h) => h.kind === 'commit' && h.stamp).map((h) => h.stamp);
if (commits.length > 1) say(new Set(commits).size === 1, new Set(commits).size === 1 ? 'every reported commit is the same' : 'commits differ between origins (an earlier deploy is partial)');
if (!targets.length) console.log('note health not compared: add deploy-preflight.json with origins[].healthUrl and publicUrl');

console.log(failed ? `deploy-preflight: ${failed} check(s) failed` : 'deploy-preflight: green');
process.exit(failed ? 1 : 0);
