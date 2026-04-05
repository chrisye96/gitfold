import { handleDownload } from './download'
import { saveToken, clearToken, validateToken } from './token'

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
    return true
  }

  if (msg.action === 'saveToken') {
    validateToken(msg.token)
      .then(async (result) => {
        if (result.valid) await saveToken(msg.token)
        sendResponse(result)
      })
      .catch(() => sendResponse({ valid: false, reason: 'network' }))
    return true
  }

  if (msg.action === 'clearToken') {
    clearToken().then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }))
    return true
  }

  if (msg.action === 'openPopup') {
    chrome.action.openPopup?.()
    return false
  }

  return false
})
