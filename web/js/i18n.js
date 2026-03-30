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
    'nav.github': 'GitHub',

    // ── Input ─────────────────────────────────────────────────────────
    'input.label': 'GitHub directory URL',
    'input.placeholder': 'https://github.com/owner/repo/tree/branch/path',

    // ── Buttons ───────────────────────────────────────────────────────
    'btn.download': 'Get Files',
    'btn.download.repo': 'Get Repository',
    'btn.downloading': 'Downloading…',

    // ── Token panel ───────────────────────────────────────────────────
    'token.toggle': 'Need higher rate limits? Add a GitHub Token',
    'token.placeholder': 'ghp_xxxxxxxxxxxx  (optional)',
    'token.clear': 'Clear saved token',
    'token.hint': 'Increases rate limit to 5,000 req/hour. Stored in your browser only.',

    // ── Inline feedback ───────────────────────────────────────────────
    'feedback.valid': '{info}',
    'feedback.invalid': 'Not a valid GitHub directory URL',
    'feedback.downloading': 'Downloading…',
    'feedback.success': 'Download started',
    'feedback.rate_limited': 'Rate limit exceeded',
    'feedback.not_found': 'Repository or directory not found',
    'feedback.unauthorized': 'Token expired or invalid',
    'feedback.file_limit': 'Too many files (free limit: {limit})',
    'feedback.network': 'Network error',
    'feedback.default_error': 'Something went wrong',
    'feedback.action.add_token': 'Add GitHub Token',
    'feedback.action.update_token': 'Update Token',
    'feedback.action.retry': 'Try again',

    // ── Footer ────────────────────────────────────────────────────────
    'footer.github': 'GitHub',
    'footer.docs': 'Docs',
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
