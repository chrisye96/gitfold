import { parseGithubUrl } from '../shared/parse-url'
import { findAnchor } from './anchor'
import { mountButton } from './button'
import type { ButtonState } from './button'

const MOUNT_ID = 'gitfold-root'

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

  // Already mounted — idempotency check
  if (document.getElementById(MOUNT_ID)) return

  // Find stable anchor in GitHub's toolbar
  const anchor = findAnchor()
  if (!anchor) return  // graceful degradation — will retry on next trigger

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
        const response: { ok: boolean; code?: string; hasToken?: boolean } =
          await chrome.runtime.sendMessage({ action: 'download', url: window.location.href, info })

        if (response.ok) {
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

  // Insert the host element before the anchor in GitHub's toolbar
  anchor.parentElement?.insertBefore(host, anchor)
}

/** Remove the GitFold button from the DOM (called when navigating away from supported pages). */
export function cleanup(): void {
  document.getElementById(MOUNT_ID)?.remove()
}
