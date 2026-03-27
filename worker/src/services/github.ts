/**
 * GitSnip Worker — GitHub API Service
 *
 * Fetches file trees and raw file content from GitHub.
 * Caches tree responses in Cloudflare KV to reduce API calls.
 */

import type { KVNamespace } from '@cloudflare/workers-types'
import type { RepoInfo, TreeEntry } from '../types.js'
import { checkLimits, errorResponse } from '../middleware/security.js'

const GITHUB_API = 'https://api.github.com'
const RAW_BASE   = 'https://raw.githubusercontent.com'
const CACHE_TTL  = 5 * 60 // 5 minutes in seconds

// ─── Headers ─────────────────────────────────────────────────────────────────

function apiHeaders(token?: string): HeadersInit {
  const h: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'GitSnip/1.0 (https://gitsnip.cc)',
  }
  if (token) (h as Record<string, string>).Authorization = `Bearer ${token}`
  return h
}

// ─── Error handling ───────────────────────────────────────────────────────────

async function checkGitHubResponse(res: Response, context = ''): Promise<void> {
  if (res.ok) return

  const remaining = res.headers.get('X-RateLimit-Remaining')
  const resetTs   = res.headers.get('X-RateLimit-Reset')

  if ((res.status === 403 || res.status === 429) && remaining === '0') {
    const resetDate = resetTs
      ? new Date(Number(resetTs) * 1000).toUTCString()
      : 'soon'
    throw errorResponse(
      429,
      'RATE_LIMITED',
      `GitHub API rate limit exceeded. Resets at ${resetDate}.`,
      'Provide X-GitHub-Token header to get 5,000 requests/hour.',
    )
  }

  if (res.status === 401) {
    throw errorResponse(401, 'UNAUTHORIZED', 'GitHub token is invalid or expired.',
      'Check your X-GitHub-Token header.')
  }

  if (res.status === 404) {
    throw errorResponse(404, 'NOT_FOUND',
      `Not found${context ? ': ' + context : ''}.`,
      'Check that the repository, branch, and path exist.')
  }

  let msg = ''
  try { msg = ((await res.json()) as { message?: string }).message ?? '' } catch { /* ignore */ }
  throw errorResponse(502, 'GITHUB_ERROR', `GitHub API error ${res.status}${msg ? ': ' + msg : ''}`)
}

// ─── Tree fetching ────────────────────────────────────────────────────────────

/**
 * Fetch the recursive file tree for a GitHub directory (2 API calls).
 * Results are cached in KV for CACHE_TTL seconds.
 *
 * @throws {Response}  On GitHub API errors (rate limit, 404, etc.)
 */
export async function fetchTree(
  info: RepoInfo,
  token: string | undefined,
  kv: KVNamespace,
): Promise<TreeEntry[]> {
  const cacheKey = `tree:${info.owner}/${info.repo}/${info.branch}/${info.path}`

  // Try KV cache first
  const cached = await kv.get(cacheKey, 'json') as TreeEntry[] | null
  if (cached) return cached

  const headers = apiHeaders(token)

  // Step 1: resolve branch → commit tree SHA
  const branchRes = await fetch(
    `${GITHUB_API}/repos/${info.owner}/${info.repo}/branches/${encodeURIComponent(info.branch)}`,
    { headers },
  )
  await checkGitHubResponse(branchRes, `${info.owner}/${info.repo}@${info.branch}`)

  const branchData = await branchRes.json() as {
    commit: { commit: { tree: { sha: string } } }
  }
  const treeSha = branchData.commit.commit.tree.sha

  // Step 2: fetch entire recursive tree (1 API call)
  const treeRes = await fetch(
    `${GITHUB_API}/repos/${info.owner}/${info.repo}/git/trees/${treeSha}?recursive=1`,
    { headers },
  )
  await checkGitHubResponse(treeRes)

  const treeData = await treeRes.json() as {
    tree: Array<{ path: string; type: string; size?: number; sha: string }>
    truncated: boolean
  }

  if (treeData.truncated) {
    console.warn('[GitSnip] GitHub truncated the tree (>100k files). Some files may be missing.')
  }

  // Filter: blobs under target path, exclude .git
  const prefix = info.path ? info.path + '/' : ''
  const entries: TreeEntry[] = treeData.tree
    .filter(e =>
      e.type === 'blob' &&
      !e.path.startsWith('.git/') &&
      e.path !== '.git' &&
      (info.path === '' || e.path.startsWith(prefix)),
    )
    .map(e => ({ path: e.path, type: 'blob' as const, size: e.size ?? 0, sha: e.sha }))

  if (entries.length === 0) {
    throw errorResponse(
      404, 'NOT_FOUND',
      `No files found in '${info.path || '/'}'. Check that the path exists.`,
      'Check that the directory exists and contains files.',
    )
  }

  // Check limits before caching
  const totalSize = entries.reduce((s, e) => s + (e.size ?? 0), 0)
  const limitResult = checkLimits(entries.length, totalSize)
  if (!limitResult.ok) throw limitResult.response

  // Cache the result
  await kv.put(cacheKey, JSON.stringify(entries), { expirationTtl: CACHE_TTL })

  return entries
}

// ─── File content fetching ────────────────────────────────────────────────────

/** Build the raw.githubusercontent.com URL for a file. */
export function getRawUrl(filePath: string, info: RepoInfo): string {
  return `${RAW_BASE}/${info.owner}/${info.repo}/${info.branch}/${filePath}`
}

/**
 * Fetch all files in the tree as Uint8Arrays.
 * Uses raw.githubusercontent.com — does NOT count against the API rate limit.
 *
 * Fetches in batches of 8 to stay within Workers' connection limits.
 *
 * @throws {Response}  If any file fetch fails.
 */
export async function fetchAllFiles(
  entries: TreeEntry[],
  info: RepoInfo,
): Promise<Array<{ path: string; data: Uint8Array }>> {
  const BATCH = 8
  const results: Array<{ path: string; data: Uint8Array }> = new Array(entries.length)

  async function fetchOne(entry: TreeEntry, idx: number) {
    const url = getRawUrl(entry.path, info)
    const res = await fetch(url)
    if (!res.ok) {
      throw errorResponse(502, 'GITHUB_ERROR', `Failed to fetch ${entry.path}: HTTP ${res.status}`)
    }
    const buf = await res.arrayBuffer()
    results[idx] = { path: entry.path, data: new Uint8Array(buf) }
  }

  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH)
    await Promise.all(batch.map((e, j) => fetchOne(e, i + j)))
  }

  return results
}

// ─── Info (metadata only) ─────────────────────────────────────────────────────

/** Build the SnipInfo JSON response from a tree. */
export function buildInfo(entries: TreeEntry[], info: RepoInfo) {
  return {
    provider: info.provider,
    owner: info.owner,
    repo: info.repo,
    branch: info.branch,
    path: info.path,
    fileCount: entries.length,
    totalSize: entries.reduce((s, e) => s + (e.size ?? 0), 0),
    files: entries.map(e => ({ path: e.path, size: e.size ?? 0 })),
  }
}
