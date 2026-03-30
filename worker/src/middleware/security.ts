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
import type { Env, RepoInfo, Tier, SessionUser } from '../types.js'
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
 * Middleware: resolve the user's tier and file limit.
 *
 * Priority:
 *   1. Session JWT (D1 user — Phase 2)
 *   2. X-Sub-Token header (KV subscription — Phase 1 backward compat)
 *   3. X-GitHub-Token (free user with PAT)
 *   4. Anonymous free user
 */
export async function resolveTier(
  c: Context<{ Bindings: Env; Variables: { tier: Tier; fileLimit: number; sessionUser?: SessionUser } }>,
  next: Next,
) {
  // Check session user first (set by session middleware)
  const sessionUser = c.get('sessionUser')
  if (sessionUser && sessionUser.tier !== 'free') {
    const limit = tierToLimit(sessionUser.tier, c.env)
    c.set('tier', sessionUser.tier)
    c.set('fileLimit', limit)
    return next()
  }

  // Fall back to KV-based subscription lookup (Phase 1 path)
  const { tier, limit } = await getFileLimit(c.req.raw, c.env)

  // Session user with GitHub OAuth counts as having a token
  if (tier === 'free' && sessionUser) {
    c.set('tier', 'free')
    c.set('fileLimit', parseInt(c.env.TOKEN_FILE_LIMIT ?? '200', 10))
    return next()
  }

  c.set('tier', tier)
  c.set('fileLimit', limit)
  return next()
}

/** Convert a tier to its file limit using env vars. */
function tierToLimit(tier: Tier, env: Env): number {
  switch (tier) {
    case 'power': return parseInt(env.POWER_FILE_LIMIT ?? '5000', 10)
    case 'pro':   return parseInt(env.PRO_FILE_LIMIT ?? '1000', 10)
    default:      return parseInt(env.FREE_FILE_LIMIT ?? '50', 10)
  }
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

// ─── Allowed origins for credential-based CORS ─────────────────────────────

const ALLOWED_ORIGINS = [
  'https://gitsnip.cc',
  'https://www.gitsnip.cc',
]

/** Check if an origin should receive credential-aware CORS headers. */
function isAllowedOrigin(origin: string | null | undefined): string | null {
  if (!origin) return null
  if (ALLOWED_ORIGINS.includes(origin)) return origin
  // Allow localhost for development
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return origin
  return null
}

/**
 * CORS headers.
 *
 * When `requestOrigin` is provided and matches an allowed origin,
 * returns credential-aware headers (specific origin + Allow-Credentials).
 * Otherwise falls back to wildcard `*` (no credentials).
 */
export function corsHeaders(requestOrigin?: string | null): HeadersInit {
  const allowed = isAllowedOrigin(requestOrigin)

  if (allowed) {
    return {
      'Access-Control-Allow-Origin': allowed,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-GitHub-Token, X-Sub-Token',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    }
  }

  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-GitHub-Token, X-Sub-Token',
    'Access-Control-Max-Age': '86400',
  }
}
