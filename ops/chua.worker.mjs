// chua: the temple at tuvi.terranimus.com/chua — static page + live rooms.
// Routes (Worker routes: tuvi.terranimus.com/chua and /chua/*):
//   GET  /chua, /chua/, /chua/room/<n>      the page (index.html from the static assets)
//   GET  /chua/ws?room=<n>                  WebSocket into room n (one Durable Object per room: autoscale, unlimited rooms)
//   GET  /chua/api/rooms                    the rooms that exist: [{room, people, seats, bots}]
//   GET  /chua/api/next?from=<n>            the lowest-numbered room after n with a free seat (a new one when all are full)
// A room is a hall of SEATS cushions. Chat and presence go only to the people in the same room, through the room's
// Durable Object. WebRTC signalling shares the same socket: {t:'rtc', to, data} is relayed to one peer of that room.
// Room 1 has bots that give up their seats to people; later rooms are people only.

// The page's URL word follows the language: /chua (vi), /temple (en), /tera (ja), /sawon (ko), /simiao (zh), /mandir (hi), /khram (ru).
export const SLUGS = ['chua', 'temple', 'tera', 'sawon', 'simiao', 'mandir', 'khram']
import { LIMITS, MAX_SOCKETS_PER_IP } from './limits.mjs'

export const SEATS = 12             // cushions in the hall (the wide hall has 12; the portrait painting has 18 and the page uses its own count)
export const MAX_PEOPLE = 50        // when the cushions are taken the rest of the room stands, up to this many (the owner, 3 Nov 2026: 50 a room)
export const BOTS = 8           // room 1 only; never more than SEATS - 4, so people always find a seat
const CHAT_MAX = 140
const CHAT_GAP_MS = 1200
const NAME_MAX = 20
const SKINS = new Set(['man', 'woman', 'granny', 'nun', 'monk', 'child'])
const SECURITY = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
}
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })
const roomNo = (v) => { const n = Number.parseInt(v, 10); return Number.isInteger(n) && n >= 1 && n <= 99999 ? n : null }
const cleanName = (s) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, NAME_MAX)
const cleanText = (s) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX)

function withHeaders(res, env, base) {
  let body = res
  if ((res.headers.get('Content-Type') || '').includes('text/html')) {
    // relative URLs in the page (assets/, room.js) must resolve under /<word>/ even at /<word>/room/<n>
    body = new HTMLRewriter().on('head', { element(e) { e.prepend(`<base href="${base}/">`, { html: true }) } }).transform(res)
  }
  const out = new Response(body.body, res)
  for (const [k, v] of Object.entries(SECURITY)) out.headers.set(k, v)
  if ((out.headers.get('Content-Type') || '').includes('javascript')) out.headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
  if ((out.headers.get('Content-Type') || '').includes('text/html')) {
    out.headers.set('Content-Security-Policy', env.CSP)
    out.headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
  }
  return out
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.hostname !== env.PUBLIC_HOST) return new Response('Not found', { status: 404 })
    const seg = url.pathname.split('/')[1]
    if (!SLUGS.includes(seg)) return new Response('Not found', { status: 404 })
    const BASE = `/${seg}`
    if (url.pathname === BASE) return Response.redirect(`https://${env.PUBLIC_HOST}${BASE}/${url.search}`, 301)
    const path = url.pathname.slice(BASE.length) // "/", "/room/7", "/ws", "/api/rooms"

    if (path === '/ws') {
      const n = roomNo(url.searchParams.get('room'))
      if (!n) return new Response('bad room', { status: 400 })
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 })
      const origin = request.headers.get('Origin')
      if (origin && origin !== `https://${env.PUBLIC_HOST}`) return new Response('forbidden', { status: 403 })
      const fwd = new Request(`https://room/ws?room=${n}`, request)
      fwd.headers.set('x-client-ip', request.headers.get('CF-Connecting-IP') || '')
      return env.ROOM.get(env.ROOM.idFromName(`room-${n}`)).fetch(fwd)
    }
    if (path === '/api/rooms' || path === '/api/next' || path === '/api/leaderboard') {
      if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 })
      return env.DIRECTORY.get(env.DIRECTORY.idFromName('directory')).fetch(new Request(`https://dir${path}${url.search}`))
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
    // the page: the static files, and index.html for any /room/<n>
    const assetPath = path.startsWith('/room/') ? '/' : path
    const res = await env.ASSETS.fetch(new Request(new URL(assetPath, url.origin), request))
    return withHeaders(res, env, BASE)
  },
}

// One room. Uses the WebSocket Hibernation API, so an idle room costs nothing and a busy one is one object.
export class Room {
  constructor(state, env) {
    this.state = state
    this.env = env
    this.lastChat = new Map()
    this.buckets = new Map() // `${id}:act|chat` -> { tokens, at }
    this._no = 0
    state.blockConcurrencyWhile(async () => { this._no = (await state.storage.get('no')) || 0 })
  }

  get no() {
    return this._no
  }

  people() {
    const out = []
    for (const ws of this.state.getWebSockets()) {
      const a = ws.deserializeAttachment()
      if (a?.joined) out.push(a)
    }
    return out
  }

  // Bots keep the first hall alive: they fill seats beyond the people, never taking one a person needs.
  botIds(humans) {
    if (this.no !== 1) return []
    return Array.from({ length: Math.max(0, Math.min(BOTS, SEATS - humans - 4)) }, (_, i) => i)
  }

  // what a person offers counts toward today's board (the Directory keeps it); only an offering the room accepted is counted
  score(name, coins) {
    try { this.env.DIRECTORY.get(this.env.DIRECTORY.idFromName('directory')).fetch(new Request('https://dir/score', { method: 'POST', body: JSON.stringify({ name, c: coins }) })).catch(() => {}) } catch {}
  }

  freeSeat(humans) {
    const taken = new Set(humans.map((p) => p.seat))
    for (let s = 0; s < MAX_PEOPLE; s++) if (!taken.has(s)) return s
    return -1
  }

  async fetch(request) {
    const n = roomNo(new URL(request.url).searchParams.get('room'))
    if (n && n !== this._no) { this._no = n; await this.state.storage.put('no', n) }
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    this.state.acceptWebSocket(server)
    const ip = request.headers.get('x-client-ip') || ''
    const ipHash = ip ? [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('chua|' + ip)))].slice(0, 6).map((b) => b.toString(16).padStart(2, '0')).join('') : ''
    const same = this.state.getWebSockets().filter((w) => ipHash && w.deserializeAttachment()?.ip === ipHash).length
    if (same >= MAX_SOCKETS_PER_IP) { server.close(1008, 'too many connections from this address'); return new Response(null, { status: 101, webSocket: client }) }
    server.serializeAttachment({ joined: false, id: crypto.randomUUID().slice(0, 8), ip: ipHash })
    return new Response(null, { status: 101, webSocket: client })
  }

  // A token bucket per person and kind: perMin tokens a minute, at most burst at once. Answers 0 when allowed, else the wait in ms.
  take(id, kind, perMin, burst) {
    const now = Date.now()
    const k = `${id}:${kind}`
    const b = this.buckets.get(k) || { tokens: burst, at: now }
    b.tokens = Math.min(burst, b.tokens + ((now - b.at) / 60000) * perMin)
    b.at = now
    if (b.tokens >= 1) { b.tokens -= 1; this.buckets.set(k, b); return 0 }
    this.buckets.set(k, b)
    return Math.ceil(((1 - b.tokens) / perMin) * 60000)
  }

  broadcast(msg, except) {
    const s = JSON.stringify(msg)
    for (const ws of this.state.getWebSockets()) {
      const a = ws.deserializeAttachment()
      if (a?.joined && a.id !== except) {
        try { ws.send(s) } catch {}
      }
    }
  }

  async report(leavingId) {
    const humans = this.people().filter((p) => p.id !== leavingId).length
    const body = JSON.stringify({ room: this.no, people: humans, bots: this.botIds(humans).length })
    try { await this.env.DIRECTORY.get(this.env.DIRECTORY.idFromName('directory')).fetch(new Request('https://dir/report', { method: 'POST', body })) } catch {}
  }

  async webSocketMessage(ws, raw) {
    let m
    try { m = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)) } catch { return }
    const a = ws.deserializeAttachment() || {}
    if (m.t === 'join' && !a.joined) {
      const humans = this.people()
      const seat = this.freeSeat(humans)
      if (seat < 0) { ws.send(JSON.stringify({ t: 'full', room: this.no })); return }
      const me = { joined: true, id: a.id, name: cleanName(m.name) || 'Guest', skin: SKINS.has(m.skin) ? m.skin : 'man', seat, ip: a.ip || '' }
      ws.serializeAttachment(me)
      const hs = this.people()
      ws.send(JSON.stringify({ t: 'welcome', room: this.no, you: me.id, seats: SEATS, max: MAX_PEOPLE, people: hs.map(({ id, name, skin, seat }) => ({ id, name, skin, seat })), bots: this.botIds(hs.length) }))
      this.broadcast({ t: 'joined', p: { id: me.id, name: me.name, skin: me.skin, seat: me.seat }, bots: this.botIds(hs.length) }, me.id)
      await this.report()
      return
    }
    if (!a.joined) return
    if (m.t === 'chat') {
      const text = cleanText(m.text)
      const now = Date.now()
      if (!text || now - (this.lastChat.get(a.id) || 0) < CHAT_GAP_MS) return
      const lim = LIMITS
      const wait = this.take(a.id, 'chat', lim.chatPerMin, Math.max(3, Math.floor(lim.chatPerMin / 4)))
      if (wait) { ws.send(JSON.stringify({ t: 'slow', what: 'chat', retryMs: wait })); return }
      this.lastChat.set(a.id, now)
      this.broadcast({ t: 'chat', id: a.id, name: a.name, text })
    } else if (m.t === 'act') {
      if (['petal', 'incense', 'lotus', 'bell'].includes(m.kind)) {
        const lim = LIMITS
        const wait = this.take(a.id, 'act', lim.actsPerMin, lim.burst)
        if (wait) { ws.send(JSON.stringify({ t: 'slow', what: 'act', retryMs: wait })); return }
        this.broadcast({ t: 'act', id: a.id, kind: m.kind })
        this.score(a.name, { petal: 1, incense: 5, lotus: 20, bell: 99 }[m.kind] || 1)
      }
    } else if (m.t === 'move') {
      // walk to another cushion or standing place; the place must be free, and moves are limited like everything else
      const s = Number.isInteger(m.seat) ? m.seat : -1
      if (s < 0 || s >= MAX_PEOPLE || s === a.seat || this.people().some((p) => p.seat === s)) return
      if (this.take(a.id, 'move', 30, 6)) return
      ws.serializeAttachment({ ...a, seat: s })
      this.broadcast({ t: 'moved', id: a.id, seat: s }, a.id)
    } else if (m.t === 'pose') {
      if (this.take(a.id, 'pose', 30, 6)) return
      this.broadcast({ t: 'pose', id: a.id, up: !!m.up }, a.id)
    } else if (m.t === 'rtc' && typeof m.to === 'string') {
      for (const peer of this.state.getWebSockets()) {
        const b = peer.deserializeAttachment()
        if (b?.joined && b.id === m.to) { try { peer.send(JSON.stringify({ t: 'rtc', from: a.id, data: m.data })) } catch {} }
      }
    } else if (m.t === 'ping') ws.send('{"t":"pong"}')
  }

  async webSocketClose(ws) { await this.left(ws) }
  async webSocketError(ws) { await this.left(ws) }

  async left(ws) {
    const a = ws.deserializeAttachment()
    try { ws.close() } catch {}
    if (a?.joined) {
      this.lastChat.delete(a.id)
      for (const k of ['act', 'chat', 'move', 'pose']) this.buckets.delete(`${a.id}:${k}`)
      this.broadcast({ t: 'left', id: a.id, bots: this.botIds(this.people().filter((p) => p.id !== a.id).length) }, a.id)
      await this.report(a.id)
    }
  }
}

// The directory: which rooms exist and how full they are. A room reports on every join and leave.
export class Directory {
  constructor(state) { this.state = state }

  async fetch(request) {
    const url = new URL(request.url)
    const rooms = (await this.state.storage.get('rooms')) || { 1: { room: 1, people: 0, seats: SEATS, bots: BOTS } }
    if (url.pathname === '/report') {
      const r = await request.json()
      if (roomNo(r.room)) rooms[r.room] = { room: r.room, people: r.people | 0, seats: SEATS, bots: r.bots | 0 }
      await this.state.storage.put('rooms', rooms)
      return new Response('ok')
    }
    // today's board (UTC day): name -> merit offered today in any hall; the top 20 are served
    const day = new Date().toISOString().slice(0, 10)
    let lb = (await this.state.storage.get('lb')) || { day, m: {} }
    if (lb.day !== day) lb = { day, m: {} }
    if (url.pathname === '/score') {
      const r = await request.json()
      const name = cleanName(r.name)
      const c = Math.max(0, Math.min(99, Number(r.c) | 0))
      if (name && c) {
        lb.m[name] = (lb.m[name] || 0) + c
        const keys = Object.keys(lb.m)
        if (keys.length > 300) for (const k of keys.sort((x, y) => lb.m[x] - lb.m[y]).slice(0, keys.length - 300)) delete lb.m[k]
        await this.state.storage.put('lb', lb)
      }
      return new Response('ok')
    }
    if (url.pathname === '/api/leaderboard') return json({ day, top: Object.entries(lb.m).sort((x, y) => y[1] - x[1]).slice(0, 20).map(([name, merit]) => ({ name, merit })) })
    const list = Object.values(rooms).sort((a, b) => a.room - b.room)
    if (url.pathname === '/api/rooms') return json(list.filter((r) => r.room === 1 || r.people > 0))
    const from = roomNo(url.searchParams.get('from')) || 0
    // the next hall after `from` that has a free seat; a hall nobody has opened yet counts as free
    let next = from + 1
    while (rooms[next] && rooms[next].people >= MAX_PEOPLE) next++
    return json({ room: next })
  }
}
