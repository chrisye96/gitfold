/**
 * Cloudflare Workers environment bindings for GitSnip.
 * Extend this interface as new bindings are added in wrangler.toml.
 */
export interface Env {
  /** KV namespace for caching GitHub tree responses */
  GITSNIP_CACHE: KVNamespace

  /** Optional server-side GitHub PAT (set via `wrangler secret put GITHUB_TOKEN`) */
  GITHUB_TOKEN?: string

  /** Environment name, set in wrangler.toml [vars] */
  ENVIRONMENT?: string

  /** Rate limiter binding */
  RATE_LIMITER?: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>
  }
}

/** Re-export shared types for convenience */
export type { RepoInfo, TreeEntry, SnipInfo, GitSnipError } from '../../shared/types.js'
