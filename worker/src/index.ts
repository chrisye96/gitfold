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
import type { Env } from './types.js'
import { validateUrl, corsHeaders } from './middleware/security.js'
import apiRoutes from './routes/api.js'

const app = new Hono<{
  Bindings: Env
  Variables: { repoInfo: import('./types.js').RepoInfo }
}>()

// ─── CORS preflight ───────────────────────────────────────────────────────────

app.options('*', (c) => {
  return new Response(null, { status: 204, headers: corsHeaders() })
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

// ─── v1 routes (with URL validation middleware) ───────────────────────────────

// Mount under /api/v1/ and /v1/ (short alias)
const v1 = new Hono<{
  Bindings: Env
  Variables: { repoInfo: import('./types.js').RepoInfo }
}>()

v1.use('*', validateUrl)
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

export default app
