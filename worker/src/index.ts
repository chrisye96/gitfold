/**
 * GitFold Worker — Entry Point
 *
 * Mounts:
 *   /api/v1/*   REST API (download, info)
 *   /v1/*       Short alias (same as /api/v1/*)
 *   /health     Health check
 *   /docs       API documentation redirect
 *   OPTIONS *   CORS preflight
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import type { Env, Tier, SessionUser } from './types.js'
import { validateUrl, resolveTier, corsHeaders } from './middleware/security.js'
import { sessionMiddleware } from './middleware/session.js'
import apiRoutes from './routes/api.js'
import billingRoutes from './routes/billing.js'
import authRoutes from './routes/auth.js'
import teamRoutes from './routes/team.js'

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
    service: 'gitfold-worker',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  }),
)

// ─── API docs redirect ────────────────────────────────────────────────────────

app.get('/docs', (c) =>
  c.redirect('https://gitfold.cc/docs', 302),
)

// ─── Auth routes (Phase 2 — OAuth, session) ─────────────────────────────────

app.route('/api/v1', authRoutes)
app.route('/v1', authRoutes)

// ─── Billing routes (no URL validation needed) ───────────────────────────────

app.route('/api/v1', billingRoutes)
app.route('/v1', billingRoutes)

// ─── Team routes (Phase 3 — Power tier) ─────────────────────────────────────

app.route('/api/v1', teamRoutes)
app.route('/v1', teamRoutes)

// ─── GET /v1/download/result — retrieve SSE job zip (no URL validation needed) ─

async function downloadResultHandler(c: Context<{ Bindings: Env; Variables: { repoInfo: import('./types.js').RepoInfo; tier: Tier; fileLimit: number; sessionUser?: SessionUser } }>) {
  const jobId = c.req.query('jobId')
  if (!jobId) {
    return Response.json(
      { code: 'MISSING_PARAM', message: 'Missing jobId query parameter.' },
      { status: 400, headers: corsHeaders(c.req.header('Origin')) },
    )
  }

  const [zipData, filename] = await Promise.all([
    c.env.GITFOLD_CACHE.get(`job:${jobId}`, 'arrayBuffer'),
    c.env.GITFOLD_CACHE.get(`job:${jobId}:name`, 'text'),
  ])

  if (!zipData) {
    return Response.json(
      { code: 'JOB_EXPIRED', message: 'Job not found or expired (5-minute window).' },
      { status: 404, headers: corsHeaders(c.req.header('Origin')) },
    )
  }

  c.executionCtx.waitUntil(Promise.all([
    c.env.GITFOLD_CACHE.delete(`job:${jobId}`),
    c.env.GITFOLD_CACHE.delete(`job:${jobId}:name`),
  ]))

  const safeName = filename
    ? (filename.endsWith('.zip') ? filename : filename + '.zip')
    : 'download.zip'

  return new Response(zipData, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Content-Length': String(zipData.byteLength),
      'Cache-Control': 'no-store',
      ...corsHeaders(c.req.header('Origin')),
    },
  })
}

app.get('/v1/download/result', downloadResultHandler)
app.get('/api/v1/download/result', downloadResultHandler)

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
      hint: 'See https://gitfold.cc/docs for available endpoints.',
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
