/**
 * GitFold — Theme toggle (shared across all pages)
 *
 * Two preference states, cycled on each click:
 *   light → dark → light → …
 *
 * Preferences:
 *   'light'  — force light (data-theme="light")
 *   'dark'   — force dark  (data-theme="dark")
 *   'system' — default on first visit; follows OS, not selectable via toggle
 *
 * Icons:
 *   #icon-sun   shown when effective theme = light
 *   #icon-moon  shown when effective theme = dark
 *
 * @module theme
 */

const STORAGE_KEY = 'gitfold-theme'

/** Cycle order — system is entry point only, not part of the loop */
const NEXT = { light: 'dark', dark: 'light', system: 'dark' }

/** aria-label describes the *next* action on click */
const ARIA_LABEL = {
  light:  'Switch to dark mode',
  dark:   'Switch to light mode',
  system: 'Switch to light mode',
}

/** @returns {'light'|'dark'|'system'} */
function getSaved() {
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'light' || v === 'dark' ? v : 'system'
}

/** Returns the effective visual theme ('light' or 'dark'), resolving 'system'. */
function effectiveTheme(pref) {
  if (pref !== 'system') return pref
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Apply a preference to the DOM (data-theme + icons + aria-label).
 * Does NOT persist to localStorage — call localStorage.setItem separately.
 */
function applyPreference(pref) {
  // 1. Apply to <html>
  if (pref === 'system') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.dataset.theme = pref
  }

  // 2. Sync icons based on effective (rendered) theme
  const effective = effectiveTheme(pref)
  const sunEl  = document.getElementById('icon-sun')
  const moonEl = document.getElementById('icon-moon')
  if (sunEl)  effective === 'light' ? sunEl.removeAttribute('hidden')  : sunEl.setAttribute('hidden', '')
  if (moonEl) effective === 'dark'  ? moonEl.removeAttribute('hidden') : moonEl.setAttribute('hidden', '')

  // 3. aria-label on button
  const btn = document.getElementById('theme-toggle')
  if (btn) btn.setAttribute('aria-label', ARIA_LABEL[pref])
}

/**
 * Initialise theme toggle: apply saved preference, attach click handler,
 * and (when in system mode) listen for OS preference changes in real-time.
 */
export function initTheme() {
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  let systemListener = null

  function activate(pref) {
    if (systemListener) {
      mql.removeEventListener('change', systemListener)
      systemListener = null
    }

    localStorage.setItem(STORAGE_KEY, pref)
    applyPreference(pref)

    if (pref === 'system') {
      systemListener = () => applyPreference('system')
      mql.addEventListener('change', systemListener)
    }
  }

  // Boot with saved preference (defaults to 'system' on first visit)
  activate(getSaved())

  // Cycle on click: light ↔ dark
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    activate(NEXT[getSaved()])
  })
}
