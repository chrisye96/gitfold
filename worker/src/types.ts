/**
 * Cloudflare Workers environment bindings for GitFold.
 * Extend this interface as new bindings are added in wrangler.toml.
 */
export interface Env {
  /** KV namespace for caching GitHub tree responses and SSE job zips */
  GITFOLD_CACHE: KVNamespace

  /** R2 bucket for ZIP file caching */
  R2_CACHE?: R2Bucket

  /** Optional server-side GitHub PAT (set via `wrangler secret put GITHUB_TOKEN`) */
  GITHUB_TOKEN?: string

  /** Environment name, set in wrangler.toml [vars] */
  ENVIRONMENT?: string

  /** Rate limiter binding */
  RATE_LIMITER?: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>
  }

  // ─── File limits (bring your own token raises the cap) ───────────────────
  FREE_FILE_LIMIT?: string
  TOKEN_FILE_LIMIT?: string
}

/** Tier reported by /v1/info. There are no paid tiers, so it is always 'free'. */
export type Tier = 'free'

/** Re-export shared types for convenience */
export type { RepoInfo, TreeEntry, SnipInfo, GitFoldError } from '../../shared/types.js'
