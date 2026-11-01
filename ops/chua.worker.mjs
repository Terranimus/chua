// chua.terranimus.com: serves the static temple (index.html + assets/) from the Worker's static assets and adds the
// security and cache headers. Only GET and HEAD. Nothing else exists here: live/ (the TikTok LIVE kit) is never
// uploaded, so /live/* answers 404 like any unknown path.
//
// Bindings (set by scripts/chua-deploy.mjs): ASSETS (static assets), CSP (the policy with the hashes of the page's
// inline script and styles, computed at deploy), COMMIT.

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return withHeaders(new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' } }), env, url.pathname)
    }
    if (url.pathname === '/health/ready') {
      return withHeaders(Response.json({ service: 'terranimus-chua', commit: env.COMMIT }, { headers: { 'Cache-Control': 'no-store' } }), env, url.pathname)
    }
    const res = await env.ASSETS.fetch(request)
    if (res.status === 404) {
      return withHeaders(new Response('Không tìm thấy trang · Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } }), env, url.pathname)
    }
    return withHeaders(res, env, url.pathname)
  },
}
