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
      if (res.status >= 500 && attempt < maxRetries) continue
      return res
    } catch (err) {
      clearTimeout(timeoutId)
      lastError = err
      if ((err as Error).name === 'AbortError') throw err
    }
  }
  throw lastError
}

/**
 * Convert a Blob to a base64 data URL and trigger chrome.downloads.
 *
 * MV3 service workers can't use URL.createObjectURL reliably (different
 * execution context from the download manager). We always use data URLs
 * with application/octet-stream to force Chrome to treat it as a binary
 * download and respect the filename parameter.
 */
async function downloadBlob(blob: Blob, filename: string): Promise<void> {
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

/**
 * Fetch a URL and trigger a download if successful.
 * Returns the Response for status inspection.
 *
 * Always fetches first (never chrome.downloads.download(url) directly)
 * because:
 *   1. Error responses (413, 429) would be saved as download.json
 *   2. raw.githubusercontent.com returns Content-Type: text/plain
 *      which makes Chrome rename .md → .txt
 *   3. We need to send custom headers (X-GitHub-Token, X-Client)
 */
async function fetchAndDownload(
  url: string,
  headers: Record<string, string>,
  filename: string,
): Promise<Response> {
  const response = await fetchWithRetry(url, headers)
  if (response.ok) {
    const blob = await response.blob()
    // Try to extract filename from Content-Disposition (API sets it)
    const cd = response.headers.get('Content-Disposition')
    const cdMatch = cd?.match(/filename="?([^"]+)"?/)
    const resolvedFilename = cdMatch?.[1] || filename
    await downloadBlob(blob, resolvedFilename)
  }
  return response
}

function buildApiUrl(info: RepoInfo): string {
  const ghUrl = `https://github.com/${info.owner}/${info.repo}/tree/${info.branch}/${info.path}`
  return `${API_BASE}/v1/download?url=${encodeURIComponent(ghUrl)}`
}

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
 *       repo   → redirect to GitHub's native archive URL
 *       folder → download zip via GitFold API
 *   - Single file selected → download raw file from GitHub
 *   - Multiple items or folder selected → download current directory as zip
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

  const { github_token: token } = await chrome.storage.local.get('github_token') as { github_token?: string }
  const hasToken = Boolean(token)

  // ── Selection handling ──────────────────────────────────────────────────

  if (selectedItems && selectedItems.length > 0) {
    // Single file selected → download raw file (no zip)
    if (selectedItems.length === 1 && selectedItems[0].type === 'blob') {
      try {
        const item = selectedItems[0]
        const rawUrl = `https://raw.githubusercontent.com/${info.owner}/${info.repo}/${info.branch}/${item.path}`
        const filename = item.path.split('/').pop() || 'file'
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        const response = await fetchAndDownload(rawUrl, headers, filename)
        if (response.ok) return { ok: true }
        return { ok: false, code: mapStatusCode(response.status), hasToken }
      } catch {
        return { ok: false, code: 'network', hasToken }
      }
    }

    // Multiple items or any folder → download current directory as zip
    try {
      const apiUrl = buildApiUrl(info)
      const safePath = info.path.replace(/\//g, '-') || 'root'
      const fallbackFilename = `${info.owner}-${info.repo}-${safePath}.zip`
      const headers: Record<string, string> = { 'X-Client': 'extension' }
      if (token) headers['X-GitHub-Token'] = token

      const response = await fetchAndDownload(apiUrl, headers, fallbackFilename)
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
    const headers: Record<string, string> = { 'X-Client': 'extension' }
    if (token) headers['X-GitHub-Token'] = token

    const response = await fetchAndDownload(apiUrl, headers, fallbackFilename)
    if (response.ok) return { ok: true }
    return { ok: false, code: mapStatusCode(response.status), hasToken }

  } catch (err) {
    if ((err as Error).name === 'AbortError') return { ok: false, code: 'network', hasToken }
    return { ok: false, code: 'network', hasToken }
  }
}
