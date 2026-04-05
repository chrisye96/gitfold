import buttonCSS from './button.css'

// Octicons-inspired download arrow
const ICON_DOWNLOAD = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
  <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z"/>
  <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.97a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.779a.749.749 0 1 1 1.06-1.06l1.97 1.97Z"/>
</svg>`

export type ErrorCode =
  | 'rate_limited'
  | 'not_found'
  | 'forbidden'
  | 'network'
  | 'too_many_files'
  | 'unknown'

export type ButtonState =
  | { status: 'idle'; label?: string; fileCount?: number }
  | { status: 'loading' }
  | { status: 'success' }
  | { status: 'error'; code: ErrorCode; hasToken: boolean }

export interface ButtonCallbacks {
  onDownload(): void
  onAddToken(): void
  onRetry(): void
}

const ERROR_MESSAGES: Record<ErrorCode, (hasToken: boolean) => string> = {
  rate_limited:    (hasToken) => hasToken ? 'Rate limit reached — try later' : 'Rate limit — add a token',
  not_found:       ()         => 'Folder not found',
  forbidden:       ()         => 'Private repo — add a token',
  network:         ()         => 'Network error',
  too_many_files:  ()         => 'Too many files',
  unknown:         ()         => 'Something went wrong',
}

/**
 * Mount the button into a Shadow DOM and return a setState function.
 * The returned setState function can be called any number of times to
 * transition between button states (idle → loading → success/error).
 */
export function mountButton(
  shadow: ShadowRoot,
  label: string,
  callbacks: ButtonCallbacks,
): (state: ButtonState) => void {
  // Inject self-contained styles
  const style = document.createElement('style')
  style.textContent = buttonCSS
  shadow.appendChild(style)

  // Container for the button (replaced on each setState call)
  const container = document.createElement('div')
  container.style.cssText = 'display:inline-flex;align-items:center;'
  shadow.appendChild(container)

  function setState(state: ButtonState): void {
    container.innerHTML = ''

    if (state.status === 'idle') {
      const btn = document.createElement('button')
      btn.className = 'gf-btn'
      // state.label overrides the default label (used for "Download N selected" in Phase 4)
      const displayLabel = state.label ?? label
      if (state.fileCount !== undefined) btn.title = `${state.fileCount} files`
      const iconSpan = document.createElement('span')
      iconSpan.innerHTML = ICON_DOWNLOAD  // ICON_DOWNLOAD is a static string literal, safe
      const labelText = document.createTextNode(` ${displayLabel}`)
      btn.appendChild(iconSpan)
      btn.appendChild(labelText)
      btn.addEventListener('click', callbacks.onDownload)
      container.appendChild(btn)

    } else if (state.status === 'loading') {
      const btn = document.createElement('button')
      btn.className = 'gf-btn'
      btn.disabled = true
      btn.innerHTML = `<span class="gf-spinner" aria-hidden="true"></span> <span>Downloading…</span>`
      container.appendChild(btn)

    } else if (state.status === 'success') {
      const btn = document.createElement('button')
      btn.className = 'gf-btn gf-btn--success'
      btn.textContent = '✓ Downloaded'
      btn.disabled = true
      container.appendChild(btn)

    } else {
      // error state
      const { code, hasToken } = state
      const msg = ERROR_MESSAGES[code](hasToken)

      const span = document.createElement('span')
      span.className = 'gf-error-msg'
      span.textContent = `✕ ${msg}`
      container.appendChild(span)

      // Secondary action buttons for actionable errors
      const needsToken = code === 'rate_limited' && !hasToken || code === 'forbidden'
      const needsRetry = code === 'network' || code === 'unknown'

      if (needsToken) {
        const btn = document.createElement('button')
        btn.className = 'gf-action-btn'
        btn.textContent = 'Add Token'
        btn.addEventListener('click', callbacks.onAddToken)
        container.appendChild(btn)
      } else if (needsRetry) {
        const btn = document.createElement('button')
        btn.className = 'gf-action-btn'
        btn.textContent = 'Retry'
        btn.addEventListener('click', callbacks.onRetry)
        container.appendChild(btn)
      }
    }
  }

  // Initialize to idle
  setState({ status: 'idle' })
  return setState
}
