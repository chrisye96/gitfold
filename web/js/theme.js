/**
 * GitFold — Theme toggle (shared across all pages)
 *
 * Three preference states, cycled on each click:
 *   light → dark → system → light → …
 *
 * Preferences:
 *   'light'  — force light (data-theme="light")
 *   'dark'   — force dark  (data-theme="dark")
 *   'system' — remove data-theme; CSS @media + real-time matchMedia listener
 *
 * Icons (Ionicons 5, injected by layout.js):
 *   #icon-sun      shown when preference = light
 *   #icon-moon     shown when preference = dark
 *   #icon-monitor  shown when preference = system
 *
 * The anti-FOUC inline script in <head> handles the initial paint:
 *   light/dark → sets data-theme; system/unset → no data-theme, CSS takes over.
 *
 * @module theme
 */

const STORAGE_KEY = 'gitfold-theme'

/** Cycle order */
const NEXT = { light: 'dark', dark: 'system', system: 'light' }

/** aria-label describes the *next* action on click */
const ARIA_LABEL = {
  light:  'Switch to dark mode',
  dark:   'Switch to system theme',
  system: 'Switch to light mode',
}

/** @returns {'light'|'dark'|'system'} */
function getSaved() {
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
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

  // 2. Sync icons — exactly one visible at a time
  const ids = { light: 'icon-sun', dark: 'icon-moon', system: 'icon-monitor' }
  for (const [p, id] of Object.entries(ids)) {
    const el = document.getElementById(id)
    if (!el) continue
    if (p === pref) el.removeAttribute('hidden')
    else            el.setAttribute('hidden', '')
  }

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
    // Remove previous system listener when leaving system mode
    if (systemListener) {
      mql.removeEventListener('change', systemListener)
      systemListener = null
    }

    localStorage.setItem(STORAGE_KEY, pref)
    applyPreference(pref)

    // In system mode, re-apply on every OS preference change so icons stay in sync
    if (pref === 'system') {
      systemListener = () => applyPreference('system')
      mql.addEventListener('change', systemListener)
    }
  }

  // Boot with saved preference
  activate(getSaved())

  // Cycle on click
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    activate(NEXT[getSaved()])
  })
}
