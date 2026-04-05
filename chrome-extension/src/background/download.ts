import type { RepoInfo } from '../shared/types'

const API_BASE = 'https://api.gitfold.cc'
const TIMEOUT_MS = 30_000

export interface DownloadResult {
  ok: boolean
  code?: 'rate_limited' | 'not_found' | 'forbidden' | 'network' | 'too_many_files' | 'unknown'
  hasToken?: boolean
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
 * Convert a Blob to a downloadable URL.
 * Prefers blob URL (fast, zero-copy) but falls back to base64 data URL
 * if URL.createObjectURL is unavailable in the service worker context.
 */
async function blobToDownloadUrl(blob: Blob): Promise<{ url: string; revoke: () => void }> {
  // Try blob URL first (available in Chrome 120+ service workers)
  if (typeof URL.createObjectURL === 'function') {
    const url = URL.createObjectURL(blob)
    return { url, revoke: () => setTimeout(() => URL.revokeObjectURL(url), 60_000) }
  }

  // Fallback: base64 data URL (works everywhere, but uses more memory)
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 = btoa(binary)
  const url = `data:${blob.type || 'application/zip'};base64,${base64}`
  return { url, revoke: () => {} }  // data URLs don't need revoking
}

/**
 * Handle a download request from the content script.
 *
 * For full-repo downloads: opens GitHub's native archive URL in a new tab
 * (avoids proxying large repos through GitFold).
 *
 * For subdirectory downloads: fetches the zip from api.gitfold.cc, creates
 * a blob URL, and triggers chrome.downloads.download().
 *
 * chrome.downloads requires the "downloads" permission in manifest.json.
 */
interface SelectedItem {
  path: string
  type: 'blob' | 'tree'
}

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

  // Multi-item selection: download each selected item individually.
  //   - blob (file) → download raw from GitHub directly
  //   - tree (folder) → download via GitFold API
  if (selectedItems && selectedItems.length > 0) {
    const hasToken = Boolean(token)
    const headers: Record<string, string> = { 'X-Client': 'extension' }
    if (token) headers['X-GitHub-Token'] = token

    let successCount = 0
    let lastErrorCode: DownloadResult['code'] = 'unknown'

    for (const item of selectedItems) {
      try {
        if (item.type === 'blob') {
          // Raw file download directly from GitHub (no GitFold API needed)
          const rawUrl = `https://raw.githubusercontent.com/${info.owner}/${info.repo}/${info.branch}/${item.path}`
          const response = await fetchWithRetry(rawUrl, token ? { Authorization: `Bearer ${token}` } : {})
          if (response.ok) {
            const blob = await response.blob()
            const { url: dlUrl, revoke } = await blobToDownloadUrl(blob)
            const filename = item.path.split('/').pop() || 'file'
            await chrome.downloads.download({ url: dlUrl, filename, saveAs: false })
            revoke()
            successCount++
          } else {
            lastErrorCode = response.status === 404 ? 'not_found' : 'unknown'
          }
        } else {
          // Folder download via GitFold API
          const treeUrl = `https://github.com/${info.owner}/${info.repo}/tree/${info.branch}/${item.path}`
          const apiUrl = `${API_BASE}/v1/download?url=${encodeURIComponent(treeUrl)}`
          const response = await fetchWithRetry(apiUrl, headers)
          if (response.ok) {
            const blob = await response.blob()
            const { url: dlUrl, revoke } = await blobToDownloadUrl(blob)
            const safePath = item.path.replace(/\//g, '-')
            const filename = `${info.owner}-${info.repo}-${safePath}.zip`
            await chrome.downloads.download({ url: dlUrl, filename, saveAs: false })
            revoke()
            successCount++
          } else {
            const s = response.status
            if (s === 429) lastErrorCode = 'rate_limited'
            else if (s === 404) lastErrorCode = 'not_found'
            else if (s === 401 || s === 403) lastErrorCode = 'forbidden'
            else if (s === 413) lastErrorCode = 'too_many_files'
            else lastErrorCode = 'unknown'
          }
        }
      } catch (err) {
        lastErrorCode = 'network'
      }
    }

    if (successCount > 0) return { ok: true }
    return { ok: false, code: lastErrorCode, hasToken }
  }

  // Fetch zip from GitFold API with a 30s timeout (1 automatic retry on 5xx)
  try {
    const apiUrl = `${API_BASE}/v1/download?url=${encodeURIComponent(url)}`
    const headers: Record<string, string> = { 'X-Client': 'extension' }
    if (token) headers['X-GitHub-Token'] = token

    const response = await fetchWithRetry(apiUrl, headers)

    if (response.ok) {
      const blob = await response.blob()
      const { url: dlUrl, revoke } = await blobToDownloadUrl(blob)
      const safePath = info.path.replace(/\//g, '-') || 'root'
      const filename = `${info.owner}-${info.repo}-${safePath}.zip`

      await chrome.downloads.download({ url: dlUrl, filename, saveAs: false })
      revoke()

      return { ok: true }
    }

    // Map HTTP error codes to typed error codes
    const hasToken = Boolean(token)
    const status = response.status

    if (status === 429) return { ok: false, code: 'rate_limited', hasToken }
    if (status === 404) return { ok: false, code: 'not_found',    hasToken }
    if (status === 401 || status === 403) return { ok: false, code: 'forbidden', hasToken }
    if (status === 413) return { ok: false, code: 'too_many_files', hasToken }
    return { ok: false, code: 'unknown', hasToken }

  } catch (err) {
    const hasToken = Boolean(token)
    if ((err as Error).name === 'AbortError') return { ok: false, code: 'network', hasToken }
    return { ok: false, code: 'network', hasToken }
  }
}
