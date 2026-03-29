/**
 * GitSnip — Main UI
 *
 * Implements the 5-state conversion flow:
 *   idle → parsed → loading → success → error
 *
 * Accessibility: aria-live regions, focus management, keyboard nav,
 *   prefers-reduced-motion, semantic landmarks.
 * i18n: all strings via t() from i18n.js.
 *
 * @module main
 */

import { parseUrl, buildSnipUrl, formatRepoInfo, zipFilename, buildArchiveUrl } from './parse-url.js'
import { fetchFiles } from './github.js'
import { createZip, downloadBlob, formatBytes } from './zip.js'
import { t, applyI18n } from './i18n.js'
import { mountAllAds } from './ads.js'
import { renderLayout } from './layout.js'
import { initTheme } from './theme.js'

// ─── Constants ───────────────────────────────────────────────────────────────

const API_BASE = 'https://api.gitsnip.cc'
const SITE_BASE = 'https://gitsnip.cc'

// Phase 2: set > 0 to add artificial Free-tier queue delay (ms)
const FREE_TIER_DELAY_MS = 0

// Free-tier file count cap
const FREE_FILE_LIMIT = 50

// ─── State ────────────────────────────────────────────────────────────────────

/** @type {'idle'|'parsed'|'loading'|'success'|'error'} */
let appState = 'idle'

/** @type {{ owner:string, repo:string, branch:string, path:string } | null} */
let parsedInfo = null

/** @type {Blob | null} */
let zipBlob = null

/** @type {string} — set for full-repo downloads (GitHub archive URL) */
let archiveUrl = ''

/** @type {string} — tracks the URL currently being prefetched; stale responses are ignored */
let pendingInfoUrl = ''

/** @type {string} */
let zipName = ''

/** @type {number} */
let downloadStartTime = 0

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const urlInput      = /** @type {HTMLInputElement}  */ (document.getElementById('url-input'))
const clearBtn      = /** @type {HTMLButtonElement} */ (document.getElementById('clear-btn'))
const downloadBtn   = /** @type {HTMLButtonElement} */ (document.getElementById('download-btn'))
const copyLinkBtn   = /** @type {HTMLButtonElement} */ (document.getElementById('copy-link-btn'))
const tokenInput    = /** @type {HTMLInputElement}  */ (document.getElementById('token-input'))
const tokenToggle   = /** @type {HTMLButtonElement} */ (document.getElementById('token-toggle'))
const tokenPanel    = /** @type {HTMLElement}       */ (document.getElementById('token-panel'))
const tokenClearBtn = /** @type {HTMLButtonElement} */ (document.getElementById('token-clear-btn'))
const detectedBox   = /** @type {HTMLElement}       */ (document.getElementById('detected-box'))
const detectedLabel = /** @type {HTMLElement}       */ (document.getElementById('detected-label'))
const detectedMeta  = /** @type {HTMLElement}       */ (document.getElementById('detected-meta'))
const progressBar   = /** @type {HTMLElement}       */ (document.getElementById('progress-bar'))
const progressFill  = /** @type {HTMLElement}       */ (document.getElementById('progress-fill'))
const progressText  = /** @type {HTMLElement}       */ (document.getElementById('progress-text'))
const statusRegion  = /** @type {HTMLElement}       */ (document.getElementById('status-region'))
const resultPanel   = /** @type {HTMLElement}       */ (document.getElementById('result-panel'))
const resultSummary = /** @type {HTMLElement}       */ (document.getElementById('result-summary'))
const downloadZipBtn= /** @type {HTMLButtonElement} */ (document.getElementById('download-zip-btn'))
const cliHint       = /** @type {HTMLElement}       */ (document.getElementById('cli-hint'))
const proPanel      = /** @type {HTMLElement}       */ (document.getElementById('pro-panel'))
const errorPanel    = /** @type {HTMLElement}       */ (document.getElementById('error-panel'))
const errorMsg      = /** @type {HTMLElement}       */ (document.getElementById('error-msg'))
const errorHint     = /** @type {HTMLElement}       */ (document.getElementById('error-hint'))
const retryBtn         = /** @type {HTMLButtonElement} */ (document.getElementById('retry-btn'))
const urlInvalidHint   = /** @type {HTMLElement}       */ (document.getElementById('url-invalid-hint'))

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Announce a message to screen readers via the live region. */
function announce(msg) {
  statusRegion.textContent = ''
  // Force re-render before setting text so repeat announcements fire
  requestAnimationFrame(() => { statusRegion.textContent = msg })
}

/** Read token from input (or localStorage fallback). */
function getToken() {
  return tokenInput.value.trim() || localStorage.getItem('gitsnip_token') || ''
}

/** Save token to localStorage when non-empty; show/hide the clear button. */
function persistToken(value) {
  if (value) {
    localStorage.setItem('gitsnip_token', value)
    tokenClearBtn.hidden = false
  } else {
    localStorage.removeItem('gitsnip_token')
    tokenClearBtn.hidden = true
  }
}

/** Clear the saved token from input and localStorage. */
function clearToken() {
  tokenInput.value = ''
  persistToken('')
  tokenInput.focus()
}

/** Check if the user prefers reduced motion. */
const prefersReducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Animate progress bar to a target percentage. */
function setProgress(pct) {
  progressFill.style.width = `${pct}%`
  if (!prefersReducedMotion) {
    progressFill.style.transition = 'width 0.2s ease'
  }
  progressFill.setAttribute('aria-valuenow', String(Math.round(pct)))
}

// ─── State machine ────────────────────────────────────────────────────────────

/**
 * Transition the UI to a new state.
 * @param {'idle'|'parsed'|'loading'|'success'|'error'} newState
 * @param {object} [data]
 */
function setState(newState, data = {}) {
  appState = newState

  // Reset visibility
  detectedBox.hidden       = true
  progressBar.hidden       = true
  proPanel.hidden          = true
  resultPanel.hidden       = true
  errorPanel.hidden        = true
  clearBtn.hidden          = true
  copyLinkBtn.disabled     = true
  copyLinkBtn.hidden       = true
  urlInvalidHint.hidden    = true
  urlInvalidHint.textContent = ''

  downloadBtn.disabled = newState === 'loading' || newState === 'success'
  downloadBtn.setAttribute('aria-busy', newState === 'loading' ? 'true' : 'false')

  if (newState === 'idle') {
    downloadBtn.textContent = t('btn.download')
    urlInput.disabled = false
    urlInput.focus()
    pendingInfoUrl = ''
    detectedMeta.textContent = ''
    detectedMeta.classList.remove('warn')
  }

  if (newState === 'parsed') {
    detectedBox.hidden  = false
    clearBtn.hidden     = false
    copyLinkBtn.disabled = false
    copyLinkBtn.hidden   = false
    urlInput.disabled = false
    if (parsedInfo) {
      detectedLabel.textContent = formatRepoInfo(parsedInfo)
      downloadBtn.textContent = parsedInfo.type === 'repo'
        ? t('btn.download.repo')
        : t('btn.download')
    }
  }

  if (newState === 'loading') {
    detectedBox.hidden  = false
    progressBar.hidden  = false
    proPanel.hidden     = false
    clearBtn.hidden     = false
    urlInput.disabled   = true
    downloadBtn.textContent = t('loading.preparing')
    setProgress(0)
    progressText.textContent = ''
    announce(t('loading.preparing'))
  }

  if (newState === 'success') {
    detectedBox.hidden  = false
    resultPanel.hidden  = false
    proPanel.hidden     = false
    clearBtn.hidden     = false
    copyLinkBtn.disabled = false
    copyLinkBtn.hidden   = false
    urlInput.disabled   = false

    if (data.isRepo) {
      resultSummary.textContent = t('success.repo_summary')
      // Archive download already triggered — no auto-trigger needed
    } else {
      const elapsed = ((Date.now() - downloadStartTime) / 1000).toFixed(1)
      const fileCount = data.fileCount ?? 0
      const size = formatBytes(data.totalBytes ?? 0)
      resultSummary.textContent = t('success.summary', {
        count: fileCount,
        size,
        seconds: elapsed,
      })
      // Auto-trigger the download dialog
      if (zipBlob) downloadBlob(zipBlob, zipName)
    }

    // Show CLI hint
    if (parsedInfo) {
      const cliUrl = `${parsedInfo.owner}/${parsedInfo.repo}/${parsedInfo.path || ''}`
        .replace(/\/$/, '')
      cliHint.textContent = `npx gitsnip https://github.com/${cliUrl}`
    }

    announce(t('success.ready'))
    downloadZipBtn.focus()
  }

  if (newState === 'error') {
    detectedBox.hidden  = parsedInfo === null
    clearBtn.hidden     = false
    urlInput.disabled   = false

    const code = data.code || 'default'
    errorMsg.textContent  = data.message || t('error.title')
    errorHint.textContent = t(`error.hint.${code}`) || t('error.hint.default')
    errorPanel.hidden     = false

    announce(`${t('error.title')}: ${errorMsg.textContent}`)
    retryBtn.focus()
  }
}

// ─── File tree prefetch ───────────────────────────────────────────────────────

/**
 * Prefetch /v1/info for a folder URL and show "N files · X MB" in detected-meta.
 * Silently ignored on error; stale responses (URL changed mid-flight) are discarded.
 */
async function fetchAndShowInfo(info) {
  if (info.type !== 'folder') return

  const infoUrl = info.originalUrl
  pendingInfoUrl = infoUrl
  detectedMeta.textContent = ''
  detectedMeta.classList.remove('warn')

  try {
    const token = getToken()
    const headers = token ? { 'X-GitHub-Token': token } : {}
    const res = await fetch(
      `${API_BASE}/v1/info?url=${encodeURIComponent(info.originalUrl)}`,
      { headers },
    )
    if (pendingInfoUrl !== infoUrl) return
    if (!res.ok) return

    const data = await res.json()
    if (pendingInfoUrl !== infoUrl) return

    const size = formatBytes(data.totalSize)
    if (data.fileCount > FREE_FILE_LIMIT) {
      detectedMeta.textContent = t('parsed.meta.over_limit', { count: data.fileCount, limit: FREE_FILE_LIMIT })
      detectedMeta.classList.add('warn')
    } else {
      detectedMeta.textContent = t('parsed.meta', { count: data.fileCount, size })
      detectedMeta.classList.remove('warn')
    }
  } catch {
    // Network errors are silently swallowed — meta stays empty
  }
}

// ─── URL handling ─────────────────────────────────────────────────────────────

/** Parse the input value and update state. */
function handleUrlChange() {
  const raw = urlInput.value.trim()
  if (!raw) { setState('idle'); parsedInfo = null; return }

  const info = parseUrl(raw)
  if (info) {
    parsedInfo = info
    setState('parsed')
    fetchAndShowInfo(info)
  } else {
    // Not a valid GitHub tree URL — keep idle, show hint and clear button
    if (appState !== 'idle') setState('idle')
    parsedInfo = null
    clearBtn.hidden = false
    urlInvalidHint.textContent = 'Not a GitHub directory URL (needs /tree/branch/path)'
    urlInvalidHint.hidden = false
  }
}

// ─── Download flow ────────────────────────────────────────────────────────────

async function startDownload() {
  if (!parsedInfo) return
  if (appState === 'loading') return

  const info = parsedInfo
  const token = getToken()

  // ── Full repo download: redirect to GitHub archive, no JS zip needed ─────────
  if (info.type === 'repo') {
    archiveUrl = buildArchiveUrl(info)
    zipName    = zipFilename(info)
    downloadStartTime = Date.now()
    zipBlob    = null
    const a = document.createElement('a')
    a.href = archiveUrl
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setState('success', { isRepo: true })
    return
  }

  setState('loading')
  downloadStartTime = Date.now()
  zipBlob = null
  archiveUrl = ''

  try {
    // Phase 2: Free-tier artificial delay (currently 0)
    if (FREE_TIER_DELAY_MS > 0) {
      await new Promise(r => setTimeout(r, FREE_TIER_DELAY_MS))
    }

    progressText.textContent = t('loading.fetching')

    let fileCount = 0
    const files = await fetchFiles(info, token, (done, total) => {
      fileCount = total
      const pct = (done / total) * 85 // reserve last 15% for zipping
      setProgress(pct)
      progressText.textContent = t('loading.progress', { done, total })
      announce(t('loading.progress', { done, total }))
    })

    if (files.length > FREE_FILE_LIMIT) {
      const err = new Error(t('error.msg.FILE_LIMIT', { count: files.length, limit: FREE_FILE_LIMIT }))
      err.code = 'FILE_LIMIT'
      throw err
    }

    const totalBytes = files.reduce((sum, f) => sum + f.data.byteLength, 0)

    progressText.textContent = t('loading.zipping')
    announce(t('loading.zipping'))

    zipName = zipFilename(info)
    zipBlob = await createZip(files, info.path, (pct) => {
      setProgress(85 + pct * 0.15)
    })

    setProgress(100)
    setState('success', { fileCount, totalBytes })

  } catch (err) {
    setState('error', {
      message: err.message || String(err),
      code: err.code || 'default',
    })
  }
}

// ─── Copy link ────────────────────────────────────────────────────────────────

async function copyLink() {
  if (!parsedInfo) return

  const link = buildSnipUrl(parsedInfo, SITE_BASE)

  let copied = false
  try {
    await navigator.clipboard.writeText(link)
    copied = true
  } catch {
    // Fallback: temporary textarea + execCommand
    try {
      const ta = document.createElement('textarea')
      ta.value = link
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
      document.body.appendChild(ta)
      ta.select()
      copied = document.execCommand('copy')
      document.body.removeChild(ta)
    } catch {
      prompt('Copy this link:', link)
    }
  }

  if (copied) {
    const orig = copyLinkBtn.textContent
    copyLinkBtn.textContent = t('btn.copy_link.copied')
    copyLinkBtn.setAttribute('aria-label', t('btn.copy_link.copied'))
    setTimeout(() => {
      copyLinkBtn.textContent = orig
      copyLinkBtn.setAttribute('aria-label', t('btn.copy_link'))
    }, 2000)
  }
}

// ─── Re-download (after success) ─────────────────────────────────────────────

function reDownload() {
  if (zipBlob) {
    downloadBlob(zipBlob, zipName)
  } else if (archiveUrl) {
    const a = document.createElement('a')
    a.href = archiveUrl
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
}

// ─── Token panel ──────────────────────────────────────────────────────────────

function toggleTokenPanel() {
  const isOpen = tokenPanel.hidden === false
  tokenPanel.hidden = isOpen
  tokenToggle.setAttribute('aria-expanded', String(!isOpen))
  if (!isOpen) tokenInput.focus()
}

// ─── Auto-detect GitSnip URL path ────────────────────────────────────────────
// When someone visits gitsnip.cc/owner/repo/tree/branch/path, auto-fill + download.

function checkUrlPath() {
  const path = window.location.pathname
  if (path === '/' || path === '') return

  // Match /owner/repo/tree/branch[/path]
  if (/^\/[^/]+\/[^/]+\/tree\/.+/.test(path)) {
    const githubUrl = 'https://github.com' + path
    urlInput.value = githubUrl
    handleUrlChange()
    if (parsedInfo) {
      // Brief delay so the page renders before triggering download
      setTimeout(startDownload, 300)
    }
  }
}

// ─── Event listeners ──────────────────────────────────────────────────────────

urlInput.addEventListener('input', handleUrlChange)
urlInput.addEventListener('paste', () => setTimeout(handleUrlChange, 0))

urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && parsedInfo) startDownload()
  if (e.key === 'Escape') { urlInput.value = ''; setState('idle'); parsedInfo = null }
})

downloadBtn.addEventListener('click', startDownload)
copyLinkBtn.addEventListener('click', copyLink)
downloadZipBtn.addEventListener('click', reDownload)
retryBtn.addEventListener('click', () => { setState('parsed'); parsedInfo && setState('parsed') })

clearBtn.addEventListener('click', () => {
  urlInput.value = ''
  parsedInfo = null
  zipBlob = null
  archiveUrl = ''
  urlInvalidHint.hidden = true
  urlInvalidHint.textContent = ''
  setState('idle')
})

tokenToggle.addEventListener('click', toggleTokenPanel)
tokenInput.addEventListener('change', () => persistToken(tokenInput.value.trim()))
tokenClearBtn.addEventListener('click', clearToken)

// Close token panel on Escape
tokenPanel.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { tokenPanel.hidden = true; tokenToggle.focus() }
})

// ─── Init ─────────────────────────────────────────────────────────────────────

// Render shared header + footer, then init theme toggle
renderLayout()
initTheme()

// Restore saved token and show clear button if one exists
const savedToken = localStorage.getItem('gitsnip_token')
if (savedToken) {
  tokenInput.value = savedToken
  tokenClearBtn.hidden = false
}

// Check if navigated directly to a gitsnip path URL
checkUrlPath()

// Localize all static strings in HTML (data-i18n, data-i18n-placeholder, data-i18n-label)
applyI18n()

// Mount ads into all .ad-slot containers
mountAllAds()
