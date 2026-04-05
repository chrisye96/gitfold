import type { RepoInfo } from '../shared/types'

const API_BASE = 'https://api.gitfold.cc'
const TIMEOUT_MS = 30_000

export interface DownloadResult {
  ok: boolean
  code?: 'rate_limited' | 'not_found' | 'forbidden' | 'network' | 'too_many_files' | 'unknown'
  hasToken?: boolean
}

interface SelectedItem {
  path: string
  type: 'blob' | 'tree'
}

async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  maxRetries = 1,
): Promise<Response> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(url, { signal: controller.signal, headers })
      clearTimeout(timeoutId)
      // Only retry on 5xx server errors — not on 4xx client errors
      if (res.status >= 500 && attempt < maxRetries) continue
      return res
    } catch (err) {
      clearTimeout(timeoutId)
      lastError = err
      // Don't retry AbortError (timeout)
      if ((err as Error).name === 'AbortError') throw err
    }
  }
  throw lastError
}

/**
 * Build the GitFold API download URL for a GitHub tree path.
 */
function buildApiUrl(info: RepoInfo, subPath?: string): string {
  const path = subPath ?? info.path
  const ghUrl = `https://github.com/${info.owner}/${info.repo}/tree/${info.branch}/${path}`
  return `${API_BASE}/v1/download?url=${encodeURIComponent(ghUrl)}`
}

/**
 * Download via the GitFold API.
 *
 * Strategy:
 *   - Without token → let chrome.downloads fetch the API URL directly.
 *     The API returns Content-Disposition with the correct filename, so
 *     Chrome saves "docs — gitfold.cc.zip" etc. automatically.
 *   - With token → we must fetch ourselves (to send X-GitHub-Token header),
 *     then pipe the response to chrome.downloads via a data URL.
 */
async function downloadViaApi(
  apiUrl: string,
  token: string | undefined,
  fallbackFilename: string,
): Promise<Response | null> {
  if (!token) {
    // Direct download — Chrome handles filename from Content-Disposition
    await chrome.downloads.download({ url: apiUrl, saveAs: false })
    return null  // no Response to inspect; assume success
  }

  // Authenticated download — need to proxy through service worker
  const headers: Record<string, string> = {
    'X-Client': 'extension',
    'X-GitHub-Token': token,
  }
  const response = await fetchWithRetry(apiUrl, headers)
  if (response.ok) {
    const blob = await response.blob()
    // Extract filename from Content-Disposition if available
    const cd = response.headers.get('Content-Disposition')
    const cdMatch = cd?.match(/filename="?([^"]+)"?/)
    const filename = cdMatch?.[1] || fallbackFilename

    const buffer = await blob.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64 = btoa(binary)
    const dataUrl = `data:application/octet-stream;base64,${base64}`
    await chrome.downloads.download({ url: dataUrl, filename, saveAs: false })
  }
  return response
}

/**
 * Map an HTTP status code to our typed error code.
 */
function mapStatusCode(status: number): DownloadResult['code'] {
  if (status === 429) return 'rate_limited'
  if (status === 404) return 'not_found'
  if (status === 401 || status === 403) return 'forbidden'
  if (status === 413) return 'too_many_files'
  return 'unknown'
}

/**
 * Handle a download request from the content script.
 *
 * Behavior by selection:
 *   - No selection (Download Folder / Download Repository button):
 *       repo  → redirect to GitHub's native archive URL
 *       folder → download zip via GitFold API
 *
 *   - Single file selected:
 *       Download the raw file directly from GitHub
 *
 *   - Multiple items selected, or any folder selected:
 *       Download the entire current directory as a zip via GitFold API
 *       (bundling individual files client-side is unreliable without a
 *        server-side batch endpoint; downloading the parent folder is
 *        the most reliable approach)
 */
export async function handleDownload(
  url: string,
  info: RepoInfo,
  selectedItems?: SelectedItem[],
): Promise<DownloadResult> {
  // Full repo: redirect to GitHub's native archive (zero cost, no bandwidth)
  if (info.type === 'repo') {
    const branch = info.branch || 'HEAD'
    const archiveUrl = `https://github.com/${info.owner}/${info.repo}/archive/refs/heads/${branch}.zip`
    await chrome.tabs.create({ url: archiveUrl, active: false })
    return { ok: true }
  }

  // Read optional token from storage
  const { github_token: token } = await chrome.storage.local.get('github_token') as { github_token?: string }
  const hasToken = Boolean(token)

  // ── Selection handling ──────────────────────────────────────────────────

  if (selectedItems && selectedItems.length > 0) {
    // Single file selected → direct raw download (no zip)
    if (selectedItems.length === 1 && selectedItems[0].type === 'blob') {
      try {
        const item = selectedItems[0]
        const rawUrl = `https://raw.githubusercontent.com/${info.owner}/${info.repo}/${info.branch}/${item.path}`
        const filename = item.path.split('/').pop() || 'file'
        await chrome.downloads.download({ url: rawUrl, filename, saveAs: false })
        return { ok: true }
      } catch {
        return { ok: false, code: 'network', hasToken }
      }
    }

    // Multiple items or any folder → download current directory as zip
    // This is more reliable than downloading each item separately, and
    // avoids the need for client-side zip creation.
    try {
      const apiUrl = buildApiUrl(info)
      const safePath = info.path.replace(/\//g, '-') || 'root'
      const fallbackFilename = `${info.owner}-${info.repo}-${safePath}.zip`

      const response = await downloadViaApi(apiUrl, token, fallbackFilename)
      if (!response) return { ok: true }  // direct download (no token), assumed ok
      if (response.ok) return { ok: true }
      return { ok: false, code: mapStatusCode(response.status), hasToken }
    } catch {
      return { ok: false, code: 'network', hasToken }
    }
  }

  // ── No selection: Download Folder button ────────────────────────────────

  try {
    const apiUrl = buildApiUrl(info)
    const safePath = info.path.replace(/\//g, '-') || 'root'
    const fallbackFilename = `${info.owner}-${info.repo}-${safePath}.zip`

    const response = await downloadViaApi(apiUrl, token, fallbackFilename)
    if (!response) return { ok: true }  // direct download (no token)
    if (response.ok) return { ok: true }
    return { ok: false, code: mapStatusCode(response.status), hasToken }

  } catch (err) {
    if ((err as Error).name === 'AbortError') return { ok: false, code: 'network', hasToken }
    return { ok: false, code: 'network', hasToken }
  }
}
