/**
 * Cloudflare Workers environment bindings for GitSnip.
 * Extend this interface as new bindings are added in wrangler.toml.
 */
export interface Env {
  /** KV namespace for caching GitHub tree responses */
  GITSNIP_CACHE: KVNamespace

  /** KV namespace for subscription state (Phase 1) */
  GITSNIP_SUBS: KVNamespace

  /** Optional server-side GitHub PAT (set via `wrangler secret put GITHUB_TOKEN`) */
  GITHUB_TOKEN?: string

  /** Environment name, set in wrangler.toml [vars] */
  ENVIRONMENT?: string

  /** Rate limiter binding */
  RATE_LIMITER?: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>
  }

  // ─── Tier file limits (Phase 1) ──────────────────────────────────────────
  FREE_FILE_LIMIT?: string
  TOKEN_FILE_LIMIT?: string
  PRO_FILE_LIMIT?: string

  // ─── Stripe secrets (Phase 1, set via `wrangler secret put`) ─────────────
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  STRIPE_PRO_PRICE_ID?: string
  STRIPE_POWER_PRICE_ID?: string
}

/** Subscription tier */
export type Tier = 'free' | 'pro' | 'power'

/** Stored subscription record in KV */
export interface SubRecord {
  tier: Tier
  stripeCustomerId?: string
  stripeSubId?: string
  email: string
  expiresAt?: number
}

/** Re-export shared types for convenience */
export type { RepoInfo, TreeEntry, SnipInfo, GitSnipError } from '../../shared/types.js'
