import { parseGithubUrl } from '../shared/parse-url'
import { findAnchor } from './anchor'
import { mountButton } from './button'
import type { ButtonState } from './button'
import { getSelectedItems, cleanupCheckboxes } from './checkboxes'

const MOUNT_ID = 'gitfold-root'

let selectionChangedHandler: (() => void) | null = null
/** URL that was active when the button was last mounted */
let mountedForUrl = ''

/**
 * Attempt to inject the GitFold button into the current page.
 *
 * Safe to call multiple times (idempotent):
 *  - Not a supported GitHub page → clean up any existing button and exit
 *  - Button already mounted → skip (no-op)
 *  - Anchor not found → skip (no crash — GitHub may still be rendering)
 *  - Otherwise → create host element + Shadow DOM + inject button
 */
export function tryMount(): void {
  const info = parseGithubUrl(window.location.href)

  // Not a repo or folder page (e.g. blob, issues, pull requests)
  if (!info) {
    cleanup()
    return
  }

  // If URL changed since last mount, tear down and re-mount fresh.
  // This clears stale error/success states from the previous directory.
  const currentUrl = window.location.href
  if (document.getElementById(MOUNT_ID)) {
    if (currentUrl === mountedForUrl) return  // same page, truly idempotent
    cleanup()  // different page → reset
  }

  // Find stable anchor in GitHub's toolbar
  const anchorResult = findAnchor()
  if (!anchorResult) return  // graceful degradation — will retry on next trigger
  const { element: anchor, position: insertPosition } = anchorResult

  const label = info.type === 'folder' ? 'Download Folder' : 'Download Repository'

  // Create the Shadow DOM host
  const host = document.createElement('div')
  host.id = MOUNT_ID
  const shadow = host.attachShadow({ mode: 'open' })

  let setState: (s: ButtonState) => void

  const callbacks = {
    onDownload: async () => {
      setState({ status: 'loading' })
      try {
        const selectedItems = getSelectedItems()
        const response: { ok: boolean; code?: string; hasToken?: boolean } =
          await chrome.runtime.sendMessage({
            action: 'download',
            url: window.location.href,
            info,
            selectedItems: selectedItems.length > 0 ? selectedItems : undefined,
          })

        // response can be undefined if the service worker was inactive
        if (!response) {
          setState({ status: 'error', code: 'network', hasToken: false })
        } else if (response.ok) {
          setState({ status: 'success' })
          setTimeout(() => setState({ status: 'idle' }), 2000)
        } else {
          setState({
            status: 'error',
            code: (response.code as any) ?? 'unknown',
            hasToken: response.hasToken ?? false,
          })
        }
      } catch {
        setState({ status: 'error', code: 'network', hasToken: false })
      }
    },

    onAddToken: () => {
      // Open the extension popup so the user can enter a token
      chrome.runtime.sendMessage({ action: 'openPopup' })
    },

    onRetry: () => {
      setState({ status: 'idle' })
    },
  }

  setState = mountButton(shadow, label, callbacks)

  // Register selection-changed listener (replacing any previous one via cleanup())
  selectionChangedHandler = () => {
    const items = getSelectedItems()
    setState({
      status: 'idle',
      label: items.length > 0 ? `Download ${items.length} selected` : undefined,
    })
  }
  document.addEventListener('gitfold:selection-changed', selectionChangedHandler)

  // Initialize with file count hint if available
  const fileCount = getVisibleFileCount()
  if (fileCount !== null) {
    setState({ status: 'idle', fileCount })
  }

  // Insert the host element relative to the anchor
  if (insertPosition === 'after') {
    anchor.parentElement?.insertBefore(host, anchor.nextSibling)
  } else {
    anchor.parentElement?.insertBefore(host, anchor)
  }

  mountedForUrl = currentUrl
}

/** Remove the GitFold button from the DOM (called when navigating away from supported pages). */
export function cleanup(): void {
  document.getElementById(MOUNT_ID)?.remove()
  if (selectionChangedHandler) {
    document.removeEventListener('gitfold:selection-changed', selectionChangedHandler)
    selectionChangedHandler = null
  }
  cleanupCheckboxes()
}

/**
 * Read the file count GitHub renders in its own UI.
 * Returns null if the count isn't visible (GitHub may not show it on all pages).
 *
 * GitHub renders something like: "123 files" in an aria-label or text node
 * near the file list header. This is best-effort — failure is silent.
 */
function getVisibleFileCount(): number | null {
  // GitHub renders file count in the directory listing header
  // Selector targets the commit count area which includes file count
  const countEl = document.querySelector('[data-testid="files-count"]') ??
                  document.querySelector('[aria-label*="files"]')
  if (!countEl) return null

  const match = countEl.textContent?.match(/(\d+)\s+files?/)
  return match ? parseInt(match[1], 10) : null
}
