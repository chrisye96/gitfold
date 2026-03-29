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
import type { Env } from '../types.js'
import { fetchTree, fetchAllFiles, buildInfo } from '../services/github.js'
import { createZip, zipResponse, zipFilename } from '../services/zip.js'
import { tarGzResponse } from '../services/tar.js'
import { corsHeaders } from '../middleware/security.js'

const api = new Hono<{ Bindings: Env; Variables: { repoInfo: import('../types.js').RepoInfo } }>()

// ─── GET /v1/download ─────────────────────────────────────────────────────────

api.get('/download', async (c) => {
  const info  = c.get('repoInfo')
  const token = c.req.header('X-GitHub-Token') ?? c.env.GITHUB_TOKEN
  const fmt   = c.req.query('format')
  const useTarGz = fmt === 'tar.gz' || fmt === 'tgz'

  // Full-repo download: redirect to GitHub archive (zero-cost, no bandwidth)
  if (info.type === 'repo') {
    const ext = useTarGz ? 'tar.gz' : 'zip'
    const archiveUrl =
      `https://github.com/${info.owner}/${info.repo}/archive/refs/heads/${info.branch}.${ext}`
    return c.redirect(archiveUrl, 302)
  }

  try {
    // 1. Fetch file tree (KV-cached)
    const tree = await fetchTree(info, token, c.env.GITSNIP_CACHE)

    // 2. Fetch all file contents from raw.githubusercontent.com
    const files = await fetchAllFiles(tree, info)

    // 3. Build and return archive with CORS headers
    const name = zipFilename(info.path, info.repo)
    if (useTarGz) {
      return tarGzResponse(files, info.path, name, corsHeaders())
    }
    return zipResponse(createZip(files, info.path), name, corsHeaders())

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
  const token = c.req.header('X-GitHub-Token') ?? c.env.GITHUB_TOKEN

  try {
    const tree   = await fetchTree(info, token, c.env.GITSNIP_CACHE)
    const result = buildInfo(tree, info)
    return Response.json(result, { headers: corsHeaders() })

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
