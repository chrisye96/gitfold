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
import { corsHeaders } from '../middleware/security.js'

const api = new Hono<{ Bindings: Env; Variables: { repoInfo: import('../types.js').RepoInfo } }>()

// ─── GET /v1/download ─────────────────────────────────────────────────────────

api.get('/download', async (c) => {
  const info  = c.get('repoInfo')
  const token = c.req.header('X-GitHub-Token') ?? c.env.GITHUB_TOKEN

  try {
    // 1. Fetch file tree (KV-cached)
    const tree = await fetchTree(info, token, c.env.GITSNIP_CACHE)

    // 2. Fetch all file contents from raw.githubusercontent.com
    const files = await fetchAllFiles(tree, info)

    // 3. Create zip (include .gitsnip attribution file)
    const name      = zipFilename(info.path, info.repo)
    const sourceUrl = `https://github.com/${info.owner}/${info.repo}/tree/${info.branch}/${info.path}`
    const zipData   = createZip(files, info.path, sourceUrl)

    // 4. Return zip response with CORS headers
    return zipResponse(zipData, name, corsHeaders())

  } catch (err) {
    // Services throw Response objects for known errors
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
