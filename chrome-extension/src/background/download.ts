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
export async function handleDownload(
  url: string,
  info: RepoInfo,
  selectedPaths?: string[],
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

  // Multi-path POST (Phase 4: checkbox selection)
  if (selectedPaths && selectedPaths.length > 0) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Client': 'extension',
      }
      if (token) headers['X-GitHub-Token'] = token

      const response = await fetch(`${API_BASE}/v1/download`, {
        method: 'POST',
        signal: controller.signal,
        headers,
        body: JSON.stringify({
          owner: info.owner,
          repo: info.repo,
          branch: info.branch,
          paths: selectedPaths,
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const { url: dlUrl, revoke } = await blobToDownloadUrl(blob)
        const filename = `${info.owner}-${info.repo}-selection.zip`
        await chrome.downloads.download({ url: dlUrl, filename, saveAs: false })
        revoke()
        return { ok: true }
      }

      const hasToken = Boolean(token)
      if (response.status === 429) return { ok: false, code: 'rate_limited', hasToken }
      if (response.status === 404) return { ok: false, code: 'not_found',    hasToken }
      if (response.status === 401 || response.status === 403) return { ok: false, code: 'forbidden', hasToken }
      if (response.status === 413) return { ok: false, code: 'too_many_files', hasToken }
      return { ok: false, code: 'unknown', hasToken }

    } catch (err) {
      const hasToken = Boolean(token)
      if ((err as Error).name === 'AbortError') return { ok: false, code: 'network', hasToken }
      return { ok: false, code: 'network', hasToken }
    } finally {
      clearTimeout(timeoutId)
    }
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
