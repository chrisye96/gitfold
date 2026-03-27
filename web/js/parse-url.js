/**
 * GitSnip — URL Parser
 * Parses GitHub directory URLs into structured RepoInfo objects.
 * Works in both browser (ES module) and Cloudflare Workers (bundled by Wrangler).
 *
 * @module parse-url
 */

/**
 * Parse a GitHub directory URL.
 *
 * Accepts formats:
 *   https://github.com/owner/repo/tree/branch/path/to/dir
 *   https://github.com/owner/repo/tree/branch          (root of branch)
 *   github.com/owner/repo/tree/branch/path             (no protocol)
 *   https://gitsnip.cc/owner/repo/tree/branch/path     (already gitsnip URL)
 *
 * @param {string} url
 * @returns {{ provider: 'github', owner: string, repo: string, branch: string, path: string, originalUrl: string } | null}
 */
export function parseGithubUrl(url) {
  if (!url || typeof url !== 'string') return null

  let normalized = url.trim()

  // Strip protocol-relative or missing protocol
  if (normalized.startsWith('//')) normalized = 'https:' + normalized
  if (!normalized.startsWith('http')) normalized = 'https://' + normalized

  let u
  try {
    u = new URL(normalized)
  } catch {
    return null
  }

  // Accept both github.com and gitsnip.cc URLs
  if (u.hostname !== 'github.com' && u.hostname !== 'gitsnip.cc') return null

  // Pattern: /owner/repo/tree/branch[/path]
  const match = u.pathname.match(/^\/([^/]+)\/([^/]+)\/tree\/([^/]+)(?:\/(.+))?$/)
  if (!match) return null

  const [, owner, repo, branch, rawPath = ''] = match
  const path = rawPath.replace(/\/+$/, '') // strip trailing slashes

  if (!owner || !repo || !branch) return null

  // Reject obvious non-repo segments
  if (owner === 'login' || owner === 'settings' || owner === 'explore') return null

  return {
    provider: /** @type {'github'} */ ('github'),
    owner,
    repo,
    branch,
    path,
    originalUrl: url,
  }
}

/**
 * Parse any supported provider URL.
 * Returns null if the URL is not a recognized directory URL.
 *
 * @param {string} url
 * @returns {{ provider: string, owner: string, repo: string, branch: string, path: string, originalUrl: string } | null}
 */
export function parseUrl(url) {
  return parseGithubUrl(url)
}

/**
 * Build a GitSnip shareable download URL from repo info.
 *
 * @param {{ owner: string, repo: string, branch: string, path: string }} info
 * @param {string} [base] - Base URL, defaults to 'https://gitsnip.cc'
 * @returns {string}
 */
export function buildSnipUrl(info, base = 'https://gitsnip.cc') {
  const pathPart = info.path ? `/${info.path}` : ''
  return `${base}/${info.owner}/${info.repo}/tree/${info.branch}${pathPart}`
}

/**
 * Get a display label for repo info, e.g. "owner/repo → /path (branch)"
 *
 * @param {{ owner: string, repo: string, branch: string, path: string }} info
 * @returns {string}
 */
export function formatRepoInfo(info) {
  const pathLabel = info.path ? `/${info.path}` : '/'
  return `${info.owner}/${info.repo} → ${pathLabel}  (${info.branch})`
}

/**
 * Derive the zip filename from repo info.
 * Uses the last path segment, or the repo name if path is empty.
 *
 * @param {{ repo: string, path: string }} info
 * @returns {string}  e.g. "feature-dev.zip"
 */
export function zipFilename(info) {
  if (info.path) {
    const last = info.path.split('/').pop()
    return (last || info.repo) + '.zip'
  }
  return info.repo + '.zip'
}
