// The temple as a tab of Tử Vi: tuvi.terranimus.com/chua/ (Worker routes tuvi.terranimus.com/chua and /chua/*; every
// other TuVi path never reaches this Worker). Serves index.html + assets/ from the Worker's static assets and adds the
// security and cache headers. Only GET and HEAD. live/ (the TikTok LIVE kit) is never uploaded, so /chua/live/*
// answers 404 like any unknown path. chua.terranimus.com (the first address, 2 Nov 2026) only redirects here.
//
// Bindings (set by scripts/chua-deploy.mjs): ASSETS (static assets), CSP (the policy with the hashes of the page's
// inline script and styles, computed at deploy), COMMIT, PUBLIC_HOST, BASE ("/chua").

const SECURITY = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
}

function withHeaders(res, env, path) {
  const out = new Response(res.body, res)
  for (const [k, v] of Object.entries(SECURITY)) out.headers.set(k, v)
  const type = out.headers.get('Content-Type') || ''
  if (type.includes('text/html')) {
    out.headers.set('Content-Security-Policy', env.CSP)
    out.headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
  } else if (res.status === 200 && path.startsWith('/assets/')) {
    // File names are not content-hashed: a day fresh, then revalidated in the background for a week.
    out.headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  }
  return out
}

const plain = (status, text, extra = {}) => new Response(text, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...extra } })

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const BASE = env.BASE
    // The old address: send everything to the tab, keeping the path.
    if (url.hostname !== env.PUBLIC_HOST) {
      return Response.redirect(`https://${env.PUBLIC_HOST}${BASE}${url.pathname}${url.search}`, 301)
    }
    if (url.pathname === BASE) return Response.redirect(`https://${env.PUBLIC_HOST}${BASE}/${url.search}`, 301)
    if (!url.pathname.startsWith(`${BASE}/`)) return withHeaders(plain(404, 'Không tìm thấy trang · Not found'), env, url.pathname)
    const path = url.pathname.slice(BASE.length) // "/", "/assets/hall.jpg", ...

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return withHeaders(plain(405, 'Method Not Allowed', { Allow: 'GET, HEAD' }), env, path)
    }
    if (path === '/health/ready') {
      return withHeaders(Response.json({ service: 'terranimus-chua', commit: env.COMMIT }, { headers: { 'Cache-Control': 'no-store' } }), env, path)
    }
    const inner = new URL(path + url.search, url.origin)
    const res = await env.ASSETS.fetch(new Request(inner, request))
    if (res.status === 404) return withHeaders(plain(404, 'Không tìm thấy trang · Not found'), env, path)
    if (res.status >= 300 && res.status < 400) {
      // The assets layer redirects /index.html to "/": put the tab's prefix back on.
      const loc = res.headers.get('Location') || '/'
      const to = new URL(loc, inner)
      return withHeaders(new Response(null, { status: res.status, headers: { Location: `${BASE}${to.pathname}${to.search}` } }), env, path)
    }
    return withHeaders(res, env, path)
  },
}
