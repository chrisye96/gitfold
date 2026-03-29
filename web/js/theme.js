/**
 * GitSnip — Theme toggle (shared across all pages)
 *
 * Expects the following elements in the DOM (injected by layout.js):
 *   #theme-toggle  — the toggle button
 *   #icon-moon     — moon SVG (shown in light mode)
 *   #icon-sun      — sun SVG (shown in dark mode)
 *
 * The anti-FOUC inline script in <head> sets data-theme before first paint;
 * this module syncs the icon visibility with that initial state.
 *
 * @module theme
 */

const STORAGE_KEY = 'gitsnip-theme'

/** @returns {'dark'|'light'} */
function getEffectiveTheme() {
  const { theme } = document.documentElement.dataset
  if (theme === 'dark' || theme === 'light') return theme
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Apply theme to <html> and sync icon visibility + aria-label. */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme

  const iconSun  = document.getElementById('icon-sun')
  const iconMoon = document.getElementById('icon-moon')
  const btn      = document.getElementById('theme-toggle')

  // Use setAttribute/removeAttribute because SVG elements don't map .hidden to the HTML attribute
  if (iconSun)  theme !== 'dark' ? iconSun.setAttribute('hidden', '')  : iconSun.removeAttribute('hidden')
  if (iconMoon) theme === 'dark' ? iconMoon.setAttribute('hidden', '') : iconMoon.removeAttribute('hidden')
  if (btn) btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')
}

/**
 * Initialise theme toggle: sync icons with current theme and bind click handler.
 * Safe to call before or after the toggle button exists in the DOM.
 */
export function initTheme() {
  applyTheme(getEffectiveTheme())

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const next = getEffectiveTheme() === 'dark' ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
  })
}
