import { handleDownload } from './download'

/**
 * Background service worker — message router.
 *
 * All API calls happen here (not in the content script) because
 * GitHub's Content-Security-Policy blocks cross-origin fetches from page context.
 * The background service worker has its own origin and is CSP-exempt.
 *
 * IMPORTANT: return `true` from the listener when the response is async
 * (i.e. when calling sendResponse after a Promise resolves). Without `return true`,
 * Chrome closes the message channel before the async response arrives.
 */
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'download') {
    handleDownload(msg.url, msg.info)
      .then(sendResponse)
      .catch(() => sendResponse({ ok: false, code: 'network', hasToken: false }))
    return true  // Keep message channel open for async response
  }

  if (msg.action === 'openPopup') {
    // chrome.action.openPopup() requires the extension to be "active" in the
    // toolbar. Available since Chrome 127; gracefully ignored on older versions.
    chrome.action.openPopup?.()
    return false
  }

  return false
})
