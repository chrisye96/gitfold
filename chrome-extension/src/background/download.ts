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
 * Trigger a download from a Blob fetched in the service worker.
 *
 * MV3 service workers don't reliably support URL.createObjectURL —
 * even when it exists, the blob URL is often inaccessible to Chrome's
 * download manager (different execution context). So we always use a
 * base64 data URL, which works universally.
 */
async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 = btoa(binary)
  // Use application/octet-stream so Chrome treats it as a binary download
  // and respects the filename parameter (text/* types may get renamed).
  const dataUrl = `data:application/octet-stream;base64,${base64}`
  await chrome.downloads.download({ url: dataUrl, filename, saveAs: false })
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
          // Raw file: let Chrome's download manager fetch directly — no need
          // to fetch+blob in the service worker. This avoids data URL issues
          // where Chrome ignores the filename parameter.
          const rawUrl = `https://raw.githubusercontent.com/${info.owner}/${info.repo}/${info.branch}/${item.path}`
          const filename = item.path.split('/').pop() || 'file'
          await chrome.downloads.download({ url: rawUrl, filename, saveAs: false })
          successCount++
        } else {
          // Folder download via GitFold API
          const treeUrl = `https://github.com/${info.owner}/${info.repo}/tree/${info.branch}/${item.path}`
          const apiUrl = `${API_BASE}/v1/download?url=${encodeURIComponent(treeUrl)}`
          const response = await fetchWithRetry(apiUrl, headers)
          if (response.ok) {
            const blob = await response.blob()
            const safePath = item.path.replace(/\//g, '-')
            const filename = `${info.owner}-${info.repo}-${safePath}.zip`
            await downloadBlob(blob, filename)
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
      const safePath = info.path.replace(/\//g, '-') || 'root'
      const filename = `${info.owner}-${info.repo}-${safePath}.zip`

      await downloadBlob(blob, filename)

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
