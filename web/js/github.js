/**
 * GitSnip — Browser GitHub API Client
 * Fetches file trees and raw file content directly from the browser.
 * Each user's IP gets its own 60 req/hour quota (no backend cost).
 *
 * @module github
 */

const GITHUB_API = 'https://api.github.com'
const RAW_BASE = 'https://raw.githubusercontent.com'

// Max parallel file fetches to avoid browser connection limits
const FETCH_CONCURRENCY = 6

/**
 * Build GitHub API request headers.
 * @param {string} [token]
 * @returns {Record<string, string>}
 */
function apiHeaders(token) {
  /** @type {Record<string, string>} */
  const h = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

/**
 * @param {Response} res
 * @param {string} [context]
 */
async function checkGithubResponse(res, context = '') {
  if (res.ok) return

  const remaining = res.headers.get('X-RateLimit-Remaining')
  const resetTs = res.headers.get('X-RateLimit-Reset')

  if ((res.status === 403 || res.status === 429) && remaining === '0') {
    const resetDate = resetTs
      ? new Date(Number(resetTs) * 1000).toLocaleTimeString()
      : 'soon'
    const err = new Error(`GitHub API rate limit exceeded. Resets at ${resetDate}.`)
    err.code = 'RATE_LIMITED'
    err.hint = 'Add a GitHub Personal Access Token to get 5,000 requests/hour.'
    throw err
  }

  if (res.status === 401) {
    const err = new Error('GitHub token is invalid or expired.')
    err.code = 'UNAUTHORIZED'
    err.hint = 'Check your token in the settings panel.'
    throw err
  }

  if (res.status === 404) {
    const err = new Error(`Not found${context ? ': ' + context : ''}.`)
    err.code = 'NOT_FOUND'
    throw err
  }

  let body = ''
  try { body = (await res.json()).message || '' } catch { /* ignore */ }
  const err = new Error(`GitHub API error ${res.status}${body ? ': ' + body : ''}`)
  err.code = 'GITHUB_ERROR'
  throw err
}

/**
 * Fetch the file tree for a GitHub directory (2 API calls total).
 *
 * @param {{ owner: string, repo: string, branch: string, path: string }} info
 * @param {string} [token]
 * @returns {Promise<Array<{ path: string, size: number, sha: string }>>}
 */
export async function fetchTree(info, token) {
  const headers = apiHeaders(token)

  // Step 1: resolve branch → tree SHA
  const branchRes = await fetch(
    `${GITHUB_API}/repos/${info.owner}/${info.repo}/branches/${encodeURIComponent(info.branch)}`,
    { headers },
  )
  await checkGithubResponse(
    branchRes,
    `${info.owner}/${info.repo}@${info.branch}`,
  )

  const branchData = await branchRes.json()
  const treeSha = branchData.commit.commit.tree.sha

  // Step 2: fetch recursive tree (1 API call for the entire repo tree)
  const treeRes = await fetch(
    `${GITHUB_API}/repos/${info.owner}/${info.repo}/git/trees/${treeSha}?recursive=1`,
    { headers },
  )
  await checkGithubResponse(treeRes)

  const treeData = await treeRes.json()

  if (treeData.truncated) {
    console.warn(
      '[GitSnip] GitHub truncated the tree (>100k files). Some files may be missing.',
    )
  }

  // Filter: only blobs under target path, exclude .git
  const prefix = info.path ? info.path + '/' : ''
  const entries = treeData.tree.filter(
    (/** @type {any} */ e) =>
      e.type === 'blob' &&
      !e.path.startsWith('.git/') &&
      e.path !== '.git' &&
      (info.path === '' || e.path.startsWith(prefix)),
  )

  if (entries.length === 0) {
    const err = new Error(
      `No files found in '${info.path || '/'}'. Check that the path exists.`,
    )
    err.code = 'NOT_FOUND'
    throw err
  }

  return entries.map((/** @type {any} */ e) => ({
    path: e.path,
    size: e.size ?? 0,
    sha: e.sha,
  }))
}

/**
 * Get the raw.githubusercontent.com URL for a file.
 *
 * @param {string} filePath - Full path in the repo (e.g. "plugins/feature-dev/README.md")
 * @param {{ owner: string, repo: string, branch: string }} info
 * @returns {string}
 */
export function getRawUrl(filePath, info) {
  return `${RAW_BASE}/${info.owner}/${info.repo}/${info.branch}/${filePath}`
}

/**
 * Fetch all file contents in a directory.
 * Uses raw.githubusercontent.com — does NOT count against the API rate limit.
 *
 * @param {{ owner: string, repo: string, branch: string, path: string }} info
 * @param {string} [token]   - Only used for tree API calls, not raw fetches
 * @param {(done: number, total: number) => void} [onProgress]
 * @returns {Promise<Array<{ path: string, data: ArrayBuffer }>>}
 */
export async function fetchFiles(info, token, onProgress) {
  const tree = await fetchTree(info, token)
  const total = tree.length
  let done = 0

  /** @type {Array<{ path: string, data: ArrayBuffer }>} */
  const results = new Array(total)

  /**
   * Fetch one file and store at the given index.
   * @param {{ path: string }} entry
   * @param {number} idx
   */
  async function fetchOne(entry, idx) {
    const url = getRawUrl(entry.path, info)
    const res = await fetch(url)
    if (!res.ok) {
      const err = new Error(`Failed to fetch ${entry.path} (HTTP ${res.status})`)
      err.code = 'FETCH_ERROR'
      throw err
    }
    results[idx] = { path: entry.path, data: await res.arrayBuffer() }
    done++
    onProgress?.(done, total)
  }

  // Process in concurrent batches
  for (let i = 0; i < total; i += FETCH_CONCURRENCY) {
    const batch = tree.slice(i, i + FETCH_CONCURRENCY)
    await Promise.all(batch.map((entry, j) => fetchOne(entry, i + j)))
  }

  return results
}

/**
 * Get repository metadata (file count, total size) without downloading files.
 *
 * @param {{ owner: string, repo: string, branch: string, path: string }} info
 * @param {string} [token]
 * @returns {Promise<{ fileCount: number, totalSize: number, files: Array<{ path: string, size: number }> }>}
 */
export async function getInfo(info, token) {
  const tree = await fetchTree(info, token)
  return {
    fileCount: tree.length,
    totalSize: tree.reduce((sum, f) => sum + (f.size || 0), 0),
    files: tree.map(f => ({ path: f.path, size: f.size || 0 })),
  }
}
