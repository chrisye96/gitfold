/**
 * GitFold Worker — Auth Service (Phase 2)
 *
 * Handles GitHub OAuth flow:
 *   1. Generate authorize URL with CSRF state
 *   2. Exchange authorization code for access token
 *   3. Fetch GitHub user profile
 *   4. Create/update user in D1
 *   5. Encrypt and store OAuth token in D1
 */

import type { Env, Tier } from '../types.js'
import { encryptToken, decryptToken } from './crypto.js'

const GITHUB_AUTH = 'https://github.com/login/oauth'
const GITHUB_API = 'https://api.github.com'

// ─── GitHub OAuth Flow ──────────────────────────────────────────────────────

/**
 * Build the GitHub OAuth authorization URL.
 */
export function buildAuthUrl(env: Env, state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID!,
    redirect_uri: redirectUri,
    scope: 'repo,user:email',
    state,
  })
  return `${GITHUB_AUTH}/authorize?${params}`
}

/**
 * Exchange an authorization code for an access token.
 */
export async function exchangeCode(
  code: string,
  env: Env,
  redirectUri: string,
): Promise<string> {
  const res = await fetch(`${GITHUB_AUTH}/access_token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!res.ok) {
    throw new Error(`GitHub OAuth exchange failed: ${res.status}`)
  }

  const data = await res.json<{ access_token?: string; error?: string; error_description?: string }>()
  if (data.error || !data.access_token) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error || 'no token'}`)
  }

  return data.access_token
}

// ─── GitHub User Profile ────────────────────────────────────────────────────

export interface GitHubUser {
  id: number
  login: string
  email: string | null
  avatar_url: string
}

/**
 * Fetch the authenticated user's GitHub profile.
 */
export async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  const res = await fetch(`${GITHUB_API}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'GitFold/1.0 (https://gitfold.cc)',
    },
  })

  if (!res.ok) {
    throw new Error(`GitHub user fetch failed: ${res.status}`)
  }

  const user = await res.json<GitHubUser>()

  // If email is not public, try the emails endpoint
  if (!user.email) {
    try {
      const emailRes = await fetch(`${GITHUB_API}/user/emails`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'GitFold/1.0 (https://gitfold.cc)',
        },
      })
      if (emailRes.ok) {
        const emails = await emailRes.json<Array<{ email: string; primary: boolean; verified: boolean }>>()
        const primary = emails.find(e => e.primary && e.verified)
        if (primary) user.email = primary.email
      }
    } catch {
      // Not critical — email stays null
    }
  }

  return user
}

// ─── D1 User Management ────────────────────────────────────────────────────

export interface DbUser {
  id: string
  email: string
  github_id: number
  github_login: string
  avatar_url: string | null
}

/**
 * Find or create a user in D1 from a GitHub profile.
 * Returns the user record (upsert on github_id).
 */
export async function findOrCreateUser(
  db: D1Database,
  githubUser: GitHubUser,
): Promise<DbUser> {
  const now = Date.now()

  // Try to find existing user by GitHub ID
  const existing = await db.prepare(
    'SELECT id, email, github_id, github_login, avatar_url FROM users WHERE github_id = ?',
  ).bind(githubUser.id).first<DbUser>()

  if (existing) {
    // Update profile fields if changed
    await db.prepare(
      'UPDATE users SET github_login = ?, avatar_url = ?, email = COALESCE(?, email), updated_at = ? WHERE id = ?',
    ).bind(
      githubUser.login,
      githubUser.avatar_url,
      githubUser.email,
      now,
      existing.id,
    ).run()

    return {
      ...existing,
      github_login: githubUser.login,
      avatar_url: githubUser.avatar_url,
      email: githubUser.email ?? existing.email,
    }
  }

  // Create new user
  const userId = crypto.randomUUID()
  const email = githubUser.email || `${githubUser.id}+${githubUser.login}@users.noreply.github.com`

  await db.prepare(
    'INSERT INTO users (id, email, github_id, github_login, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).bind(userId, email, githubUser.id, githubUser.login, githubUser.avatar_url, now, now).run()

  return { id: userId, email, github_id: githubUser.id, github_login: githubUser.login, avatar_url: githubUser.avatar_url }
}

// ─── Token Storage ──────────────────────────────────────────────────────────

/**
 * Store an encrypted OAuth token in D1.
 * Upserts on (user_id, token_type='oauth').
 */
export async function storeOAuthToken(
  db: D1Database,
  userId: string,
  accessToken: string,
  encryptionKey: string,
): Promise<void> {
  const now = Date.now()
  const encrypted = await encryptToken(accessToken, encryptionKey)

  // Upsert: delete old + insert new (D1 doesn't support ON CONFLICT UPDATE well across all cases)
  await db.batch([
    db.prepare('DELETE FROM github_tokens WHERE user_id = ? AND token_type = ?').bind(userId, 'oauth'),
    db.prepare(
      'INSERT INTO github_tokens (id, user_id, encrypted_token, scope, token_type, created_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).bind(crypto.randomUUID(), userId, encrypted, 'repo,user:email', 'oauth', now, now),
  ])
}

/**
 * Retrieve and decrypt the stored OAuth token for a user.
 * Also updates last_used_at.
 */
export async function getUserOAuthToken(
  db: D1Database,
  userId: string,
  encryptionKey: string,
): Promise<string | null> {
  const row = await db.prepare(
    'SELECT id, encrypted_token FROM github_tokens WHERE user_id = ? AND token_type = ? LIMIT 1',
  ).bind(userId, 'oauth').first<{ id: string; encrypted_token: string }>()

  if (!row) return null

  // Update last_used_at (fire-and-forget, don't block)
  db.prepare('UPDATE github_tokens SET last_used_at = ? WHERE id = ?')
    .bind(Date.now(), row.id).run().catch(() => {})

  try {
    return await decryptToken(row.encrypted_token, encryptionKey)
  } catch {
    console.warn('[auth] Failed to decrypt OAuth token for user', userId)
    return null
  }
}

// ─── Subscription Lookup (D1-based) ─────────────────────────────────────────

/**
 * Get a user's subscription tier from D1.
 * Returns 'free' if no active subscription found.
 */
export async function getUserTier(db: D1Database, userId: string): Promise<Tier> {
  const row = await db.prepare(
    `SELECT tier FROM subscriptions
     WHERE user_id = ? AND status IN ('active', 'trialing')
     ORDER BY created_at DESC LIMIT 1`,
  ).bind(userId).first<{ tier: Tier }>()

  return row?.tier ?? 'free'
}

// ─── CSRF State ─────────────────────────────────────────────────────────────

/**
 * Generate and store a CSRF state token in KV.
 */
export async function createOAuthState(kv: KVNamespace): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  const state = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  await kv.put(`oauth:state:${state}`, '1', { expirationTtl: 600 }) // 10 min
  return state
}

/**
 * Validate and consume a CSRF state token.
 */
export async function validateOAuthState(kv: KVNamespace, state: string): Promise<boolean> {
  const val = await kv.get(`oauth:state:${state}`)
  if (!val) return false
  await kv.delete(`oauth:state:${state}`) // one-time use
  return true
}
