/**
 * GitSnip Worker — Security Middleware
 *
 * Validates incoming requests and enforces limits to prevent abuse:
 *   - URL validation (only valid GitHub tree URLs accepted)
 *   - File count / size limits (returns 413 if exceeded)
 *   - Rate limiting (via Cloudflare rate-limit binding)
 *   - Root directory guard (path must be non-empty)
 *
 * All error responses follow the unified GitSnipError format:
 *   { code, message, hint }
 */

import type { Context, Next } from 'hono'
import type { Env, RepoInfo, Tier } from '../types.js'
import { parseGithubUrl } from '@shared/parse-url.js'
import { getFileLimit } from '../services/subscription.js'

// ─── Limits ──────────────────────────────────────────────────────────────────

export const LIMITS = {
  /** Hard ceiling regardless of tier */
  maxFiles: 5000,
  /** Maximum total uncompressed size in bytes (100 MB) */
  maxBytes: 100 * 1024 * 1024,
  /** Maximum single file size in bytes (50 MB) */
  maxFileSizeBytes: 50 * 1024 * 1024,
} as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** JSON error response in GitSnipError format */
export function errorResponse(
  status: number,
  code: string,
  message: string,
  hint?: string,
): Response {
  return Response.json({ code, message, ...(hint ? { hint } : {}) }, { status })
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Validate the `url` query parameter:
 *   - Must be present
 *   - Must parse as a valid GitHub tree URL
 *   - Path must not be empty (root dir download is blocked)
 *
 * Attaches parsed info to `c.set('repoInfo', ...)` on success.
 */
export async function validateUrl(
  c: Context<{ Bindings: Env; Variables: { repoInfo: RepoInfo } }>,
  next: Next,
) {
  const rawUrl = c.req.query('url')

  if (!rawUrl) {
    return errorResponse(
      400,
      'INVALID_URL',
      'Missing required query parameter: url',
      'Provide a GitHub tree URL, e.g. ?url=https://github.com/owner/repo/tree/main/path',
    )
  }

  let decoded: string
  try {
    decoded = decodeURIComponent(rawUrl)
  } catch {
    return errorResponse(400, 'INVALID_URL', 'url parameter is not valid URI-encoded text')
  }

  const info = parseGithubUrl(decoded)
  if (!info) {
    return errorResponse(
      400,
      'INVALID_URL',
      'Not a valid GitHub directory URL.',
      'URL must be in format: https://github.com/owner/repo/tree/branch/path',
    )
  }

  // Store for downstream handlers (repo type handled in route via redirect)
  c.set('repoInfo', info)
  return next()
}

/**
 * Middleware: resolve the user's tier and file limit from subscription state.
 * Attaches tier + fileLimit to context for downstream handlers.
 */
export async function resolveTier(
  c: Context<{ Bindings: Env; Variables: { tier: Tier; fileLimit: number } }>,
  next: Next,
) {
  const { tier, limit } = await getFileLimit(c.req.raw, c.env)
  c.set('tier', tier)
  c.set('fileLimit', limit)
  return next()
}

/**
 * Enforce file count and size limits.
 * Call after the file tree has been fetched and stored in context.
 *
 * @param tierFileLimit - dynamic limit based on user's tier (pass from context)
 */
export function checkLimits(
  fileCount: number,
  totalBytes: number,
  tierFileLimit?: number,
): { ok: true } | { ok: false; response: Response } {
  const effectiveLimit = tierFileLimit ?? LIMITS.maxFiles

  if (fileCount > effectiveLimit) {
    return {
      ok: false,
      response: errorResponse(
        413,
        'TOO_MANY_FILES',
        `Directory contains ${fileCount} files (limit: ${effectiveLimit}).`,
        effectiveLimit < LIMITS.maxFiles
          ? 'Upgrade your plan for higher limits, or try a smaller subdirectory.'
          : 'Try a smaller subdirectory, or use git sparse-checkout for large repos.',
      ),
    }
  }

  if (totalBytes > LIMITS.maxBytes) {
    const mb = (totalBytes / 1024 / 1024).toFixed(0)
    return {
      ok: false,
      response: errorResponse(
        413,
        'TOO_LARGE',
        `Directory is ~${mb} MB (limit: 100 MB).`,
        'Try a smaller subdirectory, or use git sparse-checkout for large repos.',
      ),
    }
  }

  return { ok: true }
}

/**
 * CORS headers — allow all origins (public API).
 */
export function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-GitHub-Token, X-Sub-Token',
    'Access-Control-Max-Age': '86400',
  }
}
