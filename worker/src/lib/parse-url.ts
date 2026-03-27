/**
 * GitSnip Worker — URL Parser (TypeScript)
 *
 * Mirrors web/js/parse-url.js for use inside the Worker bundle.
 * Kept in sync manually; the web version is the source of truth for browser usage.
 */

import type { RepoInfo } from '../types.js'

/**
 * Parse a GitHub directory URL into a RepoInfo object.
 *
 * Accepts:
 *   https://github.com/owner/repo/tree/branch/path/to/dir
 *   https://github.com/owner/repo/tree/branch          (root — path will be '')
 *   github.com/owner/repo/tree/branch/path             (no protocol)
 *   https://gitsnip.cc/owner/repo/tree/branch/path     (gitsnip URL)
 */
export function parseGithubUrl(url: string): RepoInfo | null {
  if (!url || typeof url !== 'string') return null

  let normalized = url.trim()

  if (normalized.startsWith('//')) normalized = 'https:' + normalized
  if (!normalized.startsWith('http')) normalized = 'https://' + normalized

  let u: URL
  try {
    u = new URL(normalized)
  } catch {
    return null
  }

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
    provider: 'github',
    owner,
    repo,
    branch,
    path,
    originalUrl: url,
  }
}
