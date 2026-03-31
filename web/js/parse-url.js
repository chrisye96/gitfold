/**
 * GitFold — URL Parser
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
 *   https://gitfold.cc/owner/repo/tree/branch/path     (already gitfold URL)
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

  // Accept both github.com and gitfold.cc URLs
  if (u.hostname !== 'github.com' && u.hostname !== 'gitfold.cc') return null

  // Pattern 1: /owner/repo/tree/branch[/path]
  const treeMatch = u.pathname.match(/^\/([^/]+)\/([^/]+)\/tree\/([^/]+)(?:\/(.+))?$/)

  // Pattern 2: /owner/repo (bare repo URL, no branch)
  const repoMatch = !treeMatch && u.pathname.match(/^\/([^/]+)\/([^/]+)\/?$/)

  const match = treeMatch || repoMatch
  if (!match) return null

  const owner = match[1]
  const repo  = match[2]

  if (!owner || !repo) return null

  // Reject obvious non-repo segments
  if (owner === 'login' || owner === 'settings' || owner === 'explore') return null

  if (treeMatch) {
    const branch  = treeMatch[3]
    const rawPath = treeMatch[4] || ''
    const path    = rawPath.replace(/\/+$/, '')
    return {
      provider: /** @type {'github'} */ ('github'),
      type:     /** @type {'folder'|'repo'} */ (path ? 'folder' : 'repo'),
      owner,
      repo,
      branch,
      path,
      originalUrl: url,
    }
  }

  // Bare repo URL — branch unknown, will be resolved at download time
  return {
    provider: /** @type {'github'} */ ('github'),
    type:     /** @type {'repo'} */ ('repo'),
    owner,
    repo,
    branch: '',
    path: '',
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
 * Build a GitFold shareable download URL from repo info.
 *
 * @param {{ owner: string, repo: string, branch: string, path: string }} info
 * @param {string} [base] - Base URL, defaults to 'https://gitfold.cc'
 * @returns {string}
 */
export function buildSnipUrl(info, base = 'https://gitfold.cc') {
  const pathPart = info.path ? `/${info.path}` : ''
  return `${base}/${info.owner}/${info.repo}/tree/${info.branch}${pathPart}`
}

/**
 * Get a display label for repo info.
 *
 * @param {{ type: string, owner: string, repo: string, branch: string, path: string }} info
 * @returns {string}
 */
export function formatRepoInfo(info) {
  if (info.type === 'repo') {
    const branchHint = info.branch ? `  (${info.branch})` : ''
    return `Repository · ${info.owner}/${info.repo}${branchHint}`
  }
  return `Folder · ${info.owner}/${info.repo}/${info.path}  (${info.branch})`
}

/**
 * Derive the zip filename from repo info.
 *
 * @param {{ type: string, repo: string, path: string }} info
 * @returns {string}
 */
export function zipFilename(info) {
  if (info.type === 'repo') return `${info.repo}.zip`
  const base = info.path.split('/').pop() || info.repo
  return `${base} -gitfold.cc.zip`
}

/**
 * Build the GitHub archive download URL for a full repository.
 *
 * @param {{ owner: string, repo: string, branch: string }} info
 * @param {'zip'|'tar.gz'} [format]
 * @returns {string}
 */
export function buildArchiveUrl(info, format = 'zip') {
  const ext = format === 'tar.gz' ? 'tar.gz' : 'zip'
  return `https://github.com/${info.owner}/${info.repo}/archive/refs/heads/${info.branch}.${ext}`
}
