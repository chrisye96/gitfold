import { tryMount } from './mount'
import { injectCheckboxes, cleanupCheckboxes } from './checkboxes'

// ── Layer 1: URL polling (500ms interval) ────────────────────────────────
// Catches all navigation types including hash changes and any edge cases.
let lastHref = ''
function checkNavigation(): void {
  if (location.href !== lastHref) {
    lastHref = location.href
    mountAndInject()
  }
}
setInterval(checkNavigation, 500)

// ── Layer 2: History API hook ────────────────────────────────────────────
// GitHub uses history.pushState for in-app navigation. Override it so we
// respond immediately (no 500ms delay) when the user clicks a link.
const origPushState = history.pushState.bind(history)
history.pushState = (...args: Parameters<typeof history.pushState>) => {
  origPushState(...args)
  mountAndInject()
}
window.addEventListener('popstate', mountAndInject)

// ── Layer 3: MutationObserver on document.body (debounced 300ms) ─────────
// Catches cases where GitHub rebuilds the toolbar DOM asynchronously after
// the URL has already changed (e.g. lazy-loaded page sections).
let debounceTimer = 0
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(mountAndInject, 300)
})
observer.observe(document.body, { childList: true, subtree: false })

// ── Initial mount on page load ───────────────────────────────────────────
mountAndInject()

// ── Combined mount + checkbox injection ─────────────────────────────────
function mountAndInject(): void {
  tryMount()
  // Small delay to let GitHub's file list render
  setTimeout(injectCheckboxes, 500)
}
