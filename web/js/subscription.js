/**
 * GitFold — Subscription State Management (Phase 1 + Phase 2)
 *
 * Manages subscription token in localStorage and provides
 * tier-aware file limits for the download flow.
 *
 * Phase 2: also checks OAuth session tier from auth.js.
 *
 * @module subscription
 */

import { getCachedSession } from './auth.js'

const SUB_TOKEN_KEY = 'gitfold_sub_token'
const SUB_STATUS_KEY = 'gitfold_sub_status'

// ─── Tier limits (must match worker/wrangler.toml) ──────────────────────────

const TIER_LIMITS = {
  free: 50,
  token: 200,   // free user with GitHub PAT
  pro: 1000,
  power: 5000,
}

// ─── Token management ───────────────────────────────────────────────────────

/** Get the stored subscription token. */
export function getSubToken() {
  return localStorage.getItem(SUB_TOKEN_KEY) || ''
}

/** Save a subscription token. */
export function setSubToken(token) {
  if (token) {
    localStorage.setItem(SUB_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(SUB_TOKEN_KEY)
  }
}

/** Clear subscription state entirely. */
export function clearSubscription() {
  localStorage.removeItem(SUB_TOKEN_KEY)
  localStorage.removeItem(SUB_STATUS_KEY)
}

// ─── Status queries ─────────────────────────────────────────────────────────

/**
 * Get the cached subscription status (without network call).
 * @returns {{ tier: string, active: boolean } | null}
 */
export function getCachedStatus() {
  try {
    const raw = localStorage.getItem(SUB_STATUS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Check subscription status from the API (network call).
 * Caches the result in localStorage.
 *
 * @param {string} apiBase  API origin, e.g. 'https://api.gitfold.cc'
 * @returns {Promise<{ tier: string, active: boolean }>}
 */
export async function verifySubscription(apiBase) {
  const token = getSubToken()
  if (!token) return { tier: 'free', active: false }

  try {
    const res = await fetch(`${apiBase}/v1/sub/status?token=${encodeURIComponent(token)}`)
    if (!res.ok) return { tier: 'free', active: false }
    const data = await res.json()
    const status = { tier: data.tier || 'free', active: !!data.active }
    localStorage.setItem(SUB_STATUS_KEY, JSON.stringify(status))
    return status
  } catch {
    // Network error — use cached status or default
    return getCachedStatus() || { tier: 'free', active: false }
  }
}

// ─── Tier helpers ───────────────────────────────────────────────────────────

/**
 * Check if the current user is a Pro (or higher) subscriber.
 * Checks both KV sub-token status and OAuth session tier.
 */
export function isProUser() {
  // Check OAuth session first (Phase 2)
  const session = getCachedSession()
  if (session?.authenticated && (session.tier === 'pro' || session.tier === 'power')) {
    return true
  }
  // Fall back to KV-based status (Phase 1)
  const status = getCachedStatus()
  return status?.active && (status.tier === 'pro' || status.tier === 'power')
}

/**
 * Get the file limit for the current user's tier.
 * @param {boolean} hasGithubToken  Whether the user has a GitHub PAT configured
 * @returns {number}
 */
export function getFileLimit(hasGithubToken = false) {
  // Check OAuth session tier first (Phase 2)
  const session = getCachedSession()
  if (session?.authenticated && session.tier in TIER_LIMITS) {
    return TIER_LIMITS[session.tier]
  }

  // Fall back to KV-based status (Phase 1)
  const status = getCachedStatus()
  if (status?.active && status.tier in TIER_LIMITS) {
    return TIER_LIMITS[status.tier]
  }

  // OAuth-authenticated users count as having a token
  if (session?.authenticated) return TIER_LIMITS.token

  return hasGithubToken ? TIER_LIMITS.token : TIER_LIMITS.free
}

/**
 * Get the current tier label for display.
 * @param {boolean} hasGithubToken
 * @returns {string}
 */
export function getCurrentTier(hasGithubToken = false) {
  // Check OAuth session tier first (Phase 2)
  const session = getCachedSession()
  if (session?.authenticated && session.tier !== 'free') return session.tier

  // Fall back to KV-based status (Phase 1)
  const status = getCachedStatus()
  if (status?.active && status.tier !== 'free') return status.tier
  return 'free'
}

// ─── Checkout flow ──────────────────────────────────────────────────────────

/**
 * Create a Stripe checkout session and redirect the user.
 *
 * @param {string} email
 * @param {'pro'|'power'} tier
 * @param {string} apiBase
 */
export async function startCheckout(email, tier, apiBase) {
  const res = await fetch(`${apiBase}/v1/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, tier }),
  })
  if (!res.ok) {
    throw new Error('Failed to start checkout')
  }
  const data = await res.json()
  if (data.url) {
    window.location.href = data.url
  }
}

/**
 * Handle checkout success redirect.
 * Call on page load to detect ?checkout=success in the URL.
 * Claims the subscription token using the Stripe session ID.
 *
 * @param {string} apiBase
 * @returns {Promise<{ tier: string, active: boolean } | undefined>}
 */
export async function handleCheckoutReturn(apiBase) {
  const params = new URLSearchParams(window.location.search)
  if (params.get('checkout') !== 'success') return

  const sessionId = params.get('session_id')

  // Clean the URL
  const clean = window.location.pathname
  window.history.replaceState({}, '', clean)

  // Claim subscription token from the server
  if (sessionId) {
    try {
      const res = await fetch(`${apiBase}/v1/sub/claim?session_id=${encodeURIComponent(sessionId)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.ok && data.token) {
          setSubToken(data.token)
        }
      }
    } catch {
      // Claim failed — user can retry via status check
    }
  }

  // Verify subscription status
  const status = await verifySubscription(apiBase)
  return status
}
