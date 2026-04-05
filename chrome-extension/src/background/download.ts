import type { RepoInfo } from '../shared/types'

const API_BASE = 'https://api.gitfold.cc'
const TIMEOUT_MS = 30_000

export interface DownloadResult {
  ok: boolean
  code?: 'rate_limited' | 'not_found' | 'forbidden' | 'network' | 'too_many_files' | 'unknown'
  hasToken?: boolean
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
export async function handleDownload(url: string, info: RepoInfo): Promise<DownloadResult> {
  // Full repo: redirect to GitHub's native archive (zero cost, no bandwidth)
  if (info.type === 'repo') {
    const branch = info.branch || 'HEAD'
    const archiveUrl = `https://github.com/${info.owner}/${info.repo}/archive/refs/heads/${branch}.zip`
    await chrome.tabs.create({ url: archiveUrl, active: false })
    return { ok: true }
  }

  // Read optional token from storage
  const { github_token: token } = await chrome.storage.local.get('github_token') as { github_token?: string }

  // Fetch zip from GitFold API with a 30s timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const apiUrl = `${API_BASE}/v1/download?url=${encodeURIComponent(url)}`
    const headers: Record<string, string> = { 'X-Client': 'extension' }
    if (token) headers['X-GitHub-Token'] = token

    const response = await fetch(apiUrl, { signal: controller.signal, headers })

    if (response.ok) {
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const safePath = info.path.replace(/\//g, '-') || 'root'
      const filename = `${info.owner}-${info.repo}-${safePath}.zip`

      await chrome.downloads.download({ url: blobUrl, filename, saveAs: false })
      // Revoke after delay to let the download manager copy the bytes
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)

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
  } finally {
    clearTimeout(timeoutId)
  }
}
