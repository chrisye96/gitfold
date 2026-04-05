const STORAGE_KEY = 'github_token'

const TOKEN_FORMAT = /^(ghp_|github_pat_|gho_|ghs_|ghu_|ghr_)[A-Za-z0-9_]+$/

export type TokenValidationResult =
  | { valid: true;  limit: number }
  | { valid: false; reason: 'format' | 'auth' | 'network' }

/** Read the saved token from chrome.storage.local. Returns undefined if not set. */
export async function getToken(): Promise<string | undefined> {
  const result = await chrome.storage.local.get(STORAGE_KEY) as { [STORAGE_KEY]?: string }
  return result[STORAGE_KEY]
}

/** Persist a token to chrome.storage.local. */
export async function saveToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: token })
}

/** Remove the saved token. */
export async function clearToken(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY)
}

/**
 * Validate a token by:
 *   1. Checking format (fast, client-side)
 *   2. Calling GitHub's rate_limit endpoint (network)
 */
export async function validateToken(token: string): Promise<TokenValidationResult> {
  if (!TOKEN_FORMAT.test(token)) {
    return { valid: false, reason: 'format' }
  }

  try {
    const response = await fetch('https://api.github.com/rate_limit', {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.status === 401) return { valid: false, reason: 'auth' }

    if (response.ok) {
      const data = await response.json() as { resources: { core: { limit: number } } }
      return { valid: true, limit: data.resources.core.limit }
    }

    // Non-401, non-200: treat as network issue (don't reject a valid token)
    return { valid: true, limit: 0 }

  } catch {
    // Network error: save the token anyway (user might be offline)
    return { valid: true, limit: 0 }
  }
}
