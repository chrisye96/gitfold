/**
 * GitSnip Worker — Entry Point
 *
 * Mounts:
 *   /api/v1/*   REST API (download, info)
 *   /v1/*       Short alias (same as /api/v1/*)
 *   /health     Health check
 *   /docs       API documentation redirect
 *   OPTIONS *   CORS preflight
 */

import { Hono } from 'hono'
import type { Env, Tier, SessionUser } from './types.js'
import { validateUrl, resolveTier, corsHeaders } from './middleware/security.js'
import { sessionMiddleware } from './middleware/session.js'
import apiRoutes from './routes/api.js'
import billingRoutes from './routes/billing.js'
import authRoutes from './routes/auth.js'

const app = new Hono<{
  Bindings: Env
  Variables: {
    repoInfo: import('./types.js').RepoInfo
    tier: Tier
    fileLimit: number
    sessionUser?: SessionUser
  }
}>()

// ─── Global middleware ───────────────────────────────────────────────────────

// Session middleware: extract JWT from cookie (non-blocking)
app.use('*', sessionMiddleware)

// ─── CORS preflight ───────────────────────────────────────────────────────────

app.options('*', (c) => {
  return new Response(null, { status: 204, headers: corsHeaders(c.req.header('Origin')) })
})

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (c) =>
  Response.json({
    ok: true,
    service: 'gitsnip-worker',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  }),
)

// ─── API docs redirect ────────────────────────────────────────────────────────

app.get('/docs', (c) =>
  c.redirect('https://gitsnip.cc/docs', 302),
)

// ─── Auth routes (Phase 2 — OAuth, session) ─────────────────────────────────

app.route('/api/v1', authRoutes)
app.route('/v1', authRoutes)

// ─── Billing routes (no URL validation needed) ───────────────────────────────

app.route('/api/v1', billingRoutes)
app.route('/v1', billingRoutes)

// ─── v1 routes (with URL validation + tier resolution middleware) ─────────────

// Mount under /api/v1/ and /v1/ (short alias)
const v1 = new Hono<{
  Bindings: Env
  Variables: { repoInfo: import('./types.js').RepoInfo; tier: Tier; fileLimit: number }
}>()

v1.use('*', validateUrl)
v1.use('*', resolveTier)
v1.route('/', apiRoutes)

app.route('/api/v1', v1)
app.route('/v1', v1)   // short alias

// ─── 404 fallback ─────────────────────────────────────────────────────────────

app.notFound((c) =>
  Response.json(
    {
      code: 'NOT_FOUND',
      message: `Route not found: ${c.req.method} ${new URL(c.req.url).pathname}`,
      hint: 'See https://gitsnip.cc/docs for available endpoints.',
    },
    { status: 404, headers: corsHeaders() },
  ),
)

// ─── Scheduled handler (cron) — R2 ZIP cache cleanup ─────────────────────────

import { cleanupOldZips } from './services/cache.js'

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(cleanupOldZips(env, 30))
  },
}
