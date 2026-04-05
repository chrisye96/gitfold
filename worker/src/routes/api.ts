/**
 * GitFold Worker — API Routes
 *
 * GET /v1/download?url={encodedGithubUrl}
 *   Returns: application/zip file stream
 *   Headers: X-GitHub-Token (optional)
 *
 * GET /v1/info?url={encodedGithubUrl}
 *   Returns: JSON with file list and metadata
 *
 * All routes require URL validation middleware (validateUrl) to run first.
 */

import { Hono } from 'hono'
import type { Env, Tier, SessionUser } from '../types.js'
import { fetchTree, fetchAllFiles, buildInfo } from '../services/github.js'
import { createZip, zipResponse, zipFilename } from '../services/zip.js'
import { tarGzResponse } from '../services/tar.js'
import { corsHeaders, checkLimits } from '../middleware/security.js'
import { zipCacheKey, getZipFromR2, saveZipToR2, fetchCommitSha } from '../services/cache.js'
import { trackDownload } from '../services/analytics.js'
import { getUserOAuthToken } from '../services/auth.js'

const api = new Hono<{
  Bindings: Env
  Variables: {
    repoInfo: import('../types.js').RepoInfo
    tier: Tier
    fileLimit: number
    sessionUser?: SessionUser
  }
}>()

// ─── GET /v1/download ─────────────────────────────────────────────────────────

api.get('/download', async (c) => {
  const info  = c.get('repoInfo')
  const sessionUser = c.get('sessionUser')
  let token = c.req.header('X-GitHub-Token')
  // If no explicit token header, try the session user's stored OAuth token
  if (!token && sessionUser && c.env.TOKEN_ENCRYPTION_KEY) {
    token = await getUserOAuthToken(c.env.DB, sessionUser.userId, c.env.TOKEN_ENCRYPTION_KEY) ?? undefined
  }
  token = token ?? c.env.GITHUB_TOKEN
  const fmt   = c.req.query('format')
  const useTarGz = fmt === 'tar.gz' || fmt === 'tgz'

  // Full-repo download: redirect to GitHub archive (zero-cost, no bandwidth)
  if (info.type === 'repo') {
    const ext = useTarGz ? 'tar.gz' : 'zip'
    const archiveUrl =
      `https://github.com/${info.owner}/${info.repo}/archive/refs/heads/${info.branch}.${ext}`
    return c.redirect(archiveUrl, 302)
  }

  const startTime = Date.now()
  const userId = sessionUser?.userId ?? 'anon'
  const rawClient = c.req.header('X-Client') ?? 'web'
  const source: 'web' | 'extension' | 'cli' =
    rawClient === 'extension' || rawClient === 'cli' ? rawClient : 'web'

  try {
    // 0. Resolve commit SHA once (reused for cache check + cache save)
    let commitSha: string | null = null
    if (!useTarGz) {
      commitSha = await fetchCommitSha(info, token)
    }

    // 1. Try R2 ZIP cache (only for zip format, and only if commit SHA was resolved)
    //    Note: we still need to check file limits, so fetch tree first for limit check
    //    R2 cache is only used when the user's tier allows the full directory.

    // 2. Fetch file tree (KV-cached)
    const tree = await fetchTree(info, token, c.env.GITFOLD_CACHE)

    // 3. Check tier-based limits
    const totalSize = tree.reduce((s, e) => s + (e.size ?? 0), 0)
    const limitCheck = checkLimits(tree.length, totalSize, c.get('fileLimit'))
    if (!limitCheck.ok) return limitCheck.response

    // 4. Try R2 cache (only after limit check passes)
    if (commitSha) {
      const cacheKey = zipCacheKey(info, commitSha)
      const cached = await getZipFromR2(c.env, cacheKey)
      if (cached) {
        const name = zipFilename(info.path, info.repo)
        const safeName = name.endsWith('.zip') ? name : name + '.zip'

        trackDownload(c.env, {
          userId,
          tier: c.get('tier') ?? 'free',
          source,
          owner: info.owner,
          repo: info.repo,
          path: info.path,
          fileCount: tree.length,
          totalBytes: cached.size,
          durationMs: Date.now() - startTime,
          cacheHit: true,
        })

        return new Response(cached.body, {
          status: 200,
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${safeName}"`,
            'Content-Length': String(cached.size),
            'Cache-Control': 'no-store',
            'X-Cache': 'HIT',
            ...corsHeaders(),
          },
        })
      }
    }

    // 5. Fetch all file contents from raw.githubusercontent.com
    const files = await fetchAllFiles(tree, info)

    // 6. Build archive
    const name = zipFilename(info.path, info.repo)
    if (useTarGz) {
      return tarGzResponse(files, info.path, name, corsHeaders())
    }

    const zipData = createZip(files, info.path)

    // 7. Save ZIP to R2 cache (async, don't block response)
    if (commitSha) {
      const cacheKey = zipCacheKey(info, commitSha)
      c.executionCtx.waitUntil(saveZipToR2(c.env, cacheKey, zipData))
    }

    // 8. Track download
    trackDownload(c.env, {
      userId,
      tier: c.get('tier') ?? 'free',
      source,
      owner: info.owner,
      repo: info.repo,
      path: info.path,
      fileCount: tree.length,
      totalBytes: zipData.byteLength,
      durationMs: Date.now() - startTime,
      cacheHit: false,
    })

    return zipResponse(zipData, name, corsHeaders())

  } catch (err) {
    if (err instanceof Response) return err
    console.error('[gitfold] Unexpected error in /download:', err)
    return Response.json(
      { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      { status: 500, headers: corsHeaders() },
    )
  }
})

// ─── GET /v1/info ─────────────────────────────────────────────────────────────

api.get('/info', async (c) => {
  const info  = c.get('repoInfo')
  const sessionUser = c.get('sessionUser')
  let token = c.req.header('X-GitHub-Token')
  if (!token && sessionUser && c.env.TOKEN_ENCRYPTION_KEY) {
    token = await getUserOAuthToken(c.env.DB, sessionUser.userId, c.env.TOKEN_ENCRYPTION_KEY) ?? undefined
  }
  token = token ?? c.env.GITHUB_TOKEN

  try {
    const tree   = await fetchTree(info, token, c.env.GITFOLD_CACHE)
    const result = buildInfo(tree, info)
    // Include tier info in response so frontend knows the user's limit
    return Response.json(
      { ...result, tier: c.get('tier') ?? 'free', fileLimit: c.get('fileLimit') ?? 50 },
      { headers: corsHeaders() },
    )

  } catch (err) {
    if (err instanceof Response) {
      // Re-attach CORS headers to error responses
      const body    = await err.json()
      return Response.json(body, { status: err.status, headers: corsHeaders() })
    }
    console.error('[gitfold] Unexpected error in /info:', err)
    return Response.json(
      { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      { status: 500, headers: corsHeaders() },
    )
  }
})

// ─── GET /v1/download/progress (SSE) ─────────────────────────────────────────
//
// Streams Server-Sent Events while fetching files + building the zip.
// Stores the finished zip in KV (key: job:{uuid}, TTL: 300s).
// Final event: { type: "done", jobId, filename }
// Clients then retrieve the zip via GET /v1/download/result?jobId=...

api.get('/download/progress', async (c) => {
  const info       = c.get('repoInfo')
  const sessionUser = c.get('sessionUser')
  let token = c.req.header('X-GitHub-Token')
  if (!token && sessionUser && c.env.TOKEN_ENCRYPTION_KEY) {
    token = await getUserOAuthToken(c.env.DB, sessionUser.userId, c.env.TOKEN_ENCRYPTION_KEY) ?? undefined
  }
  token = token ?? c.env.GITHUB_TOKEN

  if (info.type === 'repo') {
    return Response.json(
      { code: 'UNSUPPORTED', message: 'SSE progress is only available for subdirectory downloads.' },
      { status: 400, headers: corsHeaders(c.req.header('Origin')) },
    )
  }

  const encoder = new TextEncoder()
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()

  function send(data: object) {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  c.executionCtx.waitUntil((async () => {
    try {
      // 1. Fetch file tree
      const tree = await fetchTree(info, token, c.env.GITFOLD_CACHE)
      const totalSize = tree.reduce((s, e) => s + (e.size ?? 0), 0)
      send({ type: 'tree', count: tree.length, size: totalSize, limit: c.get('fileLimit') ?? 50 })

      // 2. Check tier limits
      const limitCheck = checkLimits(tree.length, totalSize, c.get('fileLimit'))
      if (!limitCheck.ok) {
        const body = await limitCheck.response.clone().json() as { code: string; message: string }
        send({ type: 'error', code: body.code, message: body.message })
        writer.close()
        return
      }

      // 3. Fetch files with per-file progress events
      const total = tree.length
      let done = 0
      const files: Array<{ path: string; data: Uint8Array }> = new Array(total)
      const BATCH = 8

      for (let i = 0; i < total; i += BATCH) {
        const batch = tree.slice(i, i + BATCH)
        await Promise.all(batch.map(async (entry, j) => {
          const url = `https://raw.githubusercontent.com/${info.owner}/${info.repo}/${info.branch}/${entry.path}`
          const res = await fetch(url)
          if (!res.ok) throw new Error(`Failed to fetch ${entry.path}: HTTP ${res.status}`)
          const buf = await res.arrayBuffer()
          files[i + j] = { path: entry.path, data: new Uint8Array(buf) }
          done++
          send({ type: 'progress', done, total, path: entry.path })
        }))
      }

      // 4. Build zip
      send({ type: 'zipping' })
      const zipData = createZip(files, info.path)

      // 5. Store in KV (max 25 MB; skip if too large)
      const filename = zipFilename(info.path, info.repo)
      if (zipData.byteLength <= 24 * 1024 * 1024) {
        const jobId = crypto.randomUUID()
        await c.env.GITFOLD_CACHE.put(
          `job:${jobId}`,
          zipData,
          { expirationTtl: 300 },
        )
        // Store filename separately
        await c.env.GITFOLD_CACHE.put(
          `job:${jobId}:name`,
          filename,
          { expirationTtl: 300 },
        )
        send({ type: 'done', jobId, filename })
      } else {
        // Too large for KV — tell client to fall back to direct mode
        send({ type: 'too_large', message: 'Zip too large for streaming; use direct download.' })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      send({ type: 'error', code: 'INTERNAL_ERROR', message: msg })
    } finally {
      writer.close()
    }
  })())

  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      ...corsHeaders(c.req.header('Origin')),
    },
  })
})

export default api
