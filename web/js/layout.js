/**
 * GitSnip — Shared layout components (header + footer)
 *
 * Renders the site header and footer into placeholder elements so every page
 * shares a single source of truth for navigation, logo, and theme toggle.
 *
 * Usage (in each page's entry module):
 *   import { renderLayout } from './layout.js'
 *   renderLayout()            // auto-detects current page
 *
 * @module layout
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Detect which page we're on based on pathname. */
function currentPage() {
  const p = window.location.pathname
  if (p === '/docs' || p === '/docs.html' || p.startsWith('/docs#')) return 'docs'
  if (p === '/pricing' || p === '/pricing.html') return 'pricing'
  if (p === '/team' || p === '/team.html') return 'team'
  return 'home'
}

// ─── Header ───────────────────────────────────────────────────────────────────

function headerHTML(page) {
  const ariaCurrent = (target) => page === target ? ' aria-current="page"' : ''

  return `
  <a href="/" class="site-logo" aria-label="GitSnip home">
    <img class="logo-icon" src="/img/gitsnip.svg" width="24" height="24" alt="" aria-hidden="true" />
    <span>GitSnip</span>
  </a>
  <nav class="site-nav" aria-label="Main navigation">
    <a href="/docs"${ariaCurrent('docs')} data-i18n="nav.docs">Docs</a>
    <a href="/pricing"${ariaCurrent('pricing')}>Pricing</a>
    <a href="https://github.com/chrisye96/gitsnip"
       target="_blank" rel="noopener noreferrer"
       data-i18n="nav.github"
       aria-label="GitSnip on GitHub (opens in new tab)">GitHub</a>
    <span id="user-menu" class="user-menu" hidden></span>
    <button id="theme-toggle" class="btn-theme-toggle" type="button" aria-label="Switch to light mode">
      <!-- IoSunnyOutline — shown when preference = light -->
      <svg id="icon-sun" viewBox="0 0 512 512" width="18" height="18" fill="none" stroke="currentColor" stroke-width="32" stroke-linecap="round" stroke-miterlimit="10" aria-hidden="true" hidden>
        <line x1="256" y1="48" x2="256" y2="96"/>
        <line x1="256" y1="416" x2="256" y2="464"/>
        <line x1="403.08" y1="108.92" x2="369.14" y2="142.86"/>
        <line x1="142.86" y1="369.14" x2="108.92" y2="403.08"/>
        <line x1="464" y1="256" x2="416" y2="256"/>
        <line x1="96" y1="256" x2="48" y2="256"/>
        <line x1="403.08" y1="403.08" x2="369.14" y2="369.14"/>
        <line x1="142.86" y1="142.86" x2="108.92" y2="108.92"/>
        <circle cx="256" cy="256" r="80" stroke-miterlimit="10"/>
      </svg>
      <!-- IoMoonOutline — shown when preference = dark -->
      <svg id="icon-moon" viewBox="0 0 512 512" width="18" height="18" fill="none" stroke="currentColor" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" hidden>
        <path d="M160,136c0-30.62,4.51-61.61,16-88C99.57,81.27,48,159.32,48,248c0,119.29,96.71,216,216,216,88.68,0,166.73-51.57,200-128-26.39,11.49-57.38,16-88,16C256.71,352,160,255.29,160,136Z"/>
      </svg>
      <!-- Lucide Monitor — shown when preference = system -->
      <svg id="icon-monitor" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" hidden>
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    </button>
  </nav>`
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function footerHTML(page) {
  return `
  <p class="footer-tagline">Built for developers who hate git clone.</p>
  <nav class="footer-links" aria-label="Footer navigation">
    ${page !== 'home' ? '<a href="/">Home</a>' : ''}
    ${page !== 'docs' ? '<a href="/docs">Docs</a>' : ''}
    <a href="/pricing">Pricing</a>
    <a href="/team">Team</a>
    <a href="https://github.com/chrisye96/gitsnip" target="_blank" rel="noopener noreferrer">GitHub</a>
  </nav>
  <p>If this tool saved you time, consider <a href="https://github.com/sponsors/chrisye96"
     target="_blank" rel="noopener noreferrer"
     class="footer-sponsor">supporting it ☕</a></p>`
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Render shared header and footer into the page.
 *
 * Looks for:
 *   <header class="site-header">  — injects header content
 *   <footer class="site-footer">  — injects footer content
 */
export function renderLayout() {
  const page = currentPage()

  const header = document.querySelector('header.site-header')
  if (header) header.innerHTML = headerHTML(page)

  const footer = document.querySelector('footer.site-footer')
  if (footer) footer.innerHTML = footerHTML(page)
}
