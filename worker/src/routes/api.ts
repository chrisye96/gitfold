/**
 * GitSnip Worker — API Routes
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
    const tree = await fetchTree(info, token, c.env.GITSNIP_CACHE)

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
    console.error('[gitsnip] Unexpected error in /download:', err)
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
    const tree   = await fetchTree(info, token, c.env.GITSNIP_CACHE)
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
    console.error('[gitsnip] Unexpected error in /info:', err)
    return Response.json(
      { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      { status: 500, headers: corsHeaders() },
    )
  }
})

export default api
