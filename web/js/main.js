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
import { getSubToken, getFileLimit, isProUser, handleCheckoutReturn, verifySubscription } from './subscription.js'
import { checkSession, handleAuthReturn, isAuthenticated, startGitHubLogin, getCachedSession } from './auth.js'
import { saveToHistory, getHistory, renderHistory } from './history.js'

// ─── Constants ───────────────────────────────────────────────────────────────

const SITE_BASE = 'https://gitfold.cc'
const API_BASE = 'https://api.gitfold.cc'

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
const tokenClearBtn  = /** @type {HTMLButtonElement} */ (document.getElementById('token-clear-btn'))
const statusRegion   = /** @type {HTMLElement}       */ (document.getElementById('status-region'))
const historySection = /** @type {HTMLElement}       */ (document.getElementById('history-section'))
const historyBody    = /** @type {HTMLElement}       */ (document.getElementById('history-body'))
const historyToggle  = /** @type {HTMLButtonElement} */ (document.getElementById('history-toggle'))

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Announce a message to screen readers via the live region. */
function announce(msg) {
  statusRegion.textContent = ''
  requestAnimationFrame(() => { statusRegion.textContent = msg })
}

/** Read token from input (or localStorage fallback). */
function getToken() {
  return tokenInput.value.trim() || localStorage.getItem('gitfold_token') || ''
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

/** Clear the saved token from input and localStorage. */
function clearToken() {
  tokenInput.value = ''
  persistToken('')
  tokenInput.focus()
}

// ─── History panel ────────────────────────────────────────────────────────────

function refreshHistory() {
  const entries = getHistory()
  if (entries.length === 0) {
    historySection.hidden = true
    return
  }
  historySection.hidden = false
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
  const fileLimit = getFileLimit(hasToken)

  try {
    // ── Step 1: Try SSE server-side download (Pro/Power users) ──
    // For authenticated/pro users we can use the worker's SSE endpoint which
    // streams progress and builds the zip server-side (faster, uses R2 cache).
    if (isProUser()) {
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
        // SSE error with a code — show it
        if (err.code) {
          const errorMap = {
            TOO_MANY_FILES: {
              msg: err.message,
              action: { label: 'Upgrade', handler() { window.location.href = '/pricing' } },
            },
            RATE_LIMITED: {
              msg: t('feedback.rate_limited'),
              action: { label: t('feedback.action.add_token'), handler() { tokenPanel.hidden = false; tokenInput.focus() } },
            },
          }
          const entry = errorMap[err.code]
          if (entry) { showFeedback('error', entry.msg, entry.action); return }
        }
        // Unknown SSE error → fall through to client-side
      }
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
          handler() { tokenPanel.hidden = false; tokenToggle.setAttribute('aria-expanded', 'true'); tokenInput.focus() },
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
          handler() { tokenPanel.hidden = false; tokenToggle.setAttribute('aria-expanded', 'true'); tokenInput.focus() },
        },
      },
      TOO_MANY_FILES: {
        msg: err.message || `Too many files (limit: ${fileLimit}).`,
        action: isProUser()
          ? { label: t('feedback.action.retry'), handler: startDownload }
          : { label: 'Get full folder', handler() { window.location.href = '/pricing' } },
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
  const subToken = getSubToken()
  const githubUrl = urlInput.value.trim()
  const headers = {}
  if (token) headers['X-GitHub-Token'] = token
  if (subToken) headers['X-Sub-Token'] = subToken

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
        // Trigger download of the completed zip
        const a = document.createElement('a')
        a.href = `${API_BASE}/v1/download/result?jobId=${encodeURIComponent(event.jobId)}`
        a.download = event.filename ? (event.filename.endsWith('.zip') ? event.filename : event.filename + '.zip') : 'download.zip'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
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
      <p class="upgrade-modal-count">Free${hasToken ? ' + token' : ''}: up to ${limit} files</p>
      <div class="upgrade-modal-tiers">
        <div class="upgrade-modal-tier">
          <strong>${hasToken ? 'With token' : 'Free'}</strong>
          <span>Up to ${limit} files</span>
        </div>
        <div class="upgrade-modal-tier upgrade-modal-tier--pro">
          <strong>Pro</strong>
          <span>Up to 1,000 files</span>
        </div>
      </div>
      <div class="upgrade-modal-actions">
        <button class="btn btn--secondary" data-action="partial">
          Download ${Math.min(fileCount, limit)} files
        </button>
        ${!hasToken && !isAuthenticated() ? `<button class="btn btn--secondary" data-action="github-login">
          Sign in with GitHub
        </button>
        <button class="btn btn--secondary btn--text" data-action="token">
          or paste token manually
        </button>` : ''}
        <a href="/pricing" class="btn btn--primary">
          Get full folder &rarr;
        </a>
      </div>
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

  // GitHub login (OAuth)
  modal.querySelector('[data-action="github-login"]')?.addEventListener('click', () => {
    modal.remove()
    startGitHubLogin(API_BASE)
  })

  // Add token manually
  modal.querySelector('[data-action="token"]')?.addEventListener('click', () => {
    modal.remove()
    isDownloading = false
    urlInput.disabled = false
    resetButton()
    tokenPanel.hidden = false
    tokenToggle.setAttribute('aria-expanded', 'true')
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
  if (!isOpen) tokenInput.focus()
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
tokenInput.addEventListener('change', () => persistToken(tokenInput.value.trim()))
tokenClearBtn.addEventListener('click', clearToken)

tokenPanel.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { tokenPanel.hidden = true; tokenToggle.setAttribute('aria-expanded', 'false'); tokenToggle.focus() }
})

historyToggle.addEventListener('click', toggleHistoryBody)

// ─── Init ────────────────────────────────────────────────────────────────────

renderLayout()
initTheme()

// Restore saved token
const savedToken = localStorage.getItem('gitfold_token')
if (savedToken) {
  tokenInput.value = savedToken
  tokenClearBtn.hidden = false
}

checkUrlPath()
applyI18n()
mountAllAds()
refreshHistory()

// Handle auth return (OAuth callback)
const authResult = handleAuthReturn()
if (authResult?.success) {
  // Refresh session after OAuth login
  checkSession(API_BASE).then(updateUserUI)
}

// Check for checkout return and verify subscription status
handleCheckoutReturn(API_BASE)
if (getSubToken()) {
  verifySubscription(API_BASE)
}

// Check existing session (async, non-blocking)
checkSession(API_BASE).then(updateUserUI)

/**
 * Update UI elements based on session state.
 * @param {object|null} session
 */
function updateUserUI(session) {
  const userMenu = document.getElementById('user-menu')
  if (!userMenu) return

  if (!session?.authenticated) {
    userMenu.hidden = true
    return
  }

  // Show user menu with avatar + login
  userMenu.hidden = false
  userMenu.innerHTML = `
    <span class="user-menu-info" title="${session.email || ''}">
      <span class="user-menu-login">${session.githubLogin}</span>
    </span>
    <button id="logout-btn" class="btn-text user-menu-logout" type="button">Sign out</button>
  `

  // Attach logout handler
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    const { logout } = await import('./auth.js')
    await logout(API_BASE)
    userMenu.hidden = true
    window.location.reload()
  })
}
