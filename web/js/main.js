/**
 * GitSnip — Main UI
 *
 * Inline feedback state machine:
 *   idle → valid → loading → success/error
 *
 * All feedback renders in a single zone below the input.
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
import { getSubToken, getFileLimit, isProUser, handleCheckoutReturn, verifySubscription } from './subscription.js'

// ─── Constants ───────────────────────────────────────────────────────────────

const SITE_BASE = 'https://gitsnip.cc'
const API_BASE = 'https://api.gitsnip.cc'

// ─── State ────────────────────────────────────────────────────────────────────

/** @type {{ owner:string, repo:string, branch:string, path:string } | null} */
let parsedInfo = null

/** @type {boolean} */
let isDownloading = false

/** @type {number} */
let successTimer = 0

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Announce a message to screen readers via the live region. */
function announce(msg) {
  statusRegion.textContent = ''
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

// ─── Feedback system ─────────────────────────────────────────────────────────

/**
 * Show inline feedback below the input.
 * @param {'valid'|'error'|'loading'|'success'} type
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
    showFeedback('valid', formatRepoInfo(info))
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

async function startDownload() {
  if (!parsedInfo || isDownloading) return

  const info = parsedInfo
  const token = getToken()

  // ── Full repo: redirect to GitHub archive ──
  if (info.type === 'repo') {
    const archiveUrl = buildArchiveUrl(info)
    const a = document.createElement('a')
    a.href = archiveUrl
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    showFeedback('success', t('feedback.success'))
    successTimer = setTimeout(() => {
      if (parsedInfo) showFeedback('valid', formatRepoInfo(parsedInfo))
    }, 2000)
    return
  }

  // ── Folder download ──
  isDownloading = true
  setButtonLoading()
  urlInput.disabled = true
  showFeedback('loading', t('feedback.downloading'))

  const hasToken = !!token
  const fileLimit = getFileLimit(hasToken)

  try {
    const files = await fetchFiles(info, token, () => {})

    // Check against tier-based file limit
    if (files.length > fileLimit) {
      showUpgradeModal(files.length, fileLimit, hasToken, () => {
        // User chose to download partial (up to limit)
        downloadPartial(files.slice(0, fileLimit), info)
      })
      return
    }

    const zipName = zipFilename(info)
    const zipBlob = await createZip(files, info.path, () => {})

    // Trigger browser download
    downloadBlob(zipBlob, zipName)

    // Show success, auto-dismiss after 2s
    showFeedback('success', t('feedback.success'))
    successTimer = setTimeout(() => {
      if (parsedInfo) showFeedback('valid', formatRepoInfo(parsedInfo))
    }, 2000)

  } catch (err) {
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
    urlInput.disabled = false
    resetButton()
  }
}

// ─── Partial download helper ────────────────────────────────────────────────

async function downloadPartial(files, info) {
  try {
    const zipName = zipFilename(info)
    const zipBlob = await createZip(files, info.path, () => {})
    downloadBlob(zipBlob, zipName)
    showFeedback('success', `Downloaded ${files.length} files (partial).`)
    successTimer = setTimeout(() => {
      if (parsedInfo) showFeedback('valid', formatRepoInfo(parsedInfo))
    }, 2000)
  } catch (err) {
    showFeedback('error', err.message || 'Download failed.')
  } finally {
    isDownloading = false
    urlInput.disabled = false
    resetButton()
  }
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
        ${!hasToken ? `<button class="btn btn--secondary" data-action="token">
          Add Token for full access
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

  // Add token
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

// ─── Auto-detect GitSnip URL path ────────────────────────────────────────────

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
    await navigator.clipboard.writeText('gitsnip.cc')
  } catch {
    // Fallback
    const ta = document.createElement('textarea')
    ta.value = 'gitsnip.cc'
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

// ─── Init ────────────────────────────────────────────────────────────────────

renderLayout()
initTheme()

// Restore saved token
const savedToken = localStorage.getItem('gitsnip_token')
if (savedToken) {
  tokenInput.value = savedToken
  tokenClearBtn.hidden = false
}

checkUrlPath()
applyI18n()
mountAllAds()

// Check for checkout return and verify subscription status
handleCheckoutReturn(API_BASE)
if (getSubToken()) {
  verifySubscription(API_BASE)
}
