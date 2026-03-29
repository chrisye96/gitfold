/**
 * GitSnip — i18n foundation
 * All user-visible strings live here.
 * Phase 1: English only. Phase 3+: swap locale object via setLocale().
 *
 * Usage:
 *   import { t } from './i18n.js'
 *   element.textContent = t('btn.download')
 *
 * To add a new language, copy the `en` object, translate values,
 * then call setLocale('zh', zhStrings).
 *
 * @module i18n
 */

/** @type {Record<string, Record<string, string>>} */
const locales = {
  en: {
    // ── App shell ──────────────────────────────────────────────────────
    'app.title': 'GitSnip',
    'app.tagline': 'Download any GitHub directory. Instantly.',
    'nav.docs': 'Docs',
    'nav.api': 'API',
    'nav.github': 'GitHub',

    // ── Input / idle state ────────────────────────────────────────────
    'input.label': 'GitHub directory URL',
    'input.placeholder': 'https://github.com/owner/repo/tree/branch/path',
    'input.hint': 'Or replace github.com → gitsnip.cc in your browser URL bar',

    // ── Parsed state ──────────────────────────────────────────────────
    'parsed.detected': 'Detected',
    'parsed.files_estimated': 'files (estimated)',
    'parsed.meta': '{count} files · {size}',
    'parsed.meta.over_limit': '⚠ {count} files — exceeds {limit}-file free limit',

    // ── Buttons ───────────────────────────────────────────────────────
    'btn.download': 'Download',
    'btn.download.repo': 'Download repository',
    'btn.copy_link': 'Copy link',
    'btn.copy_link.copied': 'Copied!',
    'btn.clear': 'Clear',

    // ── Token panel ───────────────────────────────────────────────────
    'token.label': 'GitHub Token',
    'token.placeholder': 'ghp_xxxxxxxxxxxx  (optional)',
    'token.clear': 'Clear saved token',
    'token.hint': 'Increases rate limit to 5,000 req/hour. Stored in your browser only.',
    'token.toggle': 'Settings',

    // ── Loading state ─────────────────────────────────────────────────
    'loading.preparing': 'Preparing download…',
    'loading.fetching': 'Fetching files…',
    'loading.zipping': 'Zipping…',
    'loading.progress': '{done} of {total} files',

    // ── Pro upsell (shown during loading + after success) ─────────────
    'pro.skip_queue': 'Pro users skip queue & download instantly',
    'pro.batch': 'Batch download multiple folders at once',
    'pro.cli': 'Use CLI for automation: npx gitsnip <url>',
    'pro.private': 'Access private repositories',
    'pro.upgrade': 'Upgrade to Pro',

    // ── Success state ─────────────────────────────────────────────────
    'success.ready': '✅ Download ready',
    'success.summary': 'Downloaded {count} files ({size}) in {seconds}s',
    'success.repo_summary': 'Your browser is downloading the repository zip.',
    'success.download_zip': 'Download ZIP',
    'success.workflow_hint': 'Use this in your workflow:',

    // ── Error state ───────────────────────────────────────────────────
    'error.title': 'Something went wrong',
    'error.retry': 'Try again',
    'error.msg.FILE_LIMIT': 'This directory has {count} files (free limit: {limit}).',
    'error.hint.FILE_LIMIT': 'Free downloads are limited to 50 files. Upgrade to Pro for larger directories.',
    'error.hint.RATE_LIMITED': 'Add a GitHub Personal Access Token to get 5,000 requests/hour.',
    'error.hint.NOT_FOUND': 'Check that the URL points to an existing directory.',
    'error.hint.UNAUTHORIZED': 'Your GitHub token may be expired or have insufficient permissions.',
    'error.hint.TOO_LARGE': 'This directory is too large. Try a smaller subdirectory.',
    'error.hint.GITHUB_ERROR': 'GitHub may be experiencing issues. Try again in a moment.',
    'error.hint.default': 'Check the URL and try again.',

    // ── Footer ────────────────────────────────────────────────────────
    'footer.made_with': 'Made with ♥ for developers',
    'footer.github': 'GitHub',
    'footer.docs': 'Docs',
    'footer.api': 'API',
  },
}

let currentLocale = 'en'

/**
 * Set the active locale. Strings not in the new locale fall back to English.
 * @param {string} locale  - e.g. 'zh', 'ja'
 * @param {Record<string, string>} strings
 */
export function setLocale(locale, strings) {
  locales[locale] = strings
  currentLocale = locale
}

/**
 * Translate a key with optional variable interpolation.
 *
 * @param {string} key
 * @param {Record<string, string | number>} [vars]
 * @returns {string}
 *
 * @example
 * t('loading.progress', { done: 3, total: 10 }) // "3 of 10 files"
 */
export function t(key, vars) {
  const locale = locales[currentLocale] || {}
  const fallback = locales.en
  let str = locale[key] ?? fallback[key] ?? key

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, String(v))
    }
  }
  return str
}

/** Active locale code, e.g. 'en' */
export function getLocale() {
  return currentLocale
}

/** All available locale codes */
export function getAvailableLocales() {
  return Object.keys(locales)
}

/**
 * Apply i18n translations to all elements with data-i18n* attributes.
 * Call once after the DOM is ready.
 *
 * Supported attributes:
 *   data-i18n             → sets element.textContent
 *   data-i18n-placeholder → sets input.placeholder
 *   data-i18n-label       → sets aria-label attribute
 *
 * @param {Document | Element} [root] - Scope to search within (default: document)
 */
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n')
    if (key) el.textContent = t(key)
  })
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder')
    if (key) /** @type {HTMLInputElement} */ (el).placeholder = t(key)
  })
  root.querySelectorAll('[data-i18n-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-label')
    if (key) el.setAttribute('aria-label', t(key))
  })
}
