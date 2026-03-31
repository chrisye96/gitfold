/**
 * GitFold — Frontend Auth Module (Phase 2)
 *
 * Manages GitHub OAuth session state via cookie-based JWT.
 * The session cookie is HttpOnly (set by the server), so this
 * module communicates with the API to check auth status.
 *
 * @module auth
 */

/** @type {{ authenticated: boolean, userId?: string, email?: string, githubLogin?: string, avatarUrl?: string, tier?: string } | null} */
let cachedSession = null

// ─── Session API ────────────────────────────────────────────────────────────

/**
 * Check current session via API.
 * Uses `credentials: 'include'` to send the HttpOnly session cookie.
 *
 * @param {string} apiBase  API origin, e.g. 'https://api.gitfold.cc'
 * @returns {Promise<{ authenticated: boolean, userId?: string, email?: string, githubLogin?: string, tier?: string } | null>}
 */
export async function checkSession(apiBase) {
  try {
    const res = await fetch(`${apiBase}/v1/auth/me`, {
      credentials: 'include',
    })
    if (!res.ok) return null
    const data = await res.json()
    cachedSession = data
    return data
  } catch {
    return cachedSession // Return cached on network error
  }
}

/**
 * Get the cached session (no network call).
 * Call checkSession() first to populate.
 */
export function getCachedSession() {
  return cachedSession
}

/**
 * Check if the current user is authenticated via OAuth.
 */
export function isAuthenticated() {
  return cachedSession?.authenticated === true
}

// ─── Auth Actions ───────────────────────────────────────────────────────────

/**
 * Start GitHub OAuth login.
 * Redirects the user to the GitHub authorization page.
 *
 * @param {string} apiBase
 */
export function startGitHubLogin(apiBase) {
  window.location.href = `${apiBase}/v1/auth/github`
}

/**
 * Log out the current user.
 *
 * @param {string} apiBase
 */
export async function logout(apiBase) {
  try {
    await fetch(`${apiBase}/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    // Best-effort
  }
  cachedSession = null
}

/**
 * Handle auth return redirect.
 * Detects ?auth=success or ?auth=error in the URL.
 *
 * @returns {{ success: boolean, reason?: string } | null}
 */
export function handleAuthReturn() {
  const params = new URLSearchParams(window.location.search)
  const auth = params.get('auth')
  if (!auth) return null

  // Save reason before cleaning
  const reason = params.get('reason')

  // Clean the URL
  params.delete('auth')
  params.delete('reason')
  const clean = params.toString()
    ? `${window.location.pathname}?${params}`
    : window.location.pathname
  window.history.replaceState({}, '', clean)

  if (auth === 'success') {
    return { success: true }
  }

  return { success: false, reason: reason || 'unknown' }
}
