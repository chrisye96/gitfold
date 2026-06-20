/**
 * GitFold — Main UI
 *
 * Inline feedback state machine:
 *   idle → valid → loading → success/error
 *
 * All feedback renders in a single zone below the input.
 *
 * @module main
 */

import { parseUrl, buildSnipUrl, formatRepoInfo, zipFilename, buildArchiveUrl } from './parse-url.js'
import { fetchTree, fetchDefaultBranch, getTierConfig, getRawUrl } from './github.js'
import { createZip, downloadBlob, formatBytes } from './zip.js'
import { t, applyI18n } from './i18n.js'
import { mountAllAds } from './ads.js'
import { renderLayout } from './layout.js'
import { initTheme } from './theme.js'
import { saveToHistory, getHistory, renderHistory } from './history.js'

// ─── Constants ───────────────────────────────────────────────────────────────

const SITE_BASE = 'https://gitfold.cc'
const API_BASE = 'https://api.gitfold.cc'

// File-count limits (must match worker/wrangler.toml). A user's own GitHub token raises the cap.
const FREE_FILE_LIMIT = 50
const TOKEN_FILE_LIMIT = 200

// ─── State ────────────────────────────────────────────────────────────────────

/** @type {{ owner:string, repo:string, branch:string, path:string } | null} */
let parsedInfo = null

/** @type {boolean} */
let isDownloading = false

/** @type {number} */
let successTimer = 0

/** @type {AbortController | null} */
let downloadController = null

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const urlInput       = /** @type {HTMLInputElement}  */ (document.getElementById('url-input'))
const downloadBtn    = /** @type {HTMLButtonElement} */ (document.getElementById('download-btn'))
const feedback       = /** @type {HTMLElement}       */ (document.getElementById('feedback'))
const feedbackIcon   = /** @type {HTMLElement}       */ (document.getElementById('feedback-icon'))
const feedbackMsg    = /** @type {HTMLElement}       */ (document.getElementById('feedback-msg'))
const feedbackAction = /** @type {HTMLButtonElement} */ (document.getElementById('feedback-action'))
const convertedUrlEl = /** @type {HTMLElement}       */ (document.getElementById('converted-url'))
const copyDomainBtn  = /** @type {HTMLButtonElement} */ (document.getElementById('copy-domain'))
const tokenToggle    = /** @type {HTMLButtonElement} */ (document.getElementById('token-toggle'))
const tokenPanel     = /** @type {HTMLElement}       */ (document.getElementById('token-panel'))
const tokenInput     = /** @type {HTMLInputElement}  */ (document.getElementById('token-input'))
const tokenSaveBtn   = /** @type {HTMLButtonElement} */ (document.getElementById('token-save-btn'))
const tokenClearBtn  = /** @type {HTMLButtonElement} */ (document.getElementById('token-clear-btn'))
const tokenError     = /** @type {HTMLElement}       */ (document.getElementById('token-error'))
const statusRegion   = /** @type {HTMLElement}       */ (document.getElementById('status-region'))
const historySection = /** @type {HTMLElement}       */ (document.getElementById('history-section'))
const historyBody    = /** @type {HTMLElement}       */ (document.getElementById('history-body'))
const historyToggle  = /** @type {HTMLButtonElement} */ (document.getElementById('history-toggle'))
const historyClearBtn = /** @type {HTMLButtonElement} */ (document.getElementById('history-clear-btn'))

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Announce a message to screen readers via the live region. */
function announce(msg) {
  statusRegion.textContent = ''
  requestAnimationFrame(() => { statusRegion.textContent = msg })
}

const TOKEN_FORMAT = /^(gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9]{22}_[A-Za-z0-9]{59})$/

/** Read token from input (or localStorage fallback). */
function getToken() {
  return tokenInput.value.trim() || localStorage.getItem('gitfold_token') || ''
}

/** Update the toggle button text to reflect whether a token is saved. */
function updateTokenToggleText() {
  const hasSaved = !!localStorage.getItem('gitfold_token')
  tokenToggle.textContent = hasSaved ? t('token.toggle.active') : t('token.toggle')
}

/** Show or hide the format error below the input. */
function setTokenError(msg) {
  if (msg) {
    tokenError.textContent = msg
    tokenError.hidden = false
    tokenInput.classList.add('token-input--error')
  } else {
    tokenError.hidden = true
    tokenInput.classList.remove('token-input--error')
  }
}

/** Save token to localStorage when non-empty; show/hide the clear button. */
function persistToken(value) {
  if (value) {
    localStorage.setItem('gitfold_token', value)
    tokenClearBtn.hidden = false
  } else {
    localStorage.removeItem('gitfold_token')
    tokenClearBtn.hidden = true
  }
}

/** Save the current input value, collapse the panel, and update toggle state. */
function saveToken() {
  const value = tokenInput.value.trim()
  if (!value) return
  if (!TOKEN_FORMAT.test(value)) {
    setTokenError(t('token.error.format'))
    tokenInput.focus()
    return
  }
  setTokenError(null)
  persistToken(value)
  tokenPanel.hidden = true
  tokenToggle.setAttribute('aria-expanded', 'false')
  tokenInput.setAttribute('readonly', '')
  updateTokenToggleText()
  tokenToggle.focus()
}

/** Clear the saved token from input and localStorage. */
function clearToken() {
  tokenInput.value = ''
  setTokenError(null)
  tokenSaveBtn.disabled = true
  persistToken('')
  updateTokenToggleText()
  tokenInput.focus()
}

// ─── History panel ────────────────────────────────────────────────────────────

function refreshHistory() {
  const entries = getHistory()
  if (entries.length === 0) {
    historySection.hidden = true
    historyClearBtn.hidden = true
    return
  }
  historySection.hidden = false
  historyClearBtn.hidden = false
  renderHistory(historyBody, (entry) => {
    urlInput.value = entry.url
    handleUrlChange()
    urlInput.focus()
  }, refreshHistory)
}

function toggleHistoryBody() {
  const isExpanded = historyToggle.getAttribute('aria-expanded') === 'true'
  historyBody.hidden = isExpanded
  historyToggle.setAttribute('aria-expanded', String(!isExpanded))
  historyToggle.textContent = isExpanded ? 'Show' : 'Hide'
}

// ─── Feedback system ─────────────────────────────────────────────────────────

/**
 * Show inline feedback below the input.
 * @param {'valid'|'error'|'loading'|'success'|'warning'} type
 * @param {string} msg
 * @param {{ label: string, handler: () => void }} [action]
 */
function showFeedback(type, msg, action) {
  clearTimeout(successTimer)
  feedback.hidden = false
  feedback.dataset.type = type

  if (type === 'loading') {
    feedbackIcon.innerHTML = '<span class="spinner"></span>'
  } else if (type === 'error') {
    feedbackIcon.textContent = '\u2716'
  } else if (type === 'warning') {
    feedbackIcon.textContent = '\u26A0'
  } else {
    feedbackIcon.textContent = '\u2714'
  }

  feedbackMsg.textContent = msg

  if (action) {
    feedbackAction.textContent = action.label
    feedbackAction.onclick = action.handler
    feedbackAction.hidden = false
  } else {
    feedbackAction.hidden = true
    feedbackAction.onclick = null
  }

  announce(msg)
}

function hideFeedback() {
  clearTimeout(successTimer)
  feedback.hidden = true
  feedback.removeAttribute('data-type')
  feedbackIcon.textContent = ''
  feedbackMsg.textContent = ''
  feedbackAction.hidden = true
  feedbackAction.onclick = null
}

// ─── Button helpers ──────────────────────────────────────────────────────────

function resetButton() {
  downloadBtn.innerHTML = ''
  downloadBtn.textContent = parsedInfo?.type === 'repo'
    ? t('btn.download.repo')
    : t('btn.download')
  downloadBtn.disabled = !parsedInfo
  downloadBtn.setAttribute('aria-busy', 'false')
}

function setButtonLoading() {
  downloadBtn.innerHTML = '<span class="spinner"></span> ' + t('btn.downloading')
  downloadBtn.disabled = true
  downloadBtn.setAttribute('aria-busy', 'true')
}

// ─── URL handling ────────────────────────────────────────────────────────────

function handleUrlChange() {
  const raw = urlInput.value.trim()

  if (!raw) {
    parsedInfo = null
    downloadBtn.disabled = true
    downloadBtn.textContent = t('btn.download')
    hideFeedback()
    convertedUrlEl.hidden = true
    convertedUrlEl.textContent = ''
    return
  }

  const info = parseUrl(raw)
  if (info) {
    parsedInfo = info
    resetButton()
    if (info.type === 'repo') {
      showFeedback('warning', t('feedback.repo_warning'))
    } else {
      showFeedback('valid', formatRepoInfo(info))
    }
    convertedUrlEl.textContent = buildSnipUrl(info, SITE_BASE)
    convertedUrlEl.hidden = false
  } else {
    parsedInfo = null
    downloadBtn.disabled = true
    downloadBtn.textContent = t('btn.download')
    showFeedback('error', t('feedback.invalid'))
    convertedUrlEl.hidden = true
    convertedUrlEl.textContent = ''
  }
}

// ─── Download flow ───────────────────────────────────────────────────────────

/** Cancel the current download. */
function cancelDownload() {
  if (downloadController) {
    downloadController.abort()
    downloadController = null
  }
}

async function startDownload() {
  if (!parsedInfo || isDownloading) return

  const info = parsedInfo
  const token = getToken()

  // ── Full repo: resolve default branch if needed, then redirect to GitHub archive ──
  if (info.type === 'repo') {
    // If branch is unknown (bare repo URL), resolve it first
    if (!info.branch) {
      setButtonLoading()
      showFeedback('loading', t('feedback.checking'))
      try {
        info.branch = await fetchDefaultBranch(info, token)
        parsedInfo = info
      } catch (err) {
        showFeedback('error', err.message || t('feedback.default_error'), {
          label: t('feedback.action.retry'), handler: startDownload,
        })
        resetButton()
        return
      }
    }

    const archiveUrl = buildArchiveUrl(info)
    const a = document.createElement('a')
    a.href = archiveUrl
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    showFeedback('success', t('feedback.success'))
    saveToHistory(info, { url: urlInput.value.trim(), fileCount: 0, totalSize: 0, zipName: info.repo })
    refreshHistory()
    resetButton()
    successTimer = setTimeout(() => {
      if (parsedInfo) {
        showFeedback(parsedInfo.type === 'repo' ? 'warning' : 'valid',
          parsedInfo.type === 'repo' ? t('feedback.repo_warning') : formatRepoInfo(parsedInfo))
      }
    }, 2000)
    return
  }

  // ── Folder download ──
  isDownloading = true
  downloadController = new AbortController()
  const { signal } = downloadController

  setButtonLoading()
  urlInput.disabled = true

  const hasToken = !!token
  const fileLimit = hasToken ? TOKEN_FILE_LIMIT : FREE_FILE_LIMIT

  try {
    // ── Step 1: Try SSE server-side download (free for everyone) ──
    // The worker's SSE endpoint streams progress and builds the zip
    // server-side (faster, uses R2 cache). Falls back to client-side on
    // any failure.
    showFeedback('loading', t('feedback.checking'), {
      label: t('feedback.action.cancel'), handler: cancelDownload,
    })
    try {
      const sseOk = await downloadViaSSE(info, token)
      if (sseOk) {
        showFeedback('success', t('feedback.success'))
        saveToHistory(info, { url: urlInput.value.trim(), fileCount: 0, totalSize: 0, zipName: zipFilename(info) })
        refreshHistory()
        successTimer = setTimeout(() => {
          if (parsedInfo) showFeedback('valid', formatRepoInfo(parsedInfo))
        }, 2000)
        return
      }
      // SSE too_large or network error → fall through to client-side
    } catch (err) {
      if (err.name === 'AbortError') {
        showFeedback('error', t('feedback.cancelled'))
        return
      }
      // RATE_LIMITED is terminal; everything else (incl. TOO_MANY_FILES) falls
      // through to the client-side pre-check so the partial-download modal can
      // offer options.
      if (err.code === 'RATE_LIMITED') {
        showFeedback('error', t('feedback.rate_limited'), {
          label: t('feedback.action.add_token'),
          handler() { tokenPanel.hidden = false; tokenToggle.setAttribute('aria-expanded', 'true'); tokenInput.removeAttribute('readonly'); tokenInput.focus() },
        })
        return
      }
      // Other SSE errors → fall through to client-side
    }

    // ── Step 2: Pre-check — fetch tree to get file count before downloading ──
    showFeedback('loading', t('feedback.checking'), {
      label: t('feedback.action.cancel'), handler: cancelDownload,
    })

    const tree = await fetchTree(info, token, { signal })
    const fileCount = tree.length
    const totalSize = tree.reduce((sum, f) => sum + (f.size || 0), 0)

    // Check against tier-based file limit BEFORE downloading
    if (fileCount > fileLimit) {
      showUpgradeModal(fileCount, fileLimit, hasToken, () => {
        // User chose to download partial — re-enter with slice
        downloadFilesFromTree(tree.slice(0, fileLimit), info, signal, fileCount)
      })
      return
    }

    // Show file count to user
    showFeedback('valid', t('feedback.file_count', { count: fileCount, size: formatBytes(totalSize) }), {
      label: t('feedback.action.cancel'), handler: cancelDownload,
    })

    // ── Step 3: Download file contents ──
    await downloadFilesFromTree(tree, info, signal)

  } catch (err) {
    if (err.name === 'AbortError') {
      showFeedback('error', t('feedback.cancelled'))
      return
    }

    const code = err.code || 'default'
    const errorMap = {
      RATE_LIMITED: {
        msg: t('feedback.rate_limited'),
        action: {
          label: t('feedback.action.add_token'),
          handler() { tokenPanel.hidden = false; tokenToggle.setAttribute('aria-expanded', 'true'); tokenInput.removeAttribute('readonly'); tokenInput.focus() },
        },
      },
      NOT_FOUND: {
        msg: t('feedback.not_found'),
        action: { label: t('feedback.action.retry'), handler: startDownload },
      },
      UNAUTHORIZED: {
        msg: t('feedback.unauthorized'),
        action: {
          label: t('feedback.action.update_token'),
          handler() { tokenPanel.hidden = false; tokenToggle.setAttribute('aria-expanded', 'true'); tokenInput.removeAttribute('readonly'); tokenInput.focus() },
        },
      },
      TOO_MANY_FILES: {
        msg: err.message || `Too many files (limit: ${fileLimit}).`,
        action: hasToken
          ? { label: t('feedback.action.retry'), handler: startDownload }
          : { label: t('feedback.action.add_token'), handler() { tokenPanel.hidden = false; tokenToggle.setAttribute('aria-expanded', 'true'); tokenInput.removeAttribute('readonly'); tokenInput.focus() } },
      },
      default: {
        msg: err.message || t('feedback.default_error'),
        action: { label: t('feedback.action.retry'), handler: startDownload },
      },
    }

    const entry = errorMap[code] || errorMap.default
    showFeedback('error', entry.msg, entry.action)

  } finally {
    isDownloading = false
    downloadController = null
    urlInput.disabled = false
    resetButton()
  }
}

/**
 * Download files from an already-fetched tree, zip, and trigger browser download.
 * @param {Array<{ path: string, size: number, sha: string }>} tree
 * @param {{ owner: string, repo: string, branch: string, path: string }} info
 * @param {AbortSignal} signal
 * @param {number} [originalCount] - Original total file count (if partial download)
 */
async function downloadFilesFromTree(tree, info, signal, originalCount) {
  const { concurrency, delayMs } = getTierConfig()
  const total = tree.length
  let done = 0

  /** @type {Array<{ path: string, data: ArrayBuffer }>} */
  const results = new Array(total)

  for (let i = 0; i < total; i += concurrency) {
    const batch = tree.slice(i, i + concurrency)
    await Promise.all(batch.map(async (entry, j) => {
      const url = getRawUrl(entry.path, info)
      const res = await fetch(url, { signal })
      if (!res.ok) {
        const err = new Error(`Failed to fetch ${entry.path} (HTTP ${res.status})`)
        err.code = 'FETCH_ERROR'
        throw err
      }
      results[i + j] = { path: entry.path, data: await res.arrayBuffer() }
      done++
      showFeedback('loading', t('feedback.downloading_progress', { done, total }), {
        label: t('feedback.action.cancel'), handler: cancelDownload,
      })
    }))
    if (delayMs > 0 && i + concurrency < total) {
      await new Promise(r => setTimeout(r, delayMs))
    }
  }

  const zipName = zipFilename(info)
  const zipBlob = await createZip(results, info.path, () => {})
  downloadBlob(zipBlob, zipName)

  const isPartial = originalCount != null && originalCount > total
  showFeedback('success', isPartial
    ? `Downloaded ${total} files (partial).`
    : t('feedback.success'))

  // Save to download history
  const totalSize = results.reduce((s, f) => s + (f.data?.byteLength || 0), 0)
  saveToHistory(info, {
    url: urlInput.value.trim(),
    fileCount: total,
    totalSize,
    zipName,
  })
  refreshHistory()

  successTimer = setTimeout(() => {
    if (parsedInfo) showFeedback('valid', formatRepoInfo(parsedInfo))
  }, 2000)
}

// ─── SSE progress download ────────────────────────────────────────────────────

/**
 * Download a folder via the worker's SSE progress endpoint.
 * Falls back to client-side download on error.
 *
 * @param {{ owner:string, repo:string, branch:string, path:string }} info
 * @param {string} token - GitHub PAT (may be empty)
 * @returns {Promise<boolean>} true = SSE succeeded; false = should fall back
 */
async function downloadViaSSE(info, token) {
  const githubUrl = urlInput.value.trim()
  const headers = {}
  if (token) headers['X-GitHub-Token'] = token

  let res
  try {
    res = await fetch(
      `${API_BASE}/v1/download/progress?url=${encodeURIComponent(githubUrl)}`,
      { headers, credentials: 'include', signal: downloadController?.signal },
    )
  } catch (err) {
    if (err.name === 'AbortError') throw err
    return false  // network error — fall back
  }

  if (!res.ok || !res.body) return false

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // Parse SSE events (each ends with \n\n)
    let sep
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const chunk = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)

      // Extract data line
      const dataLine = chunk.split('\n').find(l => l.startsWith('data: '))
      if (!dataLine) continue
      let event
      try { event = JSON.parse(dataLine.slice(6)) } catch { continue }

      if (event.type === 'tree') {
        showFeedback('loading',
          t('feedback.file_count', { count: event.count, size: formatBytes(event.size) }),
          { label: t('feedback.action.cancel'), handler: cancelDownload })
      } else if (event.type === 'progress') {
        showFeedback('loading',
          t('feedback.downloading_progress', { done: event.done, total: event.total }),
          { label: t('feedback.action.cancel'), handler: cancelDownload })
      } else if (event.type === 'zipping') {
        showFeedback('loading', 'Creating zip…')
      } else if (event.type === 'done') {
        // Fetch the finished zip and save it via a same-origin blob URL.
        // A cross-origin <a download> has its filename dropped by Chrome (the
        // file saves as "download"), so we re-download the bytes and let
        // downloadBlob name it from the same-origin blob: URL.
        const resultRes = await fetch(`${API_BASE}/v1/download/result?jobId=${encodeURIComponent(event.jobId)}`)
        if (!resultRes.ok) return false  // job expired/error → fall back to client-side
        const blob = await resultRes.blob()
        const name = event.filename
          ? (event.filename.endsWith('.zip') ? event.filename : event.filename + '.zip')
          : zipFilename(info)
        downloadBlob(blob, name)
        return true
      } else if (event.type === 'too_large') {
        return false  // fall back to client-side
      } else if (event.type === 'error') {
        const err = new Error(event.message || t('feedback.default_error'))
        err.code = event.code || 'INTERNAL_ERROR'
        throw err
      }
    }
  }

  return false
}

// ─── Upgrade modal ──────────────────────────────────────────────────────────

function showUpgradeModal(fileCount, limit, hasToken, onPartialDownload) {
  // Remove existing modal if any
  document.getElementById('upgrade-modal')?.remove()

  const modal = document.createElement('div')
  modal.id = 'upgrade-modal'
  modal.className = 'upgrade-modal-overlay'
  modal.innerHTML = `
    <div class="upgrade-modal">
      <button class="upgrade-modal-close" aria-label="Close">&times;</button>
      <h3>Large folder detected (${fileCount} files)</h3>
      <p class="upgrade-modal-count">${hasToken ? 'With token' : 'Free'}: up to ${limit} files</p>
      <div class="upgrade-modal-actions">
        <button class="btn btn--primary" data-action="partial">
          Download ${Math.min(fileCount, limit)} files
        </button>
        ${!hasToken ? `<button class="btn btn--secondary" data-action="token">
          Add a GitHub token for a higher limit (free)
        </button>` : ''}
      </div>
      ${hasToken ? '<p class="upgrade-modal-hint">For larger folders, try a smaller subdirectory or git sparse-checkout.</p>' : ''}
    </div>
  `

  document.body.appendChild(modal)

  // Close button
  modal.querySelector('.upgrade-modal-close').addEventListener('click', () => {
    modal.remove()
    isDownloading = false
    urlInput.disabled = false
    resetButton()
    if (parsedInfo) showFeedback('valid', formatRepoInfo(parsedInfo))
  })

  // Partial download
  modal.querySelector('[data-action="partial"]')?.addEventListener('click', () => {
    modal.remove()
    onPartialDownload()
  })

  // Add token manually
  modal.querySelector('[data-action="token"]')?.addEventListener('click', () => {
    modal.remove()
    isDownloading = false
    urlInput.disabled = false
    resetButton()
    tokenPanel.hidden = false
    tokenToggle.setAttribute('aria-expanded', 'true')
    tokenInput.removeAttribute('readonly')
    tokenInput.focus()
  })

  // Click overlay to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.querySelector('.upgrade-modal-close').click()
    }
  })
}

// ─── Token panel ─────────────────────────────────────────────────────────────

function toggleTokenPanel() {
  const isOpen = tokenPanel.hidden === false
  tokenPanel.hidden = isOpen
  tokenToggle.setAttribute('aria-expanded', String(!isOpen))
  if (!isOpen) {
    tokenInput.removeAttribute('readonly')
    tokenInput.focus()
  } else {
    tokenInput.setAttribute('readonly', '')
  }
}

// ─── Auto-detect GitFold URL path ────────────────────────────────────────────

function checkUrlPath() {
  const path = window.location.pathname
  if (path === '/' || path === '') return

  if (/^\/[^/]+\/[^/]+\/tree\/.+/.test(path)) {
    const githubUrl = 'https://github.com' + path
    urlInput.value = githubUrl
    handleUrlChange()
    if (parsedInfo) {
      setTimeout(startDownload, 300)
    }
  }
}

// ─── Event listeners ─────────────────────────────────────────────────────────

urlInput.addEventListener('input', handleUrlChange)
urlInput.addEventListener('paste', () => setTimeout(handleUrlChange, 0))

urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && parsedInfo) startDownload()
  if (e.key === 'Escape') {
    urlInput.value = ''
    parsedInfo = null
    downloadBtn.disabled = true
    downloadBtn.textContent = t('btn.download')
    hideFeedback()
    convertedUrlEl.hidden = true
  }
})

downloadBtn.addEventListener('click', startDownload)

copyDomainBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText('gitfold.cc')
  } catch {
    // Fallback
    const ta = document.createElement('textarea')
    ta.value = 'gitfold.cc'
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  copyDomainBtn.dataset.copied = ''
  const code = copyDomainBtn.querySelector('code')
  const orig = code.textContent
  code.textContent = 'Copied!'
  setTimeout(() => {
    code.textContent = orig
    delete copyDomainBtn.dataset.copied
  }, 1500)
})

tokenToggle.addEventListener('click', toggleTokenPanel)
tokenSaveBtn.addEventListener('click', saveToken)
tokenClearBtn.addEventListener('click', clearToken)

tokenInput.addEventListener('input', () => {
  const hasValue = tokenInput.value.trim().length > 0
  tokenSaveBtn.disabled = !hasValue
  if (tokenError.hidden === false) setTokenError(null)
})

tokenInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); saveToken() }
})

tokenPanel.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { tokenPanel.hidden = true; tokenToggle.setAttribute('aria-expanded', 'false'); tokenInput.setAttribute('readonly', ''); updateTokenToggleText(); tokenToggle.focus() }
})

historyClearBtn.addEventListener('click', () => {
  clearHistory()
  refreshHistory()
})

historyToggle.addEventListener('click', toggleHistoryBody)

// ─── Init ────────────────────────────────────────────────────────────────────

renderLayout()
initTheme()

// Restore saved token
const savedToken = localStorage.getItem('gitfold_token')
if (savedToken) {
  tokenInput.value = savedToken
  tokenSaveBtn.disabled = false
  tokenClearBtn.hidden = false
  updateTokenToggleText()
}

checkUrlPath()
applyI18n()
mountAllAds()
refreshHistory()

